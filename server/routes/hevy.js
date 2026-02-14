const express = require('express');
const router = express.Router();
const hevyService = require('../services/hevy');

router.get('/validate', async (req, res) => {
    try {
        const apiKey = req.headers['api-key']; // or from query/body for initial check
        if (!apiKey) return res.status(400).json({ valid: false, error: 'API Key missing' });

        const isValid = await hevyService.validateApiKey(apiKey);
        res.json({ valid: isValid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/sync', async (req, res) => {
    try {
        const result = await hevyService.syncWorkouts();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/workouts', async (req, res) => {
    try {
        const { page, pageSize } = req.query;
        // In a real app, we'd fetch from DB first, but for now we might pass through or stub
        // For this task, let's assume we fetch from Hevy directly if DB is empty or just use the service
        const data = await hevyService.fetchWorkouts(page, pageSize);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
