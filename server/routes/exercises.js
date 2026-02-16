const express = require('express');
const router = express.Router();
const db = require('../db');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const ai = require('../services/ai');

// Get list of all exercises found in workouts
router.get('/', (req, res) => {
    const period = req.query.period || 'all'; // 'month', 'year', 'all'

    // Calculate date filter
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

    // Use SQLite JSON functions to extract unique titles directly from the database
    // This is much faster and more accurate for filtering by period
    const sql = `
        SELECT DISTINCT 
            COALESCE(json_extract(ex.value, '$.title_en'), json_extract(ex.value, '$.title')) as exercise_name
        FROM workouts, json_each(json_extract(raw_data, '$.exercises')) as ex
        ${dateFilter}
        ORDER BY exercise_name ASC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const exerciseList = rows.map(r => r.exercise_name).filter(Boolean);
        res.json(exerciseList);
    });
});

// Get history for a specific exercise
router.get('/:name/history', (req, res) => {
    const exerciseName = req.params.name;
    const period = req.query.period || 'all'; // 'month', 'year', 'all'

    // Calculate date filter
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

    // Fetch routines and folders to map routine_id -> folder_title
    db.all('SELECT id, folder_id FROM routines', [], (err, routineRows) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT id, title FROM routine_folders', [], (err, folderRows) => {
            if (err) return res.status(500).json({ error: err.message });

            const folderMap = {};
            folderRows.forEach(f => folderMap[f.id] = f.title);

            const routineToFolderMap = {};
            routineRows.forEach(r => {
                routineToFolderMap[r.id] = folderMap[r.folder_id] || 'Sin carpeta';
            });

            // Optimized query to fetch only relevant workouts for this exercise
            const sql = `
                SELECT 
                    w.start_time, 
                    w.title as workout_title,
                    w.raw_data
                FROM workouts w, json_each(json_extract(w.raw_data, '$.exercises')) as ex
                WHERE (
                    json_extract(ex.value, '$.title') = ? OR 
                    json_extract(ex.value, '$.title_es') = ? OR 
                    json_extract(ex.value, '$.title_en') = ?
                )
                ${dateFilter ? dateFilter.replace('WHERE', 'AND') : ''}
                ORDER BY w.start_time ASC
            `;

            db.all(sql, [exerciseName, exerciseName, exerciseName], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });

                const history = [];

                rows.forEach(row => {
                    try {
                        const data = JSON.parse(row.raw_data);
                        if (data.exercises) {
                            // Find the specific exercise instance in this workout
                            const exercise = data.exercises.find(ex =>
                                ex.title === exerciseName ||
                                ex.title_es === exerciseName ||
                                ex.title_en === exerciseName
                            );

                            if (exercise) {
                                let maxWeight = 0;
                                let volume = 0;
                                let bestE1RM = 0;
                                let totalReps = 0;
                                let maxReps = 0;

                                exercise.sets.forEach(set => {
                                    const w = set.weight_kg || 0;
                                    const r = set.reps || 0;

                                    if (r > 0) {
                                        totalReps += r;
                                        if (r > maxReps) maxReps = r;
                                        if (w > maxWeight) maxWeight = w;
                                        volume += w * r;

                                        // Epley Formula for 1RM: weight * (1 + reps/30)
                                        const e1rm = w * (1 + (r / 30));
                                        if (e1rm > bestE1RM) bestE1RM = e1rm;
                                    }
                                });

                                history.push({
                                    date: row.start_time,
                                    workoutTitle: row.workout_title,
                                    routineTitle: routineToFolderMap[data.routine_id] || 'Sin carpeta',
                                    sets: exercise.sets,
                                    maxWeight,
                                    volume,
                                    totalReps,
                                    maxReps,
                                    e1rm: Math.round(bestE1RM * 10) / 10
                                });
                            }
                        }
                    } catch (e) { }
                });

                res.json(history);
            });
        });
    });
});


// Get details for a specific exercise (technique, images)
router.get('/:name/details', async (req, res) => {
    const exerciseName = req.params.name;

    // Check cache first
    db.get('SELECT * FROM exercise_details WHERE title = ?', [exerciseName], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            return res.json({
                ...row,
                technique: JSON.parse(row.technique)
            });
        }

        // Not in cache, try to scrape
        try {
            const generateSlug = (name) => {
                return name.toLowerCase()
                    .replace(/[^a-z0-9]/g, ' ')
                    .trim()
                    .split(/\s+/)
                    .join('-');
            };

            // Generate possible slugs to try
            const nameLower = exerciseName.toLowerCase();
            const baseSlugs = [generateSlug(exerciseName)];

            // If contains "(Machine)", try "Machine [Name]" and just "[Name]"
            if (nameLower.includes('(machine)')) {
                const clean = exerciseName.replace(/\(machine\)/i, '').trim();
                baseSlugs.push(`machine-${generateSlug(clean)}`);
                baseSlugs.push(generateSlug(clean));
            }
            // If contains "(Dumbbell)", etc.
            if (nameLower.includes('(dumbbell)')) {
                const clean = exerciseName.replace(/\(dumbbell\)/i, '').trim();
                baseSlugs.push(`dumbbell-${generateSlug(clean)}`);
                baseSlugs.push(generateSlug(clean));
            }
            if (nameLower.includes('(barbell)')) {
                const clean = exerciseName.replace(/\(barbell\)/i, '').trim();
                baseSlugs.push(`barbell-${generateSlug(clean)}`);
                baseSlugs.push(generateSlug(clean));
            }
            if (nameLower.includes('(cable)')) {
                const clean = exerciseName.replace(/\(cable\)/i, '').trim();
                baseSlugs.push(`cable-${generateSlug(clean)}`);
                baseSlugs.push(generateSlug(clean));
            }

            // De-duplicate slugs
            const slugsToTry = [...new Set(baseSlugs)];
            let response = null;
            let usedSlug = slugsToTry[0];

            for (const s of slugsToTry) {
                const urls = [
                    `https://www.hevyapp.com/exercises/${s}/`,
                    `https://www.hevyapp.com/exercises/how-to-${s}/`
                ];

                for (const url of urls) {
                    console.log(`[Exercise] Trying: ${url}`);
                    const res = await fetch(url);
                    if (res.ok) {
                        response = res;
                        usedSlug = s;
                        break;
                    }
                }
                if (response) break;
            }

            if (!response) {
                // Return defaults if not found
                return res.json({
                    title: exerciseName,
                    technique: ["Perform the exercise with controlled form.", "Keep your core stable.", "Focus on the target muscle."],
                    muscle_image_url: null,
                    execution_video_url: null
                });
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            const slug = usedSlug;

            // 2. Extract Technique
            let technique = [];
            $('.wp-block-columns ol li, ol li').each((i, el) => {
                technique.push($(el).text().trim());
            });

            if (technique.length === 0) {
                technique = ["Perform the exercise with controlled form.", "Keep your core stable.", "Focus on the target muscle."];
            }

            // 3. Extract Muscle Image (usually the one with anatomy/muscle in path)
            let muscle_image_url = null;
            $('img').each((i, el) => {
                const src = $(el).attr('src');
                const alt = $(el).attr('alt') || '';
                if (src && (src.includes('muscle') || src.includes('anatomy') || alt.toLowerCase().includes('muscle'))) {
                    muscle_image_url = src.trim();
                }
            });
            // Fallback to first major image with 'wp-content' if no muscle specific one
            if (!muscle_image_url) {
                $('img').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src && src.includes('wp-content/uploads')) {
                        muscle_image_url = src.trim();
                        return false; // break
                    }
                });
            }

            // 4. Extract Video/Animation
            let execution_video_url = $('video source').attr('src') || $('video').attr('src');
            if (execution_video_url) execution_video_url = execution_video_url.trim();

            const details = {
                title: exerciseName,
                slug: slug,
                technique: JSON.stringify(technique),
                muscle_image_url: muscle_image_url,
                execution_video_url: execution_video_url
            };

            // Save to cache
            db.run(`INSERT INTO exercise_details (title, slug, technique, muscle_image_url, execution_video_url)
                    VALUES (?, ?, ?, ?, ?)`,
                [details.title, details.slug, details.technique, details.muscle_image_url, details.execution_video_url],
                (err) => {
                    if (err) console.error("[DB] Cache error:", err.message);
                }
            );

            res.json({
                ...details,
                technique: JSON.parse(details.technique)
            });

        } catch (error) {
            console.error("[Exercise] Scrape Error:", error.message);
            res.status(500).json({ error: "Failed to fetch exercise details" });
        }
    });
});

module.exports = router;
