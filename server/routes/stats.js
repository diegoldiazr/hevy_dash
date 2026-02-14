const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
    const currentYear = new Date().getFullYear().toString();
    const stats = {
        totalWorkouts: 0,
        yearWorkouts: 0,
        totalVolume: 0,
        yearVolume: 0,
        recentWorkouts: []
    };

    const sql = `
        SELECT 
            COUNT(*) as totalWorkouts,
            SUM(CASE WHEN strftime('%Y', start_time) = ? THEN 1 ELSE 0 END) as yearWorkouts,
            SUM(volume_kg) as totalVolume,
            SUM(CASE WHEN strftime('%Y', start_time) = ? THEN volume_kg ELSE 0 END) as yearVolume
        FROM workouts
    `;

    db.serialize(() => {
        db.get(sql, [currentYear, currentYear], (err, row) => {
            if (!err && row) {
                stats.totalWorkouts = row.totalWorkouts || 0;
                stats.yearWorkouts = row.yearWorkouts || 0;
                stats.totalVolume = row.totalVolume || 0;
                stats.yearVolume = row.yearVolume || 0;
            }
        });

        db.all('SELECT id, title, start_time, volume_kg FROM workouts ORDER BY start_time DESC LIMIT 5', (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            stats.recentWorkouts = rows;
            res.json(stats);
        });
    });
});

module.exports = router;
