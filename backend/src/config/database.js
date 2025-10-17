import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../..");

// Ensure data directory exists
const dataDir = join(projectRoot, "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || "./data/database.sqlite";
const db = new Database(join(projectRoot, dbPath));

// Initialize database schema
const initializeDatabase = () => {
  const createUsersTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      status TEXT NOT NULL CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      emailHash TEXT,
      emailSignature TEXT
    )
  `);

  createUsersTable.run();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const columns = tableInfo.map(col => col.name);

    if (!columns.includes('emailHash')) {
      db.prepare('ALTER TABLE users ADD COLUMN emailHash TEXT').run();
      console.log('Added emailHash column to users table');
    }

    if (!columns.includes('emailSignature')) {
      db.prepare('ALTER TABLE users ADD COLUMN emailSignature TEXT').run();
      console.log('Added emailSignature column to users table');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  console.log("Database initialized successfully");
};

initializeDatabase();

export default db;
