const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
    // In a real scenario, these would be complex queries.
    // For now, we return 0s or mock if empty, but let's try to query the tables.

    // We need to promisify the db calls or use serialization
    const stats = {
        totalWorkouts: 0,
        totalVolume: 0,
        recentWorkouts: []
    };

    db.serialize(() => {
        db.get('SELECT COUNT(*) as count FROM workouts', (err, row) => {
            if (!err && row) stats.totalWorkouts = row.count;
        });

        db.get('SELECT SUM(volume_kg) as volume FROM workouts', (err, row) => {
            if (!err && row) stats.totalVolume = row.volume || 0;
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
