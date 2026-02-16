const { GoogleGenerativeAI } = require("@google/generative-ai");
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'hevy_dash.db');
const db = new sqlite3.Database(dbPath);

db.get('SELECT openai_api_key FROM user_settings WHERE id = 1', async (err, row) => {
    if (err || !row || !row.openai_api_key) {
        console.error("API Key not found");
        process.exit(1);
    }
    const apiKey = row.openai_api_key;
    const genAI = new GoogleGenerativeAI(apiKey);

    // Listing models is not direct in this SDK version as a simple method sometimes
    // But we can try a few variations
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
        "gemini-pro"
    ];

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("test");
            console.log(`Model ${modelName}: SUCCESS`);
        } catch (e) {
            console.log(`Model ${modelName}: FAILED - ${e.message}`);
        }
    }
    process.exit(0);
});
