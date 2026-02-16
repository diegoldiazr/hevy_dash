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

    try {
        // 1. Check cache first
        const row = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM exercise_details WHERE title = ?', [exerciseName], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (row) {
            console.log(`[Exercise] Cache hit for: ${exerciseName}`);
            return res.json({
                ...row,
                technique: JSON.parse(row.technique || '[]')
            });
        }

        // 2. Not in cache, try to scrape
        console.log(`[Exercise] Cache miss for: ${exerciseName}. Starting scrape chain...`);
        try {
            const generateSlug = (name) => {
                return name.toLowerCase()
                    .replace(/[^a-z0-9]/g, ' ')
                    .trim()
                    .split(/\s+/)
                    .join('-');
            };

            // 1. TRY HEVYAPP (Following priorities)
            const slugsToTry = [generateSlug(exerciseName)];
            if (exerciseName.includes('(')) {
                const cleanName = exerciseName.replace(/\(.*\)/, '').trim();
                const cleanSlug = generateSlug(cleanName);
                if (cleanSlug && cleanSlug !== slugsToTry[0]) {
                    slugsToTry.push(cleanSlug);
                }
            }

            let response = null;
            let usedSlug = slugsToTry[0];

            for (const s of slugsToTry) {
                const urls = [
                    `https://www.hevyapp.com/exercises/${s}/`,
                    `https://www.hevyapp.com/exercises/how-to-${s}/`
                ];
                for (const url of urls) {
                    try {
                        console.log(`[Exercise] Trying Hevy: ${url}`);
                        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                        if (res.ok) {
                            response = res;
                            usedSlug = s;
                            break;
                        }
                    } catch (err) { }
                }
                if (response) break;
            }

            let foundDetails = null;

            if (response) {
                const html = await response.text();
                const $ = cheerio.load(html);

                let technique = [];
                $('.wp-block-columns ol li, ol li').each((i, el) => {
                    technique.push($(el).text().trim());
                });

                let muscle_image_url = null;
                $('img').each((i, el) => {
                    const src = $(el).attr('src');
                    const alt = $(el).attr('alt') || '';
                    if (src && (src.includes('muscle') || src.includes('anatomy') || alt.toLowerCase().includes('muscle'))) {
                        muscle_image_url = src.trim();
                    }
                });
                if (!muscle_image_url) {
                    $('img').each((i, el) => {
                        const src = $(el).attr('src');
                        if (src && src.includes('wp-content/uploads')) {
                            muscle_image_url = src.trim();
                            return false;
                        }
                    });
                }

                let execution_video_url = $('video source').attr('src') || $('video').attr('src');
                if (execution_video_url) execution_video_url = execution_video_url.trim();

                foundDetails = {
                    title: exerciseName,
                    slug: usedSlug,
                    technique: technique.length > 0 ? technique : null,
                    muscle_image_url,
                    execution_video_url
                };
            }

            // 2. TRY JEFIT (If Hevy failed)
            if (!foundDetails || !foundDetails.technique) {
                console.log(`[Exercise] Hevy failed, trying Jefit for: ${exerciseName}`);
                const jefit = await scrapeJefit(exerciseName);
                if (jefit && jefit.technique) {
                    foundDetails = { ...jefit, slug: generateSlug(exerciseName) };
                }
            }

            // 3. TRY GOOGLE (If Hevy and Jefit failed)
            if (!foundDetails || !foundDetails.technique) {
                console.log(`[Exercise] Hevy/Jefit failed, trying Google search for: ${exerciseName}`);
                const google = await scrapeGoogle(exerciseName);
                if (google && google.technique) {
                    foundDetails = { ...google, slug: generateSlug(exerciseName) };
                }
            }

            // FINAL FALLBACK: If everything failed, use AI or Defaults
            if (!foundDetails) {
                foundDetails = {
                    title: exerciseName,
                    slug: generateSlug(exerciseName),
                    technique: ["Perform the exercise with controlled form.", "Keep your core stable.", "Focus on the target muscle."],
                    muscle_image_url: null,
                    execution_video_url: null
                };
            }

            // Normalize technique to array and then JSON for storage
            const finalTechnique = Array.isArray(foundDetails.technique) ? foundDetails.technique :
                (foundDetails.technique ? [foundDetails.technique] : []);

            // Save to cache
            db.run(`INSERT INTO exercise_details (title, slug, technique, muscle_image_url, execution_video_url)
                    VALUES (?, ?, ?, ?, ?)`,
                [exerciseName, foundDetails.slug, JSON.stringify(finalTechnique), foundDetails.muscle_image_url, foundDetails.execution_video_url],
                (err) => {
                    if (err) console.error("[DB] Cache error:", err.message);
                }
            );

            res.json({
                ...foundDetails,
                technique: finalTechnique
            });

        } catch (error) {
            console.error("[Exercise] Details Error:", error.message);
            res.status(500).json({ error: "Failed to fetch exercise details" });
        }
    } catch (outerError) {
        console.error("[Exercise] Route Error:", outerError.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

async function scrapeJefit(exerciseName) {
    try {
        const searchUrl = `https://www.jefit.com/exercises?search=${encodeURIComponent(exerciseName)}`;
        console.log(`[Jefit] Searching: ${searchUrl}`);
        const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return null;
        const html = await res.text();
        const $ = cheerio.load(html);

        // Find all result links
        let bestMatch = null;
        const searchTerms = exerciseName.toLowerCase().replace(/\(|\)/g, '').split(/\s+/).filter(t => t.length > 2);

        $('a[href^="/exercises/"]').each((i, el) => {
            const href = $(el).attr('href');
            // Skip non-exercise links or category links
            if (href.split('/').length < 4) return;

            const title = $(el).find('p').first().text().trim() || $(el).text().trim();
            const titleLower = title.toLowerCase();

            // Basic verification: at least one significant term must match
            const matchCount = searchTerms.filter(term => titleLower.includes(term)).length;
            if (matchCount > 0) {
                bestMatch = { href, title, matchCount };
                return false; // Found a good enough match
            }
        });

        if (!bestMatch) {
            console.log(`[Jefit] No relevant match found for: ${exerciseName}`);
            return null;
        }

        console.log(`[Jefit] Selected match: ${bestMatch.title} (${bestMatch.href})`);
        const detailsRes = await fetch(`https://www.jefit.com${bestMatch.href}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!detailsRes.ok) return null;
        const detailsHtml = await detailsRes.text();
        const $d = cheerio.load(detailsHtml);

        // 1. Extract Technique
        let technique = [];
        const techText = $d('p.whitespace-pre-wrap').text();
        if (techText) {
            technique = techText
                .replace(/^Steps\s*:\s*/i, '')
                .split(/\d+\.\)\s+/)
                .map(s => s.trim())
                .filter(s => s.length > 5);
        }

        // 2. Extract Muscle Image
        let muscle_image_url = null;
        $d('a[href*="/exercises/"]').each((i, el) => {
            const href = $(el).attr('href');
            const img = $(el).find('img');
            if (img.length > 0 && !href.includes(bestMatch.href)) {
                muscle_image_url = img.attr('src');
                if (muscle_image_url && (muscle_image_url.includes('exercise') || muscle_image_url.includes('muscle'))) {
                    return false;
                }
            }
        });

        // 3. Extract Execution GIF
        let execution_video_url = null;
        $d('img').each((i, el) => {
            const src = $d(el).attr('src');
            if (src && (src.includes('.gif') || src.includes('gifs/'))) {
                execution_video_url = src;
                return false;
            }
        });

        const fixUrl = (url) => {
            if (!url) return null;
            if (url.startsWith('//')) return `https:${url}`;
            if (url.startsWith('/')) return `https://www.jefit.com${url}`;
            return url;
        };

        return {
            technique,
            muscle_image_url: fixUrl(muscle_image_url),
            execution_video_url: fixUrl(execution_video_url)
        };
    } catch (e) {
        console.error("[Jefit Scrape] Error:", e.message);
        return null;
    }
}

async function scrapeGoogle(exerciseName) {
    try {
        const query = encodeURIComponent(`${exerciseName} exercise technique steps guide`);
        const url = `https://www.google.com/search?q=${query}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        if (!res.ok) return null;
        const html = await res.text();
        const $ = cheerio.load(html);
        let technique = [];
        $('li').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 20 && text.length < 300 && (text.match(/^\d/) || text.toLowerCase().includes('step'))) {
                technique.push(text);
            }
        });
        return technique.length > 0 ? { technique: technique.slice(0, 8) } : null;
    } catch (e) { return null; }
}

// Update manual exercise details
router.post('/:name/details', (req, res) => {
    const exerciseName = req.params.name;
    const { technique, muscle_image_url, execution_video_url } = req.body;

    // technique should be an array, but we store it as JSON string
    const techniqueJson = Array.isArray(technique) ? JSON.stringify(technique) : JSON.stringify([]);

    db.run(`INSERT INTO exercise_details (title, slug, technique, muscle_image_url, execution_video_url)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(title) DO UPDATE SET
                technique = excluded.technique,
                muscle_image_url = excluded.muscle_image_url,
                execution_video_url = excluded.execution_video_url`,
        [exerciseName, exerciseName.toLowerCase().replace(/[^a-z0-9]/g, '-'), techniqueJson, muscle_image_url, execution_video_url],
        function (err) {
            if (err) {
                console.error("[DB] Update Error:", err.message);
                return res.status(500).json({ error: "No se pudo actualizar la información técnica." });
            }
            res.json({ success: true, message: "Detalles actualizados correctamente." });
        }
    );
});

module.exports = router;
