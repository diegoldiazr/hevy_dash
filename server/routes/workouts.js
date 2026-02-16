const express = require('express');
const router = express.Router();
const db = require('../db');

// List Workouts from DB
router.get('/', (req, res) => {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    const sql = `
        SELECT id, title, start_time, end_time, volume_kg, raw_data 
        FROM workouts 
        ORDER BY start_time DESC 
        LIMIT ? OFFSET ?
    `;

    db.all(sql, [pageSize, offset], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        try {
            const workouts = rows.map(row => {
                try {
                    return {
                        ...row,
                        raw_data: JSON.parse(row.raw_data)
                    };
                } catch (e) {
                    console.error(`Error parsing workout ${row.id}:`, e);
                    return { ...row, raw_data: {} };
                }
            });

            // Collect all exercise names to fetch their details
            const exerciseNames = new Set();
            workouts.forEach(w => {
                if (w.raw_data && w.raw_data.exercises) {
                    w.raw_data.exercises.forEach(e => {
                        if (e && e.title) exerciseNames.add(e.title);
                    });
                }
            });

            if (exerciseNames.size === 0) {
                return res.json(workouts);
            }

            const placeholders = Array.from(exerciseNames).map(() => '?').join(',');
            const detailsSql = `SELECT title, muscle_image_url, execution_video_url FROM exercise_details WHERE title IN (${placeholders})`;

            db.all(detailsSql, Array.from(exerciseNames), (err, detailsRows) => {
                if (err) {
                    console.error("Failed to hydrate images", err);
                    return res.json(workouts); // Return basic data if hydration fails
                }

                try {
                    const detailsMap = {};
                    detailsRows.forEach(row => {
                        detailsMap[row.title] = row;
                    });

                    // Hydrate workouts
                    workouts.forEach(w => {
                        if (w.raw_data && w.raw_data.exercises) {
                            w.raw_data.exercises = w.raw_data.exercises.map(e => ({
                                ...e,
                                muscle_image_url: (detailsMap[e.title] && detailsMap[e.title].muscle_image_url) || null,
                                execution_video_url: (detailsMap[e.title] && detailsMap[e.title].execution_video_url) || null
                            }));
                        }
                    });

                    res.json(workouts);
                } catch (innerErr) {
                    console.error("Error processing workout details:", innerErr);
                    res.json(workouts);
                }
            });
        } catch (processErr) {
            console.error("Error processing workouts row:", processErr);
            res.status(500).json({ error: "Internal processing error" });
        }
    });
});

// Get Single Workout
router.get('/:id', (req, res) => {
    const sql = `SELECT * FROM workouts WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Workout not found' });

        row.raw_data = JSON.parse(row.raw_data);
        res.json(row);
    });
});

module.exports = router;
