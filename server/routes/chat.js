const express = require('express');
const router = express.Router();
const aiService = require('../services/ai');

router.post('/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const response = await aiService.chat(message, context || []);
        res.json({ message: response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
