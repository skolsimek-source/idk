import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'focusflow.sqlite');
const jsonDbPath = path.join(__dirname, 'focusflow-data.json');

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

// Check if node:sqlite is available
let sqliteDb = null;
let useSqlite = false;

try {
  const sqliteModule = await import('node:sqlite');
  if (sqliteModule && sqliteModule.DatabaseSync) {
    sqliteDb = new sqliteModule.DatabaseSync(dbPath);
    useSqlite = true;
    console.log('✅ [Database] Initialized native SQLite database:', dbPath);
  }
} catch (e) {
  console.log('ℹ️ [Database] node:sqlite module not enabled. Using robust JSON file database storage.');
  useSqlite = false;
}

// -------------------------------------------------------------
// JSON File Store Fallback (When --experimental-sqlite is not set)
// -------------------------------------------------------------
function readJsonDb() {
  try {
    if (fs.existsSync(jsonDbPath)) {
      const raw = fs.readFileSync(jsonDbPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading JSON DB:', err);
  }
  return { users: [], sessions: [], tasks: [], tracking_sessions: [] };
}

function writeJsonDb(data) {
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing JSON DB:', err);
  }
}

// -------------------------------------------------------------
// Initialization & Seeding
// -------------------------------------------------------------
export function initDB() {
  if (useSqlite) {
    sqliteDb.exec(`PRAGMA foreign_keys = ON;`);
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        passwordHash TEXT NOT NULL,
        salt TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

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
  }

  // Ensure default demo user exists
  ensureDemoUser();
}

function ensureDemoUser() {
  const demoEmail = 'demo@focusflow.app';
  const existing = findUserByEmail(demoEmail);

  if (!existing) {
    const { hash, salt } = hashPassword('password123');
    const demoId = 'user-demo-1';
    createUser({
      id: demoId,
      email: demoEmail,
      name: 'Alex Demo',
      passwordHash: hash,
      salt: salt,
      createdAt: new Date().toISOString()
    });
    seedTasksForUser(demoId);
  }
}

// -------------------------------------------------------------
// Database Operations Abstraction (Dual-Mode: SQLite or JSON)
// -------------------------------------------------------------

export function findUserByEmail(email) {
  const cleanEmail = email.trim().toLowerCase();
  if (useSqlite) {
    return sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  } else {
    const data = readJsonDb();
    return data.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
  }
}

export function createUser(user) {
  if (useSqlite) {
    const stmt = sqliteDb.prepare(`
      INSERT INTO users (id, email, name, passwordHash, salt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(user.id, user.email, user.name, user.passwordHash, user.salt, user.createdAt);
  } else {
    const data = readJsonDb();
    data.users.push(user);
    writeJsonDb(data);
  }
}

export function createSession(token, userId, expiresAt) {
  const createdAt = new Date().toISOString();
  if (useSqlite) {
    const stmt = sqliteDb.prepare(`
      INSERT INTO sessions (token, userId, expiresAt, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(token, userId, expiresAt, createdAt);
  } else {
    const data = readJsonDb();
    data.sessions.push({ token, userId, expiresAt, createdAt });
    writeJsonDb(data);
  }
}

export function findSessionWithUser(token, now) {
  if (useSqlite) {
    const stmt = sqliteDb.prepare(`
      SELECT s.token, u.id as userId, u.email, u.name
      FROM sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.token = ? AND s.expiresAt > ?
    `);
    return stmt.get(token, now) || null;
  } else {
    const data = readJsonDb();
    const session = data.sessions.find(s => s.token === token && s.expiresAt > now);
    if (!session) return null;
    const user = data.users.find(u => u.id === session.userId);
    if (!user) return null;
    return { token: session.token, userId: user.id, email: user.email, name: user.name };
  }
}

export function deleteSession(token) {
  if (useSqlite) {
    sqliteDb.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  } else {
    const data = readJsonDb();
    data.sessions = data.sessions.filter(s => s.token !== token);
    writeJsonDb(data);
  }
}

export function getUserTasks(userId) {
  if (useSqlite) {
    const stmt = sqliteDb.prepare(`
      SELECT 
        t.id, t.userId, t.title, t.description, t.category, t.scheduledDate,
        t.startTime, t.endTime, t.estimatedDurationMinutes,
        t.reminderMinutesBefore, t.status, t.createdAt,
        s.preEnergyLevel, s.preMood, s.preIntentions, s.startedCheckInAt,
        s.actualStartTime, s.actualEndTime, s.actualDurationSeconds,
        s.postCompletedAt, s.postFocusRating, s.postEnergyLevelAfter,
        s.postMoodAfter, s.postHowItWent, s.postIsGoalAchieved, s.timeDifferenceMinutes
      FROM tasks t
      LEFT JOIN tracking_sessions s ON t.id = s.taskId
      WHERE t.userId = ?
      ORDER BY t.scheduledDate DESC, t.startTime ASC
    `);
    return stmt.all(userId).map(formatTaskRow);
  } else {
    const data = readJsonDb();
    const userTasks = data.tasks.filter(t => t.userId === userId);
    return userTasks.map(t => {
      const s = data.tracking_sessions.find(tr => tr.taskId === t.id);
      return formatTaskRow({ ...t, ...(s || {}) });
    }).sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || a.startTime.localeCompare(b.startTime));
  }
}

export function createTask(task) {
  if (useSqlite) {
    const stmt = sqliteDb.prepare(`
      INSERT INTO tasks (
        id, userId, title, description, category, scheduledDate,
        startTime, endTime, estimatedDurationMinutes, reminderMinutesBefore,
        status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id, task.userId, task.title, task.description || null, task.category,
      task.scheduledDate, task.startTime, task.endTime,
      task.estimatedDurationMinutes, task.reminderMinutesBefore,
      task.status, task.createdAt
    );
  } else {
    const data = readJsonDb();
    data.tasks.unshift(task);
    writeJsonDb(data);
  }
  return task;
}

export function updateTask(id, userId, updates) {
  if (useSqlite) {
    const stmt = sqliteDb.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        scheduledDate = COALESCE(?, scheduledDate),
        startTime = COALESCE(?, startTime),
        endTime = COALESCE(?, endTime),
        estimatedDurationMinutes = COALESCE(?, estimatedDurationMinutes),
        reminderMinutesBefore = COALESCE(?, reminderMinutesBefore),
        status = COALESCE(?, status)
      WHERE id = ? AND userId = ?
    `);
    stmt.run(
      updates.title, updates.description, updates.category,
      updates.scheduledDate, updates.startTime, updates.endTime,
      updates.estimatedDurationMinutes, updates.reminderMinutesBefore,
      updates.status, id, userId
    );
  } else {
    const data = readJsonDb();
    const idx = data.tasks.findIndex(t => t.id === id && t.userId === userId);
    if (idx !== -1) {
      data.tasks[idx] = { ...data.tasks[idx], ...updates };
      writeJsonDb(data);
    }
  }
}

export function deleteTask(id, userId) {
  if (useSqlite) {
    sqliteDb.prepare('DELETE FROM tasks WHERE id = ? AND userId = ?').run(id, userId);
  } else {
    const data = readJsonDb();
    data.tasks = data.tasks.filter(t => !(t.id === id && t.userId === userId));
    data.tracking_sessions = data.tracking_sessions.filter(s => s.taskId !== id);
    writeJsonDb(data);
  }
}

export function saveTrackingSession(taskId, userId, sessionData) {
  const { preCheckIn, actualStartTime, actualEndTime, actualDurationSeconds, postReflection } = sessionData;
  const sessionId = `track-${Date.now()}`;

  const row = {
    id: sessionId,
    taskId,
    preEnergyLevel: preCheckIn.energyLevel || 5,
    preMood: preCheckIn.mood || 'focused',
    preIntentions: preCheckIn.intentions || '',
    startedCheckInAt: preCheckIn.startedCheckInAt || new Date().toISOString(),
    actualStartTime: actualStartTime || new Date().toISOString(),
    actualEndTime: actualEndTime || new Date().toISOString(),
    actualDurationSeconds: actualDurationSeconds || 0,
    postCompletedAt: postReflection?.completedAt || new Date().toISOString(),
    postFocusRating: postReflection?.focusRating || 5,
    postEnergyLevelAfter: postReflection?.energyLevelAfter || 5,
    postMoodAfter: postReflection?.moodAfter || 'focused',
    postHowItWent: postReflection?.howItWent || '',
    postIsGoalAchieved: postReflection?.isGoalAchieved ? 1 : 0,
    timeDifferenceMinutes: postReflection?.timeDifferenceMinutes || 0
  };

  if (useSqlite) {
    sqliteDb.prepare('DELETE FROM tracking_sessions WHERE taskId = ?').run(taskId);
    const insertStmt = sqliteDb.prepare(`
      INSERT INTO tracking_sessions (
        id, taskId, preEnergyLevel, preMood, preIntentions, startedCheckInAt,
        actualStartTime, actualEndTime, actualDurationSeconds,
        postCompletedAt, postFocusRating, postEnergyLevelAfter, postMoodAfter,
        postHowItWent, postIsGoalAchieved, timeDifferenceMinutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(
      row.id, row.taskId, row.preEnergyLevel, row.preMood, row.preIntentions,
      row.startedCheckInAt, row.actualStartTime, row.actualEndTime, row.actualDurationSeconds,
      row.postCompletedAt, row.postFocusRating, row.postEnergyLevelAfter, row.postMoodAfter,
      row.postHowItWent, row.postIsGoalAchieved, row.timeDifferenceMinutes
    );
    sqliteDb.prepare("UPDATE tasks SET status = 'completed' WHERE id = ? AND userId = ?").run(taskId, userId);
  } else {
    const data = readJsonDb();
    data.tracking_sessions = data.tracking_sessions.filter(s => s.taskId !== taskId);
    data.tracking_sessions.push(row);
    const task = data.tasks.find(t => t.id === taskId && t.userId === userId);
    if (task) task.status = 'completed';
    writeJsonDb(data);
  }
}

export function getUserStats(userId) {
  if (useSqlite) {
    const totalStmt = sqliteDb.prepare(`
      SELECT 
        COUNT(*) as totalCompleted,
        COALESCE(SUM(s.actualDurationSeconds), 0) as totalSeconds,
        COALESCE(AVG(s.preEnergyLevel), 0) as avgPreEnergy,
        COALESCE(AVG(s.postEnergyLevelAfter), 0) as avgPostEnergy,
        COALESCE(AVG(s.postFocusRating), 0) as avgFocus,
        COALESCE(SUM(s.postIsGoalAchieved), 0) as achievedGoalsCount
      FROM tracking_sessions s
      JOIN tasks t ON s.taskId = t.id
      WHERE t.userId = ?
    `);
    const stats = totalStmt.get(userId);
    return {
      totalCompleted: stats.totalCompleted,
      totalSeconds: stats.totalSeconds,
      avgPreEnergy: Number(stats.avgPreEnergy.toFixed(1)),
      avgPostEnergy: Number(stats.avgPostEnergy.toFixed(1)),
      avgFocus: Number(stats.avgFocus.toFixed(1)),
      successRate: stats.totalCompleted > 0 
        ? Math.round((stats.achievedGoalsCount / stats.totalCompleted) * 100) 
        : 0
    };
  } else {
    const data = readJsonDb();
    const userTaskIds = new Set(data.tasks.filter(t => t.userId === userId).map(t => t.id));
    const userSessions = data.tracking_sessions.filter(s => userTaskIds.has(s.taskId));
    const totalCompleted = userSessions.length;

    let totalSeconds = 0;
    let sumPreEnergy = 0;
    let sumPostEnergy = 0;
    let sumFocus = 0;
    let achievedCount = 0;

    userSessions.forEach(s => {
      totalSeconds += s.actualDurationSeconds || 0;
      sumPreEnergy += s.preEnergyLevel || 0;
      sumPostEnergy += s.postEnergyLevelAfter || 0;
      sumFocus += s.postFocusRating || 0;
      if (s.postIsGoalAchieved) achievedCount += 1;
    });

    return {
      totalCompleted,
      totalSeconds,
      avgPreEnergy: totalCompleted > 0 ? Number((sumPreEnergy / totalCompleted).toFixed(1)) : 0,
      avgPostEnergy: totalCompleted > 0 ? Number((sumPostEnergy / totalCompleted).toFixed(1)) : 0,
      avgFocus: totalCompleted > 0 ? Number((sumFocus / totalCompleted).toFixed(1)) : 0,
      successRate: totalCompleted > 0 ? Math.round((achievedCount / totalCompleted) * 100) : 0
    };
  }
}

export function seedTasksForUser(userId) {
  const today = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const nextHour = (today.getHours() + 1) % 24;
  const nextTime = `${pad(nextHour)}:00`;
  const nextEndTime = `${pad(nextHour + 1)}:30`;

  const task1Id = `task-1-${Date.now()}`;
  createTask({
    id: task1Id,
    userId,
    title: 'Ranní revize cílů a Inbox Zero',
    description: 'Projít backlog a nastavit priority dne',
    category: 'work',
    scheduledDate: todayStr,
    startTime: '08:30',
    endTime: '09:15',
    estimatedDurationMinutes: 45,
    reminderMinutesBefore: 10,
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  });

  saveTrackingSession(task1Id, userId, {
    preCheckIn: {
      energyLevel: 8,
      mood: 'energized',
      intentions: 'Vyčistit schránku a seřadit úkoly na dnešek bez prokrastinace.',
      startedCheckInAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    },
    actualStartTime: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    actualEndTime: new Date(Date.now() - 3600000 * 2.8).toISOString(),
    actualDurationSeconds: 42 * 60,
    postReflection: {
      completedAt: new Date(Date.now() - 3600000 * 2.8).toISOString(),
      focusRating: 9,
      energyLevelAfter: 7,
      moodAfter: 'focused',
      howItWent: 'Všechny kritické emaily vyřešeny o 3 minuty dříve, než bylo v plánu.',
      isGoalAchieved: true,
      timeDifferenceMinutes: -3,
    }
  });

  createTask({
    id: `task-2-${Date.now()}`,
    userId,
    title: 'Návrh komponent a responzivního UI',
    description: 'Optimalizace layoutu a testování přihlašovacího systému',
    category: 'creative',
    scheduledDate: todayStr,
    startTime: nextTime,
    endTime: nextEndTime,
    estimatedDurationMinutes: 90,
    reminderMinutesBefore: 15,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  });

  createTask({
    id: `task-3-${Date.now()}`,
    userId,
    title: 'Kardio cvičení & protažení páteře',
    description: 'Rozcvička a krátký běh pro obnovení energie',
    category: 'health',
    scheduledDate: todayStr,
    startTime: '17:30',
    endTime: '18:15',
    estimatedDurationMinutes: 45,
    reminderMinutesBefore: 15,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  });
}

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
