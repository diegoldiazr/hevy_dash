const axios = require('axios');
const db = require('../db');
const fs = require('fs');
const path = require('path');

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

    const logPath = path.join(__dirname, '../sync.log');
    fs.appendFileSync(logPath, `\n--- Sync started (${fullSync ? 'FULL' : 'INCREMENTAL'}) at ${new Date().toISOString()} ---\n`);

    try {
        // 1. Fetch muscle mapping from exercise templates
        const templates = await fetchExerciseTemplates(apiKey);
        const muscleMap = {};
        templates.forEach(t => {
            muscleMap[t.id] = {
                primary: t.primary_muscle_group,
                secondary: t.secondary_muscle_groups || []
            };
        });
        fs.appendFileSync(logPath, `Fetched ${templates.length} exercise templates for muscle mapping.\n`);

        const enrichWorkout = (workout) => {
            if (workout.exercises) {
                workout.exercises = workout.exercises.map(ex => {
                    const mapping = muscleMap[ex.exercise_template_id] || { primary: 'Other', secondary: [] };
                    return {
                        ...ex,
                        primary_muscle_group: mapping.primary,
                        secondary_muscle_groups: mapping.secondary
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
    try {
        const response = await axios.get(`${HEVY_API_BASE}/routines`, {
            headers: { 'api-key': apiKey }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch routines: ${error.message}`);
    }
};

const syncRoutines = async () => {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('Hevy API Key not found');

    const data = await fetchRoutinesFromApi(apiKey);
    const routines = data.routines;

    if (!routines) return { status: 'no_data' };

    for (const routine of routines) {
        await new Promise((resolve, reject) => {
            db.run(`INSERT OR REPLACE INTO routines (id, title, raw_data) VALUES (?, ?, ?)`,
                [routine.id, routine.title, JSON.stringify(routine)],
                (err) => err ? reject(err) : resolve()
            );
        });
    }
    return { status: 'success', count: routines.length };
};

module.exports = {
    validateApiKey,
    fetchWorkouts: fetchWorkoutsFromApi,
    syncWorkouts,
    fetchRoutines: fetchRoutinesFromApi,
    syncRoutines,
    fetchExerciseTemplates
};
