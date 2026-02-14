const express = require('express');
const router = express.Router();
const db = require('../db');

// GET settings
router.get('/', (req, res) => {
    db.get('SELECT * FROM user_settings WHERE id = 1', (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row);
    });
});

// UPDATE settings
router.post('/', (req, res) => {
    const { hevy_api_key, openai_api_key, age, gender, weight, goal } = req.body;

    const sql = `
    UPDATE user_settings 
    SET hevy_api_key = ?, 
        openai_api_key = ?, 
        age = ?, 
        gender = ?, 
        weight = ?, 
        goal = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `;

    db.run(sql, [hevy_api_key, openai_api_key, age, gender, weight, goal], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Settings updated successfully', changes: this.changes });
    });
});

module.exports = router;
