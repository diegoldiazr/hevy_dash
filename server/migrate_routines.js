const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/hevy_dash.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Add columns to routines if they don't exist
    db.run("ALTER TABLE routines ADD COLUMN folder_id INTEGER", (err) => {
        if (err) console.log('folder_id already exists or error:', err.message);
    });
    db.run("ALTER TABLE routines ADD COLUMN updated_at DATETIME", (err) => {
        if (err) console.log('updated_at already exists or error:', err.message);
    });

    // Create routine_folders table
    db.run(`
      CREATE TABLE IF NOT EXISTS routine_folders (
        id INTEGER PRIMARY KEY,
        title TEXT,
        folder_index INTEGER,
        created_at DATETIME,
        updated_at DATETIME
      )
    `);
});

db.close();
