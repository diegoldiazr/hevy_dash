const axios = require('axios');
const db = require('../db');

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
    try {
        const response = await axios.get(`${HEVY_API_BASE}/workouts`, {
            headers: { 'api-key': apiKey },
            params: { page, page_size: pageSize }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch workouts: ${error.message}`);
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

        // Calculate volume if not provided directly (simplified)
        // Hevy returns exercises -> sets -> weight_kg * reps
        let volume = 0;
        if (workout.exercises) {
            workout.exercises.forEach(ex => {
                ex.sets.forEach(set => {
                    if (set.weight_kg && set.reps) {
                        volume += set.weight_kg * set.reps;
                    }
                });
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

const syncWorkouts = async () => {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('Hevy API Key not found');

    let page = 1;
    let syncedCount = 0;
    let hasMore = true;

    // Safety limit to avoid infinite loops during dev
    const MAX_PAGES = 5;

    console.log("Starting sync...");

    try {
        while (hasMore && page <= MAX_PAGES) {
            const data = await fetchWorkoutsFromApi(apiKey, page, 20); // Sync 20 at a time
            const workouts = data.workouts;

            if (!workouts || workouts.length === 0) {
                hasMore = false;
                break;
            }

            for (const workout of workouts) {
                await saveWorkout(workout);
                syncedCount++;
            }

            // Hevy pagination info might need checking custom logic, 
            // usually check if returned count < requested page_size
            if (workouts.length < 20) {
                hasMore = false;
            } else {
                page++;
            }
        }
    } catch (e) {
        console.error("Sync error:", e);
        throw e;
    }

    return { status: 'success', synced: syncedCount };
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

    // For MVP, just fetch and return, or save if we had a table. 
    // The DB init created 'routines' table, so let's save.
    const data = await fetchRoutinesFromApi(apiKey);
    const routines = data.routines;

    if (!routines) return { status: 'no_data' };

    for (const routine of routines) {
        // Simplified upsert
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
    fetchRoutines: fetchRoutinesFromApi, // export direct fetch if needed
    syncRoutines
};
