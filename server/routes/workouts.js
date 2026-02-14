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

        // Parse raw_data if needed, but for list view usually top columns are enough
        // We might want to return stats like 'exercise_count'
        const workouts = rows.map(row => ({
            ...row,
            raw_data: JSON.parse(row.raw_data)
        }));

        res.json(workouts);
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
