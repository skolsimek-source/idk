import { Task, TaskTrackingSession } from '../types';
import { loadTasks, saveTasks, getInitialTasks } from '../utils/storage';

const API_BASE = '/api';
const TOKEN_KEY = 'focusflow_auth_token_v1';
const USER_KEY = 'focusflow_auth_user_v1';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface BackendStatus {
  connected: boolean;
  engine?: string;
  uptime?: number;
}

// Token management
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: User): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Error saving session:', e);
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('Error clearing session:', e);
  }
}

export function getCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Helper for authorized headers
function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ==========================================
// AUTHENTICATION API
// ==========================================

export async function loginApi(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Přihlášení se nezdařilo');
  }

  setAuthSession(data.token, data.user);
  return data;
}

export async function registerApi(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registrace se nezdařila');
  }

  setAuthSession(data.token, data.user);
  return data;
}

export async function fetchCurrentUserApi(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(3000)
    });

    if (res.ok) {
      const data = await res.json();
      return data.user;
    } else if (res.status === 401) {
      clearAuthSession();
      return null;
    }
  } catch {
    // Offline - return cached user
    return getCachedUser();
  }
  return null;
}

export async function logoutApi(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
  } catch (e) {
    console.warn('Logout API failed:', e);
  } finally {
    clearAuthSession();
  }
}

// ==========================================
// SYSTEM & TASKS API
// ==========================================

// Check backend health
export async function checkBackendHealth(): Promise<BackendStatus> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      return { connected: true, engine: data.engine, uptime: data.uptime };
    }
  } catch (e) {}
  return { connected: false };
}

// Fetch all tasks for current authenticated user
export async function fetchTasksApi(): Promise<{ tasks: Task[]; fromBackend: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      const data: Task[] = await res.json();
      saveTasks(data);
      return { tasks: data, fromBackend: true };
    }
  } catch (e) {
    console.warn('Backend not reachable, loading from offline storage.');
  }

  return { tasks: loadTasks(), fromBackend: false };
}

// Create task in backend with fallback
export async function createTaskApi(taskData: Omit<Task, 'id' | 'createdAt' | 'status'>): Promise<Task> {
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(taskData),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Failed to save to backend, using local storage:', e);
  }

  const localTask: Task = {
    ...taskData,
    id: `task-${Date.now()}`,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };
  return localTask;
}

// Delete task
export async function deleteTaskApi(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not delete from backend:', e);
    return false;
  }
}

// Save tracking session
export async function saveTrackingApi(taskId: string, sessionData: TaskTrackingSession): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/track`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sessionData),
      signal: AbortSignal.timeout(4000)
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not post tracking to backend:', e);
    return false;
  }
}

// Reset database for user
export async function resetDatabaseApi(): Promise<Task[]> {
  try {
    const res = await fetch(`${API_BASE}/reset`, {
      method: 'POST',
      headers: getHeaders(),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const refreshed = await fetchTasksApi();
      return refreshed.tasks;
    }
  } catch (e) {
    console.warn('Could not reset backend DB:', e);
  }

  const initial = getInitialTasks();
  saveTasks(initial);
  return initial;
}
