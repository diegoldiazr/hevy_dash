const { Configuration, OpenAIApi } = require("openai");
const db = require('../db');

const getApiKey = () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT openai_api_key FROM user_settings WHERE id = 1', (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.openai_api_key : null);
        });
    });
};

const chat = async (message, context = []) => {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('OpenAI API Key not found');

    const configuration = new Configuration({
        apiKey: apiKey,
    });
    const openai = new OpenAIApi(configuration);

    try {
        const messages = [
            { role: "system", content: "You are an expert fitness coach. specific to strength training and bodybuilding. You analyze workout data and provide actionable advice to help the user improve their physique and strength. You have access to their stats and workout history." },
            ...context,
            { role: "user", content: message }
        ];

        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messages,
        });

        return completion.data.choices[0].message;
    } catch (error) {
        console.error("OpenAI Error:", error.response ? error.response.data : error.message);
        throw new Error("Failed to get response from Coach AI");
    }
};

module.exports = {
    chat
};
