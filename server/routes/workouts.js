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

// Get Analysis and Proposals for a Specific Workout
router.get('/:id/analysis', (req, res) => {
    const workoutId = req.params.id;

    // 1. Get User Goal
    db.get('SELECT goal FROM user_settings WHERE id = 1', [], (err, userRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const userGoal = (userRow && userRow.goal ? userRow.goal : '').toLowerCase();

        // 2. Get the specific workout
        db.get('SELECT start_time, raw_data FROM workouts WHERE id = ?', [workoutId], (err, workoutRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!workoutRow) return res.status(404).json({ error: 'Workout not found' });

            const workoutData = JSON.parse(workoutRow.raw_data);
            const exercises = workoutData.exercises || [];
            const startTime = workoutRow.start_time;

            if (exercises.length === 0) return res.json({});

            // 3. For each exercise, find its previous session
            const analysis = {};
            let pending = exercises.length;

            if (pending === 0) return res.json({});

            exercises.forEach(ex => {
                const exName = ex.title;

                // Find the latest workout BEFORE this one that contains this exercise
                const prevSql = `
                    SELECT w.start_time, w.raw_data
                    FROM workouts w, json_each(json_extract(w.raw_data, '$.exercises')) as e
                    WHERE (json_extract(e.value, '$.title') = ? OR json_extract(e.value, '$.title_es') = ? OR json_extract(e.value, '$.title_en') = ?)
                    AND w.start_time < ?
                    ORDER BY w.start_time DESC
                    LIMIT 1
                `;

                db.get(prevSql, [exName, exName, exName, startTime], (err, prevRow) => {
                    if (prevRow) {
                        const prevWorkout = JSON.parse(prevRow.raw_data);
                        const prevEx = prevWorkout.exercises.find(e => e.title === exName || e.title_es === exName || e.title_en === exName);

                        if (prevEx) {
                            // Compare stats
                            const getStats = (e) => {
                                let maxW = 0, totalR = 0, bestE1RM = 0;
                                e.sets.forEach(s => {
                                    const w = s.weight_kg || 0;
                                    const r = s.reps || 0;
                                    if (w > maxW) maxW = w;
                                    totalR += r;
                                    const e1rm = w * (1 + (r / 30));
                                    if (e1rm > bestE1RM) bestE1RM = e1rm;
                                });
                                return { maxW, totalR, bestE1RM };
                            };

                            const curr = getStats(ex);
                            const prev = getStats(prevEx);

                            let status = 'evolved';
                            let proposal = '';
                            let type = 'success';

                            if (curr.maxW > prev.maxW) {
                                proposal = '¡Excelente! Has subido el peso máximo. Próximo reto: Mantén este peso y busca +1 repetición en la serie más pesada.';
                            } else if (curr.totalR > prev.totalR) {
                                proposal = 'Buen trabajo incrementando las repeticiones totales. Tu cuerpo se está adaptando. Próxima vez: Intenta subir 1-2kg el peso.';
                            } else {
                                // STAGNANT or Lower
                                status = 'stagnant';
                                type = 'warning';

                                // Tailor proposal to goal
                                if (userGoal.includes('grasa') || userGoal.includes('perder') || userGoal.includes('defini')) {
                                    proposal = 'Estancamiento detectado. Para pérdida de grasa: Reduce el descanso 15s o añade una serie de "burnout" al final con 30% menos peso al fallo.';
                                } else if (userGoal.includes('masa') || userGoal.includes('volumen') || userGoal.includes('fuerza')) {
                                    proposal = 'Meseta alcanzada. Para hipertrofia: Prueba con una serie de "descarga" (drop set) inmediatamente tras la última serie o forzar 2 parciales adicionales.';
                                } else if (userGoal.includes('tonifica')) {
                                    proposal = 'Ritmo estable. Para tonificar: Reduce el ritmo de la bajada (fase excéntrica) a 3 segundos para aumentar el tiempo bajo tensión.';
                                } else {
                                    proposal = 'Parece que te has estancado. Intenta variar el orden del ejercicio o incrementar el peso mínimamente (0.5kg) la próxima sesión.';
                                }
                            }

                            analysis[exName] = {
                                status,
                                proposal,
                                type,
                                diff: {
                                    weight: (curr.maxW - prev.maxW).toFixed(1),
                                    reps: curr.totalR - prev.totalR
                                }
                            };
                        }
                    } else {
                        analysis[exName] = {
                            status: 'new',
                            proposal: 'Primer registro de este ejercicio. Establece una base sólida hoy.',
                            type: 'info'
                        };
                    }

                    pending--;
                    if (pending === 0) res.json(analysis);
                });
            });
        });
    });
});

module.exports = router;
