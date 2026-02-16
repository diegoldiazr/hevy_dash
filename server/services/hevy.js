const axios = require('axios');
const db = require('../db');
const fs = require('fs');
const path = require('path');
const ai = require('./ai');

const HEVY_API_BASE = 'https://api.hevyapp.com/v1';

const getApiKey = () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT hevy_api_key FROM user_settings WHERE id = 1', (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.hevy_api_key : null);
        });
    });
};

const validateApiKey = async (apiKey) => {
    try {
        await axios.get(`${HEVY_API_BASE}/workouts_count`, {
            headers: { 'api-key': apiKey }
        });
        return true;
    } catch (error) {
        console.error('Hevy API Validation Error:', error.response ? error.response.status : error.message);
        return false;
    }
};

const fetchWorkoutsFromApi = async (apiKey, page = 1, pageSize = 10) => {
    // Official API docs: page size for workouts is max 10
    const effectivePageSize = Math.min(pageSize, 10);
    try {
        const response = await axios.get(`${HEVY_API_BASE}/workouts`, {
            headers: { 'api-key': apiKey },
            params: { page, page_size: effectivePageSize }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch workouts: ${error.message}`);
    }
};

const getExerciseTranslation = (titleEn) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT title_es FROM exercise_translations WHERE title_en = ?', [titleEn], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.title_es : null);
        });
    });
};

const saveExerciseTranslation = (titleEn, titleEs) => {
    return new Promise((resolve, reject) => {
        const sql = `INSERT OR REPLACE INTO exercise_translations (title_en, title_es) VALUES (?, ?)`;
        db.run(sql, [titleEn, titleEs], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const translateExerciseTitle = async (titleEn) => {
    const cached = await getExerciseTranslation(titleEn);
    if (cached) return cached;

    // To prevent spamming AI if quota is hit during a large sync
    if (global.translationQuotaExceeded) {
        return titleEn;
    }

    try {
        console.log(`[AI] Translating exercise: ${titleEn}`);
        const response = await ai.chat(`Return ONLY the natural Spanish name for the fitness exercise "${titleEn}". No extra words, no punctuation.`);
        const titleEs = response.content.trim().replace(/[".]/g, '');
        await saveExerciseTranslation(titleEn, titleEs);
        return titleEs;
    } catch (err) {
        if (err.message.includes('429') || err.message.includes('quota')) {
            console.warn(`[AI] Quota exceeded. Using English names for the remaining exercises.`);
            global.translationQuotaExceeded = true;
        } else {
            console.error(`[AI] Translation failed for ${titleEn}:`, err.message);
        }
        return titleEn; // Fallback to English
    }
};

const fetchWorkoutEvents = async (apiKey, since) => {
    try {
        const response = await axios.get(`${HEVY_API_BASE}/workouts/events`, {
            headers: { 'api-key': apiKey },
            params: { since }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch workout events: ${error.message}`);
    }
};

const saveWorkout = (workout) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO workouts (id, title, start_time, end_time, volume_kg, raw_data)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                start_time = excluded.start_time,
                end_time = excluded.end_time,
                volume_kg = excluded.volume_kg,
                raw_data = excluded.raw_data
        `;

        // Calculate volume if not provided directly
        let volume = 0;
        if (workout.exercises) {
            workout.exercises.forEach(ex => {
                if (ex.sets) {
                    ex.sets.forEach(set => {
                        if (set.weight_kg && set.reps) {
                            volume += (set.weight_kg * set.reps);
                        }
                    });
                }
            });
        }

        const params = [
            workout.id,
            workout.title,
            workout.start_time,
            workout.end_time,
            volume,
            JSON.stringify(workout)
        ];

        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
};

const fetchExerciseTemplates = async (apiKey) => {
    let allTemplates = [];
    let page = 1;
    let hasMore = true;

    try {
        while (hasMore && page <= 10) { // Safety limit of 10 pages for templates
            const response = await axios.get(`${HEVY_API_BASE}/exercise_templates`, {
                headers: { 'api-key': apiKey },
                params: { page, page_size: 100 }
            });
            const templates = response.data.exercise_templates || [];
            allTemplates = allTemplates.concat(templates);

            if (templates.length < 100) {
                hasMore = false;
            } else {
                page++;
            }
        }
        return allTemplates;
    } catch (error) {
        throw new Error(`Failed to fetch exercise templates: ${error.message}`);
    }
};

const syncWorkouts = async (fullSync = false) => {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('Hevy API Key not found');

    const logPath = path.join(db.dataDir, 'sync.log');
    fs.appendFileSync(logPath, `\n--- Sync started (${fullSync ? 'FULL' : 'INCREMENTAL'}) at ${new Date().toISOString()} ---\n`);
    global.translationQuotaExceeded = false;

    try {
        // 1. Fetch muscle mapping from exercise templates
        const templates = await fetchExerciseTemplates(apiKey);
        const exerciseTemplateMap = {};
        if (templates.length > 0) {
            fs.appendFileSync(logPath, `DEBUG: Template keys: ${Object.keys(templates[0]).join(', ')}\n`);
        }
        for (const t of templates) {
            const titleEs = await translateExerciseTitle(t.title);
            exerciseTemplateMap[t.id] = {
                title_en: t.title,
                title_es: titleEs,
                primary: t.primary_muscle_group,
                secondary: t.secondary_muscle_groups || [],
                thumbnail: t.thumbnail_url || t.image_thumbnail_url || null,
                image: t.image_url || null
            };
        }
        fs.appendFileSync(logPath, `Fetched and translated ${templates.length} exercise templates.\n`);

        const enrichWorkout = (workout) => {
            if (workout.exercises) {
                workout.exercises = workout.exercises.map(ex => {
                    const mapping = exerciseTemplateMap[ex.exercise_template_id] || {
                        title_en: ex.title,
                        title_es: ex.title,
                        primary: 'Other',
                        secondary: [],
                        thumbnail: null,
                        image: null
                    };
                    return {
                        ...ex,
                        title_en: mapping.title_en,
                        title_es: mapping.title_es,
                        primary_muscle_group: mapping.primary,
                        secondary_muscle_groups: mapping.secondary,
                        thumbnail_url: mapping.thumbnail,
                        image_url: mapping.image
                    };
                });
            }
            return workout;
        };

        let syncedCount = 0;

        if (!fullSync) {
            // Incremental sync using events (since last workout or last 7 days as buffer)
            const lastWorkout = await new Promise(resolve => {
                db.get('SELECT start_time FROM workouts ORDER BY start_time DESC LIMIT 1', (err, row) => {
                    resolve(row ? row.start_time : null);
                });
            });

            // Use last workout date minus 1 day buffer, or default to 30 days ago if none
            const sinceDate = lastWorkout
                ? new Date(new Date(lastWorkout).getTime() - 24 * 60 * 60 * 1000).toISOString()
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            fs.appendFileSync(logPath, `Fetching events since ${sinceDate}...\n`);
            const eventsData = await fetchWorkoutEvents(apiKey, sinceDate);
            const events = eventsData.events || [];

            for (const event of events) {
                if (event.type === 'updated' && event.workout) {
                    await saveWorkout(enrichWorkout(event.workout));
                    syncedCount++;
                } else if (event.type === 'deleted') {
                    await new Promise(resolve => {
                        db.run('DELETE FROM workouts WHERE id = ?', [event.workout_id], resolve);
                    });
                }
            }
            fs.appendFileSync(logPath, `Incremental sync finished. Synced ${syncedCount} workouts.\n`);
        } else {
            // Full historical sync
            let page = 1;
            let hasMore = true;
            const MAX_PAGES = 500; // Increased because page size is small (10)

            while (hasMore && page <= MAX_PAGES) {
                fs.appendFileSync(logPath, `Fetching page ${page}...\n`);
                let data;
                try {
                    data = await fetchWorkoutsFromApi(apiKey, page, 10);
                } catch (fetchError) {
                    if (fetchError.message.includes('404')) {
                        fs.appendFileSync(logPath, `Reached end of data (404). Stopping.\n`);
                        hasMore = false;
                        break;
                    }
                    throw fetchError;
                }

                const workouts = Array.isArray(data) ? data : (data.workouts || []);
                fs.appendFileSync(logPath, `Fetched ${workouts.length} workouts from page ${page}.\n`);

                if (!workouts || workouts.length === 0) {
                    fs.appendFileSync(logPath, `No more workouts found. Stopping.\n`);
                    hasMore = false;
                    break;
                }

                for (const workout of workouts) {
                    await saveWorkout(enrichWorkout(workout));
                    syncedCount++;
                }

                page++;
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            fs.appendFileSync(logPath, `Full sync finished. Total synced: ${syncedCount}\n`);
        }

        return { status: 'success', synced: syncedCount };
    } catch (e) {
        fs.appendFileSync(logPath, `CRITICAL SYNC ERROR: ${e.message}\n`);
        throw e;
    }
};

const fetchRoutinesFromApi = async (apiKey) => {
    let allRoutines = [];
    let page = 1;
    let hasMore = true;
    try {
        while (hasMore && page <= 50) {
            try {
                const response = await axios.get(`${HEVY_API_BASE}/routines`, {
                    headers: { 'api-key': apiKey },
                    params: { page, page_size: 10 }
                });
                const routines = response.data.routines || [];
                if (routines.length === 0) {
                    hasMore = false;
                } else {
                    allRoutines = allRoutines.concat(routines);
                    page++;
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    hasMore = false;
                    break;
                }
                throw error;
            }
        }
        return { routines: allRoutines };
    } catch (error) {
        throw new Error(`Failed to fetch routines: ${error.message}`);
    }
};

const fetchRoutineFoldersFromApi = async (apiKey) => {
    let allFolders = [];
    let page = 1;
    let hasMore = true;
    try {
        while (hasMore && page <= 20) {
            try {
                const response = await axios.get(`${HEVY_API_BASE}/routine_folders`, {
                    headers: { 'api-key': apiKey },
                    params: { page, page_size: 10 }
                });
                const folders = response.data.routine_folders || [];
                if (folders.length === 0) {
                    hasMore = false;
                } else {
                    allFolders = allFolders.concat(folders);
                    page++;
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    hasMore = false;
                    break;
                }
                throw error;
            }
        }
        return { routine_folders: allFolders };
    } catch (error) {
        throw new Error(`Failed to fetch routine folders: ${error.message}`);
    }
};

const syncRoutines = async () => {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('Hevy API Key not found');

    // 1. Sync Folders
    const foldersData = await fetchRoutineFoldersFromApi(apiKey);
    const folders = foldersData.routine_folders || [];

    for (const folder of folders) {
        await new Promise((resolve, reject) => {
            db.run(`INSERT OR REPLACE INTO routine_folders (id, title, folder_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
                [folder.id, folder.title, folder.index, folder.created_at, folder.updated_at],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    // 2. Sync Routines
    const data = await fetchRoutinesFromApi(apiKey);
    const routines = data.routines;

    if (!routines) return { status: 'no_data' };

    for (const routine of routines) {
        await new Promise((resolve, reject) => {
            db.run(`INSERT OR REPLACE INTO routines (id, title, folder_id, updated_at, raw_data) VALUES (?, ?, ?, ?, ?)`,
                [routine.id, routine.title, routine.folder_id, routine.updated_at, JSON.stringify(routine)],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    return { status: 'success', count: routines.length, folders: folders.length };
};

module.exports = {
    validateApiKey,
    fetchWorkouts: fetchWorkoutsFromApi,
    syncWorkouts,
    fetchRoutines: fetchRoutinesFromApi,
    syncRoutines,
    fetchExerciseTemplates
};
