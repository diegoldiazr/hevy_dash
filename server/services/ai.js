const { Configuration, OpenAIApi } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../db');

// Polyfill fetch and related globals for older Node environments or Docker images
if (!global.fetch) {
    const fetch = require('node-fetch');
    global.fetch = fetch;
    global.Headers = fetch.Headers;
    global.Request = fetch.Request;
    global.Response = fetch.Response;
}

const getSettings = () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT openai_api_key, ai_provider FROM user_settings WHERE id = 1', (err, row) => {
            if (err) reject(err);
            else resolve(row || { openai_api_key: null, ai_provider: 'openai' });
        });
    });
};

const detectProvider = (apiKey) => {
    if (apiKey.startsWith('sk-')) {
        return 'openai';
    }
    if (apiKey.startsWith('xai-')) {
        return 'grok';
    }
    if (apiKey.length > 30 && (apiKey.startsWith('AIza') || !apiKey.includes('-'))) {
        return 'gemini';
    }
    return 'openai';
};

const chat = async (message, context = []) => {
    const settings = await getSettings();
    const apiKey = settings.openai_api_key;
    if (!apiKey) throw new Error('AI API Key not found in settings');

    let provider = settings.ai_provider || detectProvider(apiKey);
    console.log(`[AI] Using provider: ${provider}`);

    if (provider === 'gemini') {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const systemPrompt = "Eres un experto entrenador de fitness especializado en entrenamiento de fuerza y culturismo. Analizas datos de entrenamiento y das consejos accionables. Usa los datos del usuario (edad, altura, peso, medidas) para dar feedback preciso. Sé conciso y motivador. Responde siempre en español.";

            const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview"
            });

            // Gemini history must alternate User/Model and MUST start with User.
            let history = context
                .map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

            const fullMessage = `System: Eres un experto entrenador de fitness. Responde siempre en español. \n\nUser: ${message}`;

            // Safety: Ensure history starts with 'user'. If it starts with 'model', remove it.
            if (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }

            const chatSession = model.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 1000,
                },
            });

            const result = await chatSession.sendMessage(fullMessage);
            const response = await result.response;
            return { role: 'assistant', content: response.text() };
        } catch (error) {
            console.error("Gemini Error:", error.message);
            throw new Error(`Gemini AI Error: ${error.message}`);
        }
    } else {
        // OpenAI, Grok, or DeepSeek
        let baseUrl = undefined;
        let model = "gpt-4o-mini";

        if (provider === 'grok') {
            baseUrl = "https://api.x.ai/v1";
            model = "grok-2";
        } else if (provider === 'deepseek') {
            baseUrl = "https://api.deepseek.com";
            model = "deepseek-chat";
        }

        const configuration = new Configuration({
            apiKey: apiKey,
            basePath: baseUrl
        });
        const openai = new OpenAIApi(configuration);

        try {
            const messages = [
                { role: "system", content: "Eres un experto entrenador de fitness especializado en entrenamiento de fuerza y culturismo. Analizas datos de entrenamiento y das consejos accionables. Usa los datos del usuario (edad, altura, peso, medidas) para dar feedback preciso. Sé conciso y motivador. Responde siempre en español." },
                ...context,
                { role: "user", content: message }
            ];

            const completion = await openai.createChatCompletion({
                model: model,
                messages: messages,
            });

            return completion.data.choices[0].message;
        } catch (error) {
            const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`${provider.toUpperCase()} Error:`, errorMsg);
            throw new Error(`Failed to get response from ${provider} AI: ${errorMsg}`);
        }
    }
};

module.exports = {
    chat
};
