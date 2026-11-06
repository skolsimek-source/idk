import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 
  initDB, hashPassword, verifyPassword, generateToken, 
  findUserByEmail, createUser, createSession, findSessionWithUser,
  deleteSession, getUserTasks, createTask, updateTask, deleteTask,
  saveTrackingSession, getUserStats, seedTasksForUser
} from './db.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database & Default Demo User
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
    const session = findSessionWithUser(token, now);
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
    const demoUser = findUserByEmail('demo@focusflow.app');
    if (demoUser) {
      req.user = { id: demoUser.id, email: demoUser.email, name: demoUser.name };
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
    const existing = findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'Účet s tímto emailem již existuje.' });
    }

    const userId = `user-${Date.now()}`;
    const { hash, salt } = hashPassword(password);
    const createdAt = new Date().toISOString();

    createUser({
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      passwordHash: hash,
      salt: salt,
      createdAt
    });

    // Create session (valid 30 days)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    createSession(token, userId, expiresAt);

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
    const user = findUserByEmail(cleanEmail);
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
    createSession(token, user.id, expiresAt);

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
    deleteSession(req.user.token);
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
    engine: 'Node.js Full-Stack Storage',
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
    const tasks = getUserTasks(req.user.id);
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

    const createdTask = createTask({
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
    });

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
    updateTask(id, userId, req.body);
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
    deleteTask(id, userId);
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

    if (!req.body.preCheckIn) {
      return res.status(400).json({ error: 'Chybí data fáze PŘED (check-in)' });
    }

    saveTrackingSession(taskId, userId, req.body);
    res.json({ success: true, taskId });
  } catch (err) {
    console.error('Error saving tracking session:', err);
    res.status(500).json({ error: 'Chyba při ukládání měření', details: err.message });
  }
});

// Aggregate Statistics for user
app.get('/api/stats', optionalAuth, (req, res) => {
  try {
    const stats = getUserStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error('Error calculating stats:', err);
    res.status(500).json({ error: 'Chyba při výpočtu statistik' });
  }
});

// Reset user's tasks to default demo data
app.post('/api/reset', optionalAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const tasks = getUserTasks(userId);
    tasks.forEach(t => deleteTask(t.id, userId));
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
  console.log(`🚀 FocusFlow Full-Stack Server running at http://0.0.0.0:${PORT}`);
});
