const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
    // 1. Muscle Distribution (Sets per muscle)
    // 2. Consistency (Dates of workouts)
    // 3. Weekly Volume

    const analytics = {
        muscleSplit: {},
        consistency: [],
        weeklyVolume: []
    };

    db.all('SELECT start_time, volume_kg, raw_data FROM workouts ORDER BY start_time ASC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const muscleCounts = {};
        const volumeByWeek = {};

        rows.forEach(row => {
            // Consistency
            analytics.consistency.push(row.start_time);

            // Muscle & Volume parsing
            try {
                const data = JSON.parse(row.raw_data);
                if (data.exercises) {
                    data.exercises.forEach(ex => {
                        // Hevy exercises usually have 'muscle_group' or we infer from title/db if we had a catalog
                        // For now we might not have explicit muscle_group in the simplified fetch
                        // Let's assume title or look for tags if available. 
                        // If not available, we map some common ones or leave as "Other"
                        // Actually Hevy API returns `primary_muscle_group` in the exercise object usually.
                        const muscle = ex.primary_muscle_group || ex.muscle_group || 'Other';
                        muscleCounts[muscle] = (muscleCounts[muscle] || 0) + ex.sets.length;
                    });
                }
            } catch (e) { }

            // Weekly Volume
            const date = new Date(row.start_time);
            // Simple week key: YYYY-Www
            const year = date.getFullYear();
            const onejan = new Date(year, 0, 1);
            const week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7);
            const key = `${year}-W${week}`;

            volumeByWeek[key] = (volumeByWeek[key] || 0) + (row.volume_kg || 0);
        });

        analytics.muscleSplit = Object.entries(muscleCounts).map(([name, value]) => ({ name, value }));
        analytics.weeklyVolume = Object.entries(volumeByWeek).map(([name, value]) => ({ name, value }));

        res.json(analytics);
    });
});

module.exports = router;
