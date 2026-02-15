const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const HEVY_API_BASE = 'https://api.hevyapp.com/v1';

const dbPath = path.join(__dirname, 'data/hevy_dash.db');
const db = new sqlite3.Database(dbPath);

async function inspect() {
    const apiKey = await new Promise((resolve, reject) => {
        db.get('SELECT hevy_api_key FROM user_settings WHERE id = 1', (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.hevy_api_key : null);
        });
    });

    if (!apiKey) {
        console.log('No API Key found');
        return;
    }

    try {
        console.log('--- ROUTINES ---');
        const routinesRes = await axios.get(`${HEVY_API_BASE}/routines`, { headers: { 'api-key': apiKey } });
        const routines = routinesRes.data.routines || [];
        console.log(`Found ${routines.length} routines`);
        if (routines.length > 0) {
            const first = routines[0];
            console.log('Sample Routine Keys:', Object.keys(first));
            console.log('Sample Routine Folder ID:', first.folder_id);
            console.log('Sample Routine Updated At:', first.updated_at);
        }

        console.log('\n--- FOLDERS ---');
        const foldersRes = await axios.get(`${HEVY_API_BASE}/routine_folders`, { headers: { 'api-key': apiKey } });
        const folders = foldersRes.data.routine_folders || [];
        console.log(`Found ${folders.length} folders`);
        if (folders.length > 0) {
            console.log('Sample Folder:', folders[0]);
        }
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error('Response:', e.response.data);
    } finally {
        db.close();
    }
}

inspect();
