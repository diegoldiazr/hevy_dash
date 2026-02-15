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

const getApiKey = () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT openai_api_key FROM user_settings WHERE id = 1', (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.openai_api_key : null);
        });
    });
};

const detectProvider = (apiKey) => {
    if (apiKey.startsWith('sk-')) {
        // Simple detection: OpenAI keys typically start with sk-. 
        // Note: Grok (xAI) also uses sk- sometimes, but let's assume OpenAI default for sk-
        // or check if it's explicitly xAI. xAI often starts with xai-
        return 'openai';
    }
    if (apiKey.startsWith('xai-')) {
        return 'grok';
    }
    // Gemini keys don't always have a strict prefix but often look like AIza...
    // If it doesn't match above, we'll try Gemini as a fallback or check pattern
    if (apiKey.length > 30 && (apiKey.startsWith('AIza') || !apiKey.includes('-'))) {
        return 'gemini';
    }

    // Default fallback if we can't be sure
    return 'openai';
};

const chat = async (message, context = []) => {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('AI API Key not found in settings');

    const provider = detectProvider(apiKey);
    console.log(`[AI] Detected provider: ${provider}`);

    if (provider === 'gemini') {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const systemPrompt = "Eres un experto entrenador de fitness especializado en entrenamiento de fuerza y culturismo. Analizas datos de entrenamiento y das consejos accionables. Usa los datos del usuario (edad, altura, peso, medidas) para dar feedback preciso. Sé conciso y motivador. Responde siempre en español.";

            const model = genAI.getGenerativeModel({
                model: "gemini-pro",
                systemInstruction: systemPrompt
            });

            // Gemini history must alternate User/Model and MUST start with User.
            let history = context
                .map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

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

            const result = await chatSession.sendMessage(message);
            const response = await result.response;
            return { role: 'assistant', content: response.text() };
        } catch (error) {
            console.error("Gemini Error:", error.message);
            throw new Error(`Gemini AI Error: ${error.message}`);
        }
    } else {
        // OpenAI or Grok (since Grok is OpenAI compatible)
        const baseUrl = provider === 'grok' ? "https://api.x.ai/v1" : undefined;

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

            const model = provider === 'grok' ? "grok-2" : "gpt-3.5-turbo";

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
