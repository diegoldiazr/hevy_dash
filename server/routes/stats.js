const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
    const currentYear = new Date().getFullYear().toString();
    const stats = {
        workouts: { month: 0, year: 0, all: 0 },
        volume: { month: 0, year: 0, all: 0 },
        duration: { month: 0, year: 0, all: 0 },
        recentWorkouts: []
    };

    const sqlMetrics = `
        SELECT 
            COUNT(*) as allWorkouts,
            SUM(CASE WHEN strftime('%Y', start_time) = ? THEN 1 ELSE 0 END) as yearWorkouts,
            SUM(CASE WHEN start_time >= date('now', 'start of month') THEN 1 ELSE 0 END) as monthWorkouts,
            SUM(volume_kg) as allVolume,
            SUM(CASE WHEN strftime('%Y', start_time) = ? THEN volume_kg ELSE 0 END) as yearVolume,
            SUM(CASE WHEN start_time >= date('now', 'start of month') THEN volume_kg ELSE 0 END) as monthVolume,
            SUM((julianday(end_time) - julianday(start_time)) * 1440) as allDuration,
            SUM(CASE WHEN strftime('%Y', start_time) = ? THEN (julianday(end_time) - julianday(start_time)) * 1440 ELSE 0 END) as yearDuration,
            SUM(CASE WHEN start_time >= date('now', 'start of month') THEN (julianday(end_time) - julianday(start_time)) * 1440 ELSE 0 END) as monthDuration
        FROM workouts
    `;

    db.serialize(() => {
        db.get(sqlMetrics, [currentYear, currentYear, currentYear], (err, row) => {
            if (!err && row) {
                stats.workouts = {
                    month: row.monthWorkouts || 0,
                    year: row.yearWorkouts || 0,
                    all: row.allWorkouts || 0
                };
                stats.volume = {
                    month: row.monthVolume || 0,
                    year: row.yearVolume || 0,
                    all: row.allVolume || 0
                };
                stats.duration = {
                    month: Math.round(row.monthDuration || 0),
                    year: Math.round(row.yearDuration || 0),
                    all: Math.round(row.allDuration || 0)
                };
            }
        });

        db.all('SELECT id, title, start_time, volume_kg FROM workouts ORDER BY start_time DESC LIMIT 5', [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.recentWorkouts = rows;
            res.json(stats);
        });
    });
});

router.get('/chart', (req, res) => {
    const { period, metric } = req.query; // period: month, year, all | metric: volume, duration
    let sql = '';
    const metricSql = metric === 'duration'
        ? 'SUM((julianday(end_time) - julianday(start_time)) * 1440)'
        : 'SUM(volume_kg)';

    if (period === 'month') {
        sql = `
            SELECT date(start_time) as label, ${metricSql} as value 
            FROM workouts 
            WHERE start_time >= date('now', 'start of month')
            GROUP BY label
            ORDER BY label ASC
        `;
    } else if (period === 'year') {
        sql = `
            SELECT strftime('%m', start_time) as monthNum, ${metricSql} as value 
            FROM workouts 
            WHERE strftime('%Y', start_time) = strftime('%Y', 'now')
            GROUP BY monthNum
            ORDER BY monthNum ASC
        `;
    } else {
        sql = `
            SELECT strftime('%Y', start_time) as label, ${metricSql} as value 
            FROM workouts 
            GROUP BY label
            ORDER BY label ASC
        `;
    }

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (period === 'year') {
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const data = rows.map(r => ({
                name: monthNames[parseInt(r.monthNum) - 1],
                value: Math.round(r.value)
            }));
            res.json(data);
        } else {
            const data = rows.map(r => ({
                name: r.label,
                value: Math.round(r.value)
            }));
            res.json(data);
        }
    });
});

router.get('/muscles', (req, res) => {
    const period = req.query.period || 'month'; // month, year, all
    let sql = 'SELECT start_time, raw_data FROM workouts';
    let params = [];

    if (period === 'month') {
        sql += ' WHERE start_time >= date("now", "-1 month")';
    } else if (period === 'year') {
        sql += ' WHERE strftime("%Y", start_time) = strftime("%Y", "now")';
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const muscleCounts = {};
        const muscleTranslations = {
            'chest': 'Pecho',
            'back': 'Espalda',
            'shoulders': 'Hombros',
            'biceps': 'Bíceps',
            'triceps': 'Tríceps',
            'quadriceps': 'Cuádriceps',
            'hamstrings': 'Isquios',
            'glutes': 'Glúteos',
            'calves': 'Gemelos',
            'abdominals': 'Abdominales',
            'forearms': 'Antebrazos',
            'traps': 'Trapecio',
            'lats': 'Dorsales',
            'lower_back': 'Lumbar',
            'Other': 'Otros'
        };

        rows.forEach(row => {
            try {
                const data = JSON.parse(row.raw_data);
                if (data.exercises) {
                    data.exercises.forEach(ex => {
                        const setsCount = ex.sets ? ex.sets.length : 0;
                        if (setsCount === 0) return;

                        // 1. Count Primary Muscle
                        const rawPrimary = ex.primary_muscle_group || 'Other';
                        const primary = muscleTranslations[rawPrimary] || rawPrimary;
                        muscleCounts[primary] = (muscleCounts[primary] || 0) + setsCount;

                        // 2. Count Secondary Muscles (optional: could weight them less, but let's count them fully for now as requested)
                        if (ex.secondary_muscle_groups && Array.isArray(ex.secondary_muscle_groups)) {
                            ex.secondary_muscle_groups.forEach(sec => {
                                const secondary = muscleTranslations[sec] || sec;
                                muscleCounts[secondary] = (muscleCounts[secondary] || 0) + setsCount;
                            });
                        }
                    });
                }
            } catch (e) { }
        });

        const sortedMuscles = Object.entries(muscleCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json(sortedMuscles);
    });
});

module.exports = router;
