const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
// In Docker, we can override this with DATA_DIR environment variable to point to a volume
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');

console.log(`[DB] Using data directory: ${dataDir}`);

if (!fs.existsSync(dataDir)) {
  console.log(`[DB] Creating data directory: ${dataDir}`);
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.error(`[DB] Failed to create data directory: ${err.message}`);
  }
}

const dbPath = path.join(dataDir, 'hevy_dash.db');
console.log(`[DB] SQLite database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`[DB] CRITICAL: Could not connect to database at ${dbPath}`, err);
  } else {
    console.log(`[DB] Successfully connected to SQLite database`);
    initDb();
  }
});

db.dataDir = dataDir;

const initDb = () => {
  db.serialize(() => {
    // User Settings Table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        hevy_api_key TEXT,
        openai_api_key TEXT,
        age INTEGER,
        gender TEXT,
        height REAL,
        goal TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      // Ensure columns exist (for existing DBs)
      db.run("ALTER TABLE user_settings ADD COLUMN height REAL", (err) => { });
      db.run("ALTER TABLE user_settings ADD COLUMN ai_provider TEXT DEFAULT 'openai'", (err) => { });
    });

    db.run(`INSERT OR IGNORE INTO user_settings (id) VALUES (1)`);

    // Body Measurements Table
    db.run(`
      CREATE TABLE IF NOT EXISTS body_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE,
        weight REAL,
        chest REAL,
        neck REAL,
        waist REAL,
        hips REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Workouts Table
    db.run(`
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        title TEXT,
        start_time DATETIME,
        end_time DATETIME,
        volume_kg REAL,
        raw_data JSON,
        muscle_map JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      db.run("ALTER TABLE workouts ADD COLUMN muscle_map JSON", (err) => { });
    });

    // Routine Folders Table
    db.run(`
      CREATE TABLE IF NOT EXISTS routine_folders (
        id INTEGER PRIMARY KEY,
        title TEXT,
        folder_index INTEGER,
        created_at DATETIME,
        updated_at DATETIME
      )
    `);

    // Routines Table
    db.run(`
      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY,
        title TEXT,
        folder_id INTEGER,
        updated_at DATETIME,
        raw_data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exercise Details Table (Scraped info)
    db.run(`
      CREATE TABLE IF NOT EXISTS exercise_details (
        title TEXT PRIMARY KEY,
        slug TEXT,
        technique TEXT, -- JSON array of steps
        muscle_image_url TEXT,
        execution_video_url TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exercise Translations Table
    db.run(`
      CREATE TABLE IF NOT EXISTS exercise_translations (
        title_en TEXT PRIMARY KEY,
        title_es TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
};

module.exports = db;
