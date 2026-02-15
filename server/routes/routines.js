const express = require('express');
const router = express.Router();
const db = require('../db');
const hevyService = require('../services/hevy');
const aiService = require('../services/ai');

// List Routines with Folders
router.get('/', (req, res) => {
    // Fetch Folders
    db.all('SELECT * FROM routine_folders ORDER BY folder_index ASC', (err, folders) => {
        if (err) return res.status(500).json({ error: err.message });

        // Fetch Routines sorted by updated_at (most recent first)
        db.all('SELECT * FROM routines ORDER BY updated_at DESC', (err, routineRows) => {
            if (err) return res.status(500).json({ error: err.message });

            const routines = routineRows.map(row => ({
                ...row,
                raw_data: JSON.parse(row.raw_data)
            }));

            res.json({
                folders: folders,
                routines: routines
            });
        });
    });
});

// Sync Routines
router.post('/sync', async (req, res) => {
    try {
        const result = await hevyService.syncRoutines();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analyze Routine
router.post('/:id/analyze', (req, res) => {
    const routineId = req.params.id;
    db.get('SELECT raw_data FROM routines WHERE id = ?', [routineId], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Routine not found' });

        const routine = JSON.parse(row.raw_data);

        const prompt = `
            Analyze this workout routine: "${routine.title}".
            Exercises: ${routine.exercises.map(e => e.title + ' (' + e.sets.length + ' sets)').join(', ')}.
            
            Provide:
            1. A brief critique (volume, balance).
            2. Suggestions for improvement or variety.
            3. Identify what muscle groups might be lagging in this routine.
            Keep it concise.
        `;

        try {
            const aiResponse = await aiService.chat(prompt);
            res.json({ analysis: aiResponse.content });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

module.exports = router;
