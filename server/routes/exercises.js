const express = require('express');
const router = express.Router();
const db = require('../db');

// Get list of all exercises found in workouts
router.get('/', (req, res) => {
    const sql = `SELECT raw_data FROM workouts`;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const exercises = new Set();
        rows.forEach(row => {
            try {
                const data = JSON.parse(row.raw_data);
                if (data.exercises) {
                    data.exercises.forEach(ex => exercises.add(ex.title));
                }
            } catch (e) {
                // ignore parsing errors
            }
        });

        res.json(Array.from(exercises).sort());
    });
});

// Get history for a specific exercise
router.get('/:name/history', (req, res) => {
    const exerciseName = req.params.name;

    // Fetch routines and folders to map routine_id -> folder_title
    db.all('SELECT id, folder_id FROM routines', [], (err, routineRows) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT id, title FROM routine_folders', [], (err, folderRows) => {
            if (err) return res.status(500).json({ error: err.message });

            const folderMap = {};
            folderRows.forEach(f => folderMap[f.id] = f.title);

            const routineToFolderMap = {};
            routineRows.forEach(r => {
                routineToFolderMap[r.id] = folderMap[r.folder_id] || 'Sin carpeta';
            });

            const sql = `SELECT start_time, raw_data FROM workouts ORDER BY start_time ASC`;
            db.all(sql, [], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });

                const history = [];

                rows.forEach(row => {
                    try {
                        const data = JSON.parse(row.raw_data);
                        if (data.exercises) {
                            const exercise = data.exercises.find(ex => ex.title === exerciseName);
                            if (exercise) {
                                let maxWeight = 0;
                                let volume = 0;
                                let bestE1RM = 0;
                                let totalReps = 0;
                                let maxReps = 0;

                                exercise.sets.forEach(set => {
                                    const w = set.weight_kg || 0;
                                    const r = set.reps || 0;

                                    totalReps += r;
                                    if (r > maxReps) maxReps = r;
                                    if (w > maxWeight) maxWeight = w;

                                    volume += w * r;

                                    if (r > 0) {
                                        // Epley Formula for 1RM: weight * (1 + reps/30)
                                        // If weight is 0, we treat it as 0
                                        const e1rm = w * (1 + (r / 30));
                                        if (e1rm > bestE1RM) bestE1RM = e1rm;
                                    }
                                });

                                history.push({
                                    date: row.start_time,
                                    workoutTitle: data.title,
                                    routineTitle: routineToFolderMap[data.routine_id] || 'Sin carpeta',
                                    sets: exercise.sets,
                                    maxWeight,
                                    volume,
                                    totalReps,
                                    maxReps,
                                    e1rm: Math.round(bestE1RM * 10) / 10
                                });
                            }
                        }
                    } catch (e) { }
                });

                res.json(history);
            });
        });
    });
});

module.exports = router;
