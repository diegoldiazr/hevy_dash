const express = require('express');
const router = express.Router();
const db = require('../db');
const { getPattern, MUSCLE_TO_SIDE } = require('../services/exerciseMappings');

router.get('/', (req, res) => {
    const period = req.query.period || 'all';

    let dateFilter = '';
    const now = new Date();
    if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = ` WHERE start_time >= '${startOfMonth.toISOString()}'`;
    } else if (period === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = ` WHERE start_time >= '${startOfYear.toISOString()}'`;
    }

    const muscleTranslations = {
        'chest': 'Pecho', 'back': 'Espalda', 'shoulders': 'Hombros', 'biceps': 'Bíceps',
        'triceps': 'Tríceps', 'quadriceps': 'Cuádriceps', 'hamstrings': 'Isquios',
        'glutes': 'Glúteos', 'calves': 'Gemelos', 'abdominals': 'Abdominales',
        'forearms': 'Antebrazos', 'traps': 'Trapecio', 'lats': 'Dorsales',
        'lower_back': 'Lumbar', 'abs': 'Abdominales', 'quads': 'Cuádriceps'
    };

    // Helper for 1RM calculation
    const calcE1RM = (weight, reps) => weight * (1 + (reps / 30));

    // Get all data needed: Workouts and Body Measurements
    db.all(`SELECT start_time, end_time, raw_data FROM workouts ORDER BY start_time ASC`, (err, allWorkouts) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all(`SELECT date, weight FROM body_measurements ORDER BY date ASC`, (err, measurements) => {
            if (err) return res.status(500).json({ error: err.message });

            // Context: Max e1RM historical for all exercises
            const exerciseMaxE1RM = {};
            allWorkouts.forEach(r => {
                try {
                    const data = JSON.parse(r.raw_data);
                    (data.exercises || []).forEach(ex => {
                        if (!exerciseMaxE1RM[ex.title]) exerciseMaxE1RM[ex.title] = 0;
                        (ex.sets || []).forEach(s => {
                            if (s.weight_kg && s.reps) {
                                const e1rm = calcE1RM(s.weight_kg, s.reps);
                                if (e1rm > exerciseMaxE1RM[ex.title]) exerciseMaxE1RM[ex.title] = e1rm;
                            }
                        });
                    });
                } catch (e) { }
            });

            // Filtering for specific period
            const periodStartTime = period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) :
                period === 'year' ? new Date(now.getFullYear(), 0, 1) : null;

            const filteredWorkouts = periodStartTime ? allWorkouts.filter(w => new Date(w.start_time) >= periodStartTime) : allWorkouts;

            // Analysis buckets
            const weeklyAnalytics = {}; // key: YYYY-WW
            const muscleCounts = {};
            const movementPatternMaxes = {}; // key: pattern -> { weekKey: maxE1RM }
            const repRangeDistribution = {}; // key: weekKey -> { '5-8': count, ... }
            const rirDistribution = {}; // key: weekKey -> { 'RIR 0': count, ... }
            const sessionDurations = {}; // key: weekKey -> totalMinutes
            const anteriorVol = {}; // weekKey -> count
            const posteriorVol = {}; // weekKey -> count

            allWorkouts.forEach(row => {
                try {
                    const data = JSON.parse(row.raw_data);
                    const startTime = new Date(row.start_time);
                    const endTime = new Date(row.end_time);
                    const sessionMinutes = (endTime - startTime) / 60000;

                    const year = startTime.getFullYear();
                    const onejan = new Date(year, 0, 1);
                    const week = Math.ceil((((startTime - onejan) / 86400000) + onejan.getDay() + 1) / 7);
                    const weekKey = `${year}-W${String(week).padStart(2, '0')}`;

                    // Initialize weekly buckets
                    if (!weeklyAnalytics[weekKey]) {
                        weeklyAnalytics[weekKey] = { name: weekKey, effectiveSets: 0, totalRPE: 0, rpeCount: 0, totalVolume: 0, workoutCount: 0 };
                        repRangeDistribution[weekKey] = { '5-8': 0, '8-12': 0, '12-20': 0, 'other': 0 };
                        rirDistribution[weekKey] = { 'RIR 0': 0, 'RIR 1-2': 0, 'RIR 3+': 0 };
                        sessionDurations[weekKey] = 0;
                        anteriorVol[weekKey] = 0;
                        posteriorVol[weekKey] = 0;
                    }

                    weeklyAnalytics[weekKey].workoutCount++;
                    sessionDurations[weekKey] += sessionMinutes > 0 ? sessionMinutes : 60; // fallback 1 hour

                    (data.exercises || []).forEach(ex => {
                        const pattern = getPattern(ex.title);
                        const rawMuscle = (ex.primary_muscle_group || 'Other').toLowerCase();
                        const muscle = muscleTranslations[rawMuscle] || rawMuscle;
                        const side = MUSCLE_TO_SIDE[muscle] || 'other';

                        (ex.sets || []).forEach(set => {
                            if (set.type === 'warmup') return;

                            const reps = set.reps || 0;
                            const weight = set.weight_kg || 0;
                            const rpe = set.rpe || (set.rir !== null ? (10 - set.rir) : null);
                            const rir = set.rir !== null ? set.rir : (set.rpe ? (10 - set.rpe) : null);

                            // e1RM for patterns
                            if (pattern && weight > 0 && reps > 0) {
                                const e1rm = calcE1RM(weight, reps);
                                if (!movementPatternMaxes[pattern]) movementPatternMaxes[pattern] = {};
                                if (!movementPatternMaxes[pattern][weekKey] || e1rm > movementPatternMaxes[pattern][weekKey]) {
                                    movementPatternMaxes[pattern][weekKey] = e1rm;
                                }
                            }

                            // Effective set check
                            let isEffective = false;
                            if (rpe !== null && rpe >= 7) {
                                isEffective = true;
                                weeklyAnalytics[weekKey].totalRPE += rpe;
                                weeklyAnalytics[weekKey].rpeCount++;
                            } else if (rpe === null) {
                                const maxE1RM = exerciseMaxE1RM[ex.title] || 0;
                                if (maxE1RM > 0 && weight > (maxE1RM * 0.65)) {
                                    isEffective = true;
                                }
                            }

                            if (isEffective) {
                                weeklyAnalytics[weekKey].effectiveSets++;
                                weeklyAnalytics[weekKey].totalVolume += (weight * reps);

                                // Only count filtered ones for the pie chart
                                if (filteredWorkouts.some(w => w.start_time === row.start_time)) {
                                    muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
                                }

                                // Rep range
                                if (reps >= 5 && reps <= 8) repRangeDistribution[weekKey]['5-8']++;
                                else if (reps > 8 && reps <= 12) repRangeDistribution[weekKey]['8-12']++;
                                else if (reps > 12 && reps <= 20) repRangeDistribution[weekKey]['12-20']++;
                                else repRangeDistribution[weekKey]['other']++;

                                // RIR
                                if (rir === 0) rirDistribution[weekKey]['RIR 0']++;
                                else if (rir >= 1 && rir <= 2) rirDistribution[weekKey]['RIR 1-2']++;
                                else if (rir >= 3) rirDistribution[weekKey]['RIR 3+']++;

                                // Side balance
                                if (side === 'anterior') anteriorVol[weekKey]++;
                                else if (side === 'posterior') posteriorVol[weekKey]++;
                            }
                        });
                    });
                } catch (e) { }
            });

            // Map measurements to weeks
            const weightByWeek = {};
            measurements.forEach(m => {
                const date = new Date(m.date);
                const year = date.getFullYear();
                const onejan = new Date(year, 0, 1);
                const week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7);
                const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
                weightByWeek[weekKey] = m.weight;
            });

            // Fill missing weeks measurements with previous known
            let lastWeight = 80; // default
            Object.keys(weeklyAnalytics).sort().forEach(wk => {
                if (weightByWeek[wk]) lastWeight = weightByWeek[wk];
                else weightByWeek[wk] = lastWeight;
            });

            // Final formatting and filtering
            const weekKeys = Object.keys(weeklyAnalytics).sort();
            const resultWeeks = period === 'all' ? weekKeys : weekKeys.filter(wk => {
                const wkNum = parseInt(wk.split('-W')[1]);
                const wkYear = parseInt(wk.split('-W')[0]);
                const wkDate = new Date(wkYear, 0, (wkNum - 1) * 7 + 1);
                return !periodStartTime || wkDate >= periodStartTime;
            });

            const weeklyVolume = resultWeeks.map(wk => {
                const w = weeklyAnalytics[wk];
                const avgRPE = w.rpeCount > 0 ? (w.totalRPE / w.rpeCount) : 0;
                const weight = weightByWeek[wk] || lastWeight;

                // Efficiency Index: Sets / Average RPE
                const efficiencyIndex = avgRPE > 0 ? (w.effectiveSets / avgRPE) : 0;

                // Density: Sets / Minute
                const density = sessionDurations[wk] > 0 ? (w.effectiveSets / sessionDurations[wk]) : 0;

                return {
                    name: wk,
                    effectiveSets: w.effectiveSets,
                    avgRPE: Math.round(avgRPE * 10) / 10,
                    efficiencyIndex: Math.round(efficiencyIndex * 100) / 100,
                    bodyWeight: weight,
                    density: Math.round(density * 100) / 100,
                    repRanges: repRangeDistribution[wk],
                    rirDist: rirDistribution[wk],
                    anterior: anteriorVol[wk],
                    posterior: posteriorVol[wk],
                    volumeLoad: Math.round(w.totalVolume / 100) / 10 // in 100kg units for scaling
                };
            });

            // Pattern Trends
            const patternData = {};
            Object.keys(movementPatternMaxes).forEach(pattern => {
                patternData[pattern] = resultWeeks.map(wk => ({
                    name: wk,
                    value: Math.round((movementPatternMaxes[pattern][wk] || 0) * 10) / 10
                }));
            });

            // Relative Strength (latest e1RM / latest weight)
            const latestWeek = resultWeeks[resultWeeks.length - 1];
            const latestWeight = weightByWeek[latestWeek] || lastWeight;
            const relativeStrength = {};
            Object.keys(movementPatternMaxes).forEach(pattern => {
                const maxVal = movementPatternMaxes[pattern][latestWeek] || 0;
                relativeStrength[pattern] = latestWeight > 0 ? Math.round((maxVal / latestWeight) * 100) / 100 : 0;
            });

            // ACWR (Acute:Chronic Workload Ratio)
            // Acute = avg of last 4 weeks volume
            // Chronic = avg of last 12 weeks volume
            const acwr = resultWeeks.map((wk, idx) => {
                const slice4 = resultWeeks.slice(Math.max(0, idx - 3), idx + 1);
                const slice12 = resultWeeks.slice(Math.max(0, idx - 11), idx + 1);

                const avg4 = slice4.reduce((acc, curr) => acc + weeklyAnalytics[curr].effectiveSets, 0) / (slice4.length || 1);
                const avg12 = slice12.reduce((acc, curr) => acc + weeklyAnalytics[curr].effectiveSets, 0) / (slice12.length || 1);

                return {
                    name: wk,
                    value: avg12 > 0 ? Math.round((avg4 / avg12) * 100) / 100 : 1
                };
            });

            // Hypertrophy Score (0-100)
            // Composite: Normalized (Avg Effective Sets * Avg RPE * Weekly Frequency)
            const avgWeeklySets = resultWeeks.reduce((acc, curr) => acc + weeklyAnalytics[curr].effectiveSets, 0) / (resultWeeks.length || 1);
            const avgWeeklyRPE = resultWeeks.reduce((acc, curr) => {
                const w = weeklyAnalytics[curr];
                return acc + (w.rpeCount > 0 ? (w.totalRPE / w.rpeCount) : 0);
            }, 0) / (resultWeeks.length || 1);
            const avgFrequency = resultWeeks.reduce((acc, curr) => acc + weeklyAnalytics[curr].workoutCount, 0) / (resultWeeks.length || 1);

            // Normalize: 20 sets/week, 9 RPE, 5 days/week = 100
            const hypertrophyScore = Math.min(100, Math.round(((avgWeeklySets / 20) * (avgWeeklyRPE / 9) * (avgFrequency / 5)) * 100));

            const hypertrophyBreakdown = {
                avgSets: Math.round(avgWeeklySets * 10) / 10,
                avgRPE: Math.round(avgWeeklyRPE * 10) / 10,
                avgFrequency: Math.round(avgFrequency * 10) / 10
            };

            const muscleSplit = Object.entries(muscleCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            res.json({
                muscleSplit,
                weeklyVolume,
                patternData,
                relativeStrength,
                acwr,
                hypertrophyScore,
                hypertrophyBreakdown,
                period
            });
        });
    });
});

module.exports = router;

