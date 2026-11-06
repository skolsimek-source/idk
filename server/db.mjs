import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'focusflow.sqlite');

export const db = new DatabaseSync(dbPath);

// Crypto helpers for authentication
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return checkHash === hash;
}

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Initialize database schema
export function initDB() {
  db.exec(`PRAGMA foreign_keys = ON;`);

  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      salt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // 2. Sessions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // 3. Tasks Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      userId TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      scheduledDate TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      estimatedDurationMinutes INTEGER NOT NULL,
      reminderMinutesBefore INTEGER DEFAULT 15,
      status TEXT DEFAULT 'scheduled',
      createdAt TEXT NOT NULL
    );
  `);

  // Migrate tasks table if userId column is missing
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(tasks)`).all();
    const hasUserId = tableInfo.some(col => col.name === 'userId');
    if (!hasUserId) {
      db.exec(`ALTER TABLE tasks ADD COLUMN userId TEXT REFERENCES users(id) ON DELETE CASCADE;`);
    }
  } catch (e) {
    // Column might already exist
  }

  // 4. Tracking Sessions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracking_sessions (
      id TEXT PRIMARY KEY,
      taskId TEXT UNIQUE NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      preEnergyLevel INTEGER,
      preMood TEXT,
      preIntentions TEXT,
      startedCheckInAt TEXT,
      actualStartTime TEXT NOT NULL,
      actualEndTime TEXT,
      actualDurationSeconds INTEGER DEFAULT 0,
      postCompletedAt TEXT,
      postFocusRating INTEGER,
      postEnergyLevelAfter INTEGER,
      postMoodAfter TEXT,
      postHowItWent TEXT,
      postIsGoalAchieved INTEGER DEFAULT 1,
      timeDifferenceMinutes INTEGER DEFAULT 0
    );
  `);

  // Ensure default demo user exists
  seedDemoUserAndTasks();
}

export function seedDemoUserAndTasks() {
  const findDemo = db.prepare('SELECT id FROM users WHERE email = ?');
  let demoUser = findDemo.get('demo@focusflow.app');

  if (!demoUser) {
    const { hash, salt } = hashPassword('password123');
    const demoId = 'user-demo-1';
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, name, passwordHash, salt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(
      demoId,
      'demo@focusflow.app',
      'Alex Demo',
      hash,
      salt,
      new Date().toISOString()
    );
    demoUser = { id: demoId };
  }

  // Check if demo user has tasks
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE userId = ?');
  const result = countStmt.get(demoUser.id);
  if (result.count === 0) {
    seedTasksForUser(demoUser.id);
  }
}

export function seedTasksForUser(userId) {
  const today = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const nextHour = (today.getHours() + 1) % 24;
  const nextTime = `${pad(nextHour)}:00`;
  const nextEndTime = `${pad(nextHour + 1)}:30`;

  const insertTask = db.prepare(`
    INSERT INTO tasks (id, userId, title, description, category, scheduledDate, startTime, endTime, estimatedDurationMinutes, reminderMinutesBefore, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTracking = db.prepare(`
    INSERT INTO tracking_sessions (
      id, taskId, preEnergyLevel, preMood, preIntentions, startedCheckInAt,
      actualStartTime, actualEndTime, actualDurationSeconds,
      postCompletedAt, postFocusRating, postEnergyLevelAfter, postMoodAfter,
      postHowItWent, postIsGoalAchieved, timeDifferenceMinutes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Task 1: Completed morning task
  insertTask.run(
    `task-1-${Date.now()}`,
    userId,
    'Ranní revize cílů a Inbox Zero',
    'Projít backlog a nastavit priority dne',
    'work',
    todayStr,
    '08:30',
    '09:15',
    45,
    10,
    'completed',
    new Date(Date.now() - 3600000 * 4).toISOString()
  );

  const task1Id = db.prepare('SELECT id FROM tasks WHERE userId = ? AND title LIKE ?').get(userId, 'Ranní revize%').id;

  insertTracking.run(
    `track-1-${Date.now()}`,
    task1Id,
    8,
    'energized',
    'Vyčistit schránku a seřadit úkoly na dnešek bez prokrastinace.',
    new Date(Date.now() - 3600000 * 3.5).toISOString(),
    new Date(Date.now() - 3600000 * 3.5).toISOString(),
    new Date(Date.now() - 3600000 * 2.8).toISOString(),
    42 * 60,
    new Date(Date.now() - 3600000 * 2.8).toISOString(),
    9,
    7,
    'focused',
    'Všechny kritické emaily vyřešeny o 3 minuty dříve, než bylo v plánu.',
    1,
    -3
  );

  // Task 2: Upcoming task
  insertTask.run(
    `task-2-${Date.now()}`,
    userId,
    'Návrh komponent a responzivního UI',
    'Optimalizace layoutu a testování přihlašovacího systému',
    'creative',
    todayStr,
    nextTime,
    nextEndTime,
    90,
    15,
    'scheduled',
    new Date().toISOString()
  );

  // Task 3: Health
  insertTask.run(
    `task-3-${Date.now()}`,
    userId,
    'Kardio cvičení & protažení páteře',
    'Rozcvička a krátký běh pro obnovení energie',
    'health',
    todayStr,
    '17:30',
    '18:15',
    45,
    15,
    'scheduled',
    new Date().toISOString()
  );

  // Task 4: Study
  insertTask.run(
    `task-4-${Date.now()}`,
    userId,
    'Studium autentizace a bezpečnostních principů',
    'Token sessions, scrypt/PBKDF2 a bezpečnost hesel',
    'study',
    todayStr,
    '19:30',
    '20:30',
    60,
    10,
    'scheduled',
    new Date().toISOString()
  );
}

// Helper to format task row + tracking row into TypeScript-compatible Task object
export function formatTaskRow(row) {
  const task = {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description || undefined,
    category: row.category,
    scheduledDate: row.scheduledDate,
    startTime: row.startTime,
    endTime: row.endTime,
    estimatedDurationMinutes: row.estimatedDurationMinutes,
    reminderMinutesBefore: row.reminderMinutesBefore,
    status: row.status,
    createdAt: row.createdAt,
  };

  if (row.actualStartTime) {
    task.trackingData = {
      preCheckIn: {
        energyLevel: row.preEnergyLevel,
        mood: row.preMood,
        intentions: row.preIntentions,
        startedCheckInAt: row.startedCheckInAt,
      },
      actualStartTime: row.actualStartTime,
      actualEndTime: row.actualEndTime,
      actualDurationSeconds: row.actualDurationSeconds,
      postReflection: row.postCompletedAt ? {
        completedAt: row.postCompletedAt,
        focusRating: row.postFocusRating,
        energyLevelAfter: row.postEnergyLevelAfter,
        moodAfter: row.postMoodAfter,
        howItWent: row.postHowItWent,
        isGoalAchieved: Boolean(row.postIsGoalAchieved),
        timeDifferenceMinutes: row.timeDifferenceMinutes,
      } : undefined
    };
  }

  return task;
}
