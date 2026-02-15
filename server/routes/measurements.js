const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all measurements
router.get('/', (req, res) => {
    db.all('SELECT * FROM body_measurements ORDER BY date ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add or update measurement
router.post('/', (req, res) => {
    const { date, weight, chest, neck, waist, hips } = req.body;

    if (!date) return res.status(400).json({ error: 'Date is required' });

    const sql = `
        INSERT INTO body_measurements (date, weight, chest, neck, waist, hips)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
            weight = excluded.weight,
            chest = excluded.chest,
            neck = excluded.neck,
            waist = excluded.waist,
            hips = excluded.hips,
            created_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [date, weight, chest, neck, waist, hips], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Measurement saved', id: this.lastID });
    });
});

module.exports = router;
