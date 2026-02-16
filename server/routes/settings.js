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
    const { hevy_api_key, openai_api_key, age, gender, height, goal } = req.body;

    const sql = `
    UPDATE user_settings 
    SET hevy_api_key = ?, 
        openai_api_key = ?, 
        age = ?, 
        gender = ?, 
        height = ?, 
        goal = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `;

    db.run(sql, [hevy_api_key, openai_api_key, age, gender, height, goal], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Settings updated successfully', changes: this.changes });
    });
});

// RESET ALL DATA
router.delete('/reset', (req, res) => {
    db.serialize(() => {
        db.run('DELETE FROM user_settings');
        db.run('INSERT INTO user_settings (id) VALUES (1)');
        db.run('DELETE FROM body_measurements');
        db.run('DELETE FROM workouts');
        db.run('DELETE FROM routine_folders');
        db.run('DELETE FROM routines');
        db.run('DELETE FROM exercise_details');
        db.run('DELETE FROM exercise_translations');
    });

    res.json({ message: 'All data has been reset.' });
});

module.exports = router;
