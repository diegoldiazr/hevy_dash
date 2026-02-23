const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
    const period = req.query.period || 'all';

    let dateFilter = '';
    const now = new Date();
    if (period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = ` WHERE start_time >= '${monthAgo.toISOString()}'`;
    } else if (period === 'year') {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter = ` WHERE start_time >= '${yearAgo.toISOString()}'`;
    }

    const muscleTranslations = {
        'chest': 'Pecho', 'back': 'Espalda', 'shoulders': 'Hombros', 'biceps': 'Bíceps',
        'triceps': 'Tríceps', 'quadriceps': 'Cuádriceps', 'hamstrings': 'Isquios',
        'glutes': 'Glúteos', 'calves': 'Gemelos', 'abdominals': 'Abdominales',
        'forearms': 'Antebrazos', 'traps': 'Trapecio', 'lats': 'Dorsales',
        'lower_back': 'Lumbar', 'abs': 'Abdominales', 'quads': 'Cuádriceps'
    };

    db.all(`SELECT start_time, raw_data FROM workouts${dateFilter} ORDER BY start_time ASC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // 1. Calculate Exercise Max E1RMs (global for context)
        const exerciseMaxE1RM = {};

        // We need all workouts to get historical 1RM, not just filtered ones
        db.all(`SELECT raw_data FROM workouts`, (err, allRows) => {
            allRows.forEach(r => {
                try {
                    const d = JSON.parse(r.raw_data);
                    (d.exercises || []).forEach(ex => {
                        if (!exerciseMaxE1RM[ex.title]) exerciseMaxE1RM[ex.title] = 0;
                        (ex.sets || []).forEach(s => {
                            if (s.weight_kg && s.reps) {
                                const e1rm = s.weight_kg * (1 + (s.reps / 30));
                                if (e1rm > exerciseMaxE1RM[ex.title]) exerciseMaxE1RM[ex.title] = e1rm;
                            }
                        });
                    });
                } catch (e) { }
            });

            const weeklyAnalytics = {}; // key: YYYY-WW
            const muscleCounts = {};

            rows.forEach(row => {
                try {
                    const data = JSON.parse(row.raw_data);
                    const date = new Date(row.start_time);
                    const year = date.getFullYear();
                    const onejan = new Date(year, 0, 1);
                    const week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7);
                    const weekKey = `${year}-W${String(week).padStart(2, '0')}`;

                    if (!weeklyAnalytics[weekKey]) {
                        weeklyAnalytics[weekKey] = { name: weekKey, effectiveSets: 0, totalRPE: 0, rpeCount: 0 };
                    }

                    if (data.exercises) {
                        data.exercises.forEach(ex => {
                            const rawMuscle = (ex.primary_muscle_group || 'Other').toLowerCase();
                            const muscle = muscleTranslations[rawMuscle] || rawMuscle;

                            (ex.sets || []).forEach(set => {
                                if (set.type === 'warmup') return;

                                let isEffective = false;
                                if (set.rpe && set.rpe >= 7) {
                                    isEffective = true;
                                    weeklyAnalytics[weekKey].totalRPE += set.rpe;
                                    weeklyAnalytics[weekKey].rpeCount++;
                                } else if (!set.rpe) {
                                    const maxE1RM = exerciseMaxE1RM[ex.title] || 0;
                                    if (maxE1RM > 0 && set.weight_kg > (maxE1RM * 0.65)) {
                                        isEffective = true;
                                    }
                                }

                                if (isEffective) {
                                    weeklyAnalytics[weekKey].effectiveSets++;
                                    muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
                                }
                            });
                        });
                    }
                } catch (e) { }
            });

            // Final formatting
            const weeklyVolume = Object.values(weeklyAnalytics).map(w => ({
                name: w.name,
                effectiveSets: w.effectiveSets,
                avgRPE: w.rpeCount > 0 ? Math.round((w.totalRPE / w.rpeCount) * 10) / 10 : 0
            })).sort((a, b) => a.name.localeCompare(b.name));

            const muscleSplit = Object.entries(muscleCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            res.json({
                muscleSplit,
                weeklyVolume,
                period
            });
        });
    });
});

module.exports = router;
