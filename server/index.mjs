import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 
  db, initDB, hashPassword, verifyPassword, generateToken, 
  seedTasksForUser, formatTaskRow 
} from './db.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite tables & demo account
initDB();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Chybí autorizační token. Přihlaste se prosím.' });
  }

  const token = authHeader.substring(7);
  const now = new Date().toISOString();

  try {
    const stmt = db.prepare(`
      SELECT s.token, u.id as userId, u.email, u.name
      FROM sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.token = ? AND s.expiresAt > ?
    `);

    const session = stmt.get(token, now);
    if (!session) {
      return res.status(401).json({ error: 'Relace vypršela nebo je neplatná.' });
    }

    req.user = {
      id: session.userId,
      email: session.email,
      name: session.name,
      token: session.token
    };

    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Chyba ověření přihlášení' });
  }
}

// Optional Auth (for guest endpoints or backward compatibility)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Fallback to default demo user if guest
    const demoUser = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get('demo@focusflow.app');
    if (demoUser) {
      req.user = demoUser;
    }
    return next();
  }
  authenticate(req, res, next);
}

// ==========================================
// AUTH API ENDPOINTS
// ==========================================

// Register new user
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Vyplňte jméno, email i heslo.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'Účet s tímto emailem již existuje.' });
    }

    const userId = `user-${Date.now()}`;
    const { hash, salt } = hashPassword(password);
    const createdAt = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, name, passwordHash, salt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(userId, cleanEmail, name.trim(), hash, salt, createdAt);

    // Create session (valid 30 days)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    const insertSession = db.prepare(`
      INSERT INTO sessions (token, userId, expiresAt, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    insertSession.run(token, userId, expiresAt, createdAt);

    // Seed starter goals for the new user
    seedTasksForUser(userId);

    res.status(201).json({
      user: { id: userId, email: cleanEmail, name: name.trim() },
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registrace selhala', details: err.message });
  }
});

// Login existing user
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Zadejte email a heslo.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Nesprávný email nebo heslo.' });
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Nesprávný email nebo heslo.' });
    }

    // Create session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    const insertSession = db.prepare(`
      INSERT INTO sessions (token, userId, expiresAt, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    insertSession.run(token, user.id, expiresAt, new Date().toISOString());

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Přihlášení se nezdařilo' });
  }
});

// Get current logged-in user profile
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Logout (destroy session token)
app.post('/api/auth/logout', authenticate, (req, res) => {
  try {
    const deleteSession = db.prepare('DELETE FROM sessions WHERE token = ?');
    deleteSession.run(req.user.token);
    res.json({ success: true, message: 'Úspěšně odhlášeno.' });
  } catch (err) {
    res.status(500).json({ error: 'Chyba při odhlašování' });
  }
});

// ==========================================
// SYSTEM & HEALTH API
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'Node.js + SQLite',
    authSystem: 'PBKDF2 Sessions Token',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// TASKS API (USER-ISOLATED)
// ==========================================

// Get all tasks for current authenticated user
app.get('/api/tasks', optionalAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const stmt = db.prepare(`
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

    const rows = stmt.all(userId);
    const tasks = rows.map(formatTaskRow);
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Nepodařilo se načíst cíle', details: err.message });
  }
});

// Create new task for user
app.post('/api/tasks', optionalAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      category = 'work',
      scheduledDate,
      startTime,
      endTime,
      estimatedDurationMinutes = 60,
      reminderMinutesBefore = 15
    } = req.body;

    if (!title || !scheduledDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'Chybí povinná pole úkolu' });
    }

    const id = `task-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const status = 'scheduled';

    const stmt = db.prepare(`
      INSERT INTO tasks (
        id, userId, title, description, category, scheduledDate,
        startTime, endTime, estimatedDurationMinutes, reminderMinutesBefore,
        status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      title,
      description || null,
      category,
      scheduledDate,
      startTime,
      endTime,
      Number(estimatedDurationMinutes),
      Number(reminderMinutesBefore),
      status,
      createdAt
    );

    const createdTask = {
      id,
      userId,
      title,
      description: description || undefined,
      category,
      scheduledDate,
      startTime,
      endTime,
      estimatedDurationMinutes: Number(estimatedDurationMinutes),
      reminderMinutesBefore: Number(reminderMinutesBefore),
      status,
      createdAt
    };

    res.status(201).json(createdTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Chyba při ukládání cíle', details: err.message });
  }
});

// Update task
app.put('/api/tasks/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      category,
      scheduledDate,
      startTime,
      endTime,
      estimatedDurationMinutes,
      reminderMinutesBefore,
      status
    } = req.body;

    const stmt = db.prepare(`
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
      title,
      description,
      category,
      scheduledDate,
      startTime,
      endTime,
      estimatedDurationMinutes,
      reminderMinutesBefore,
      status,
      id,
      userId
    );

    res.json({ success: true, id });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Chyba při aktualizaci cíle' });
  }
});

// Delete task
app.delete('/api/tasks/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ? AND userId = ?');
    stmt.run(id, userId);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Chyba při mazání cíle' });
  }
});

// Record tracking session (Pre -> During -> Post)
app.post('/api/tasks/:id/track', optionalAuth, (req, res) => {
  try {
    const { id: taskId } = req.params;
    const userId = req.user.id;

    // Verify task ownership
    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND userId = ?').get(taskId, userId);
    if (!task) {
      return res.status(404).json({ error: 'Cíl nenalezen nebo k němu nemáte oprávnění.' });
    }

    const { preCheckIn, actualStartTime, actualEndTime, actualDurationSeconds, postReflection } = req.body;

    if (!preCheckIn) {
      return res.status(400).json({ error: 'Chybí data fáze PŘED (check-in)' });
    }

    const sessionId = `track-${Date.now()}`;

    // Upsert tracking session
    const deleteOld = db.prepare('DELETE FROM tracking_sessions WHERE taskId = ?');
    deleteOld.run(taskId);

    const insertStmt = db.prepare(`
      INSERT INTO tracking_sessions (
        id, taskId, preEnergyLevel, preMood, preIntentions, startedCheckInAt,
        actualStartTime, actualEndTime, actualDurationSeconds,
        postCompletedAt, postFocusRating, postEnergyLevelAfter, postMoodAfter,
        postHowItWent, postIsGoalAchieved, timeDifferenceMinutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      sessionId,
      taskId,
      preCheckIn.energyLevel || 5,
      preCheckIn.mood || 'focused',
      preCheckIn.intentions || '',
      preCheckIn.startedCheckInAt || new Date().toISOString(),
      actualStartTime || new Date().toISOString(),
      actualEndTime || new Date().toISOString(),
      actualDurationSeconds || 0,
      postReflection?.completedAt || new Date().toISOString(),
      postReflection?.focusRating || 5,
      postReflection?.energyLevelAfter || 5,
      postReflection?.moodAfter || 'focused',
      postReflection?.howItWent || '',
      postReflection?.isGoalAchieved ? 1 : 0,
      postReflection?.timeDifferenceMinutes || 0
    );

    // Update task status to completed
    const updateTask = db.prepare("UPDATE tasks SET status = 'completed' WHERE id = ?");
    updateTask.run(taskId);

    res.json({ success: true, taskId, sessionId });
  } catch (err) {
    console.error('Error saving tracking session:', err);
    res.status(500).json({ error: 'Chyba při ukládání měření', details: err.message });
  }
});

// Aggregate Statistics for user
app.get('/api/stats', optionalAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const totalStmt = db.prepare(`
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

    res.json({
      totalCompleted: stats.totalCompleted,
      totalSeconds: stats.totalSeconds,
      avgPreEnergy: Number(stats.avgPreEnergy.toFixed(1)),
      avgPostEnergy: Number(stats.avgPostEnergy.toFixed(1)),
      avgFocus: Number(stats.avgFocus.toFixed(1)),
      successRate: stats.totalCompleted > 0 
        ? Math.round((stats.achievedGoalsCount / stats.totalCompleted) * 100) 
        : 0
    });
  } catch (err) {
    console.error('Error calculating stats:', err);
    res.status(500).json({ error: 'Chyba při výpočtu statistik' });
  }
});

// Reset user's tasks to default demo data
app.post('/api/reset', optionalAuth, (req, res) => {
  try {
    const userId = req.user.id;
    db.prepare('DELETE FROM tasks WHERE userId = ?').run(userId);
    seedTasksForUser(userId);
    res.json({ success: true, message: 'Data uživatele byla resetována.' });
  } catch (err) {
    console.error('Error resetting user tasks:', err);
    res.status(500).json({ error: 'Chyba při resetování dat' });
  }
});

// Serve frontend static build files (Production)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback all other routes to index.html for SPA client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FocusFlow Full-Stack Server with Auth running at http://0.0.0.0:${PORT}`);
  console.log(`📁 SQLite Database: ${path.join(__dirname, 'focusflow.sqlite')}`);
});
