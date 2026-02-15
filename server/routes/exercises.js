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

    // First fetch routines to map routine_id to title
    db.all('SELECT id, title FROM routines', [], (err, routineRows) => {
        if (err) return res.status(500).json({ error: err.message });

        const routineMap = {};
        routineRows.forEach(r => routineMap[r.id] = r.title);

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

                            exercise.sets.forEach(set => {
                                if (set.weight_kg) {
                                    if (set.weight_kg > maxWeight) maxWeight = set.weight_kg;
                                    volume += set.weight_kg * (set.reps || 0);

                                    if (set.reps > 0) {
                                        const e1rm = set.weight_kg * (1 + (set.reps / 30));
                                        if (e1rm > bestE1RM) bestE1RM = e1rm;
                                    }
                                }
                            });

                            history.push({
                                date: row.start_time,
                                workoutTitle: data.title,
                                routineTitle: routineMap[data.routine_id] || 'Sin rutina',
                                sets: exercise.sets,
                                maxWeight,
                                volume,
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

module.exports = router;
