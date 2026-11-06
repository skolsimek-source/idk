import { Task } from '../types';

const STORAGE_KEY = 'focusflow_tasks_v1';
const THEME_KEY = 'focusflow_theme_v1';

// Seed initial realistic tasks for immediate preview
export const getInitialTasks = (): Task[] => {
  const today = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // Next upcoming task in 25 minutes
  const nextHour = (today.getHours() + 1) % 24;
  const nextTime = `${pad(nextHour)}:00`;
  const nextEndTime = `${pad(nextHour + 1)}:30`;

  return [
    {
      id: 'task-1',
      title: 'Ranní revize cílů a Inbox Zero',
      category: 'work',
      scheduledDate: todayStr,
      startTime: '08:30',
      endTime: '09:15',
      estimatedDurationMinutes: 45,
      reminderMinutesBefore: 10,
      status: 'completed',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      trackingData: {
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
      }
    },
    {
      id: 'task-2',
      title: 'Návrh komponent a responzivního UI',
      category: 'creative',
      scheduledDate: todayStr,
      startTime: nextTime,
      endTime: nextEndTime,
      estimatedDurationMinutes: 90,
      reminderMinutesBefore: 15,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      title: 'Kardio cvičení & protažení páteře',
      category: 'health',
      scheduledDate: todayStr,
      startTime: '17:30',
      endTime: '18:15',
      estimatedDurationMinutes: 45,
      reminderMinutesBefore: 15,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-4',
      title: 'Studium systémového designu a PWA',
      category: 'study',
      scheduledDate: todayStr,
      startTime: '19:30',
      endTime: '20:30',
      estimatedDurationMinutes: 60,
      reminderMinutesBefore: 10,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    }
  ];
};

export const loadTasks = (): Task[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialTasks();
      saveTasks(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading tasks:', e);
    return getInitialTasks();
  }
};

export const saveTasks = (tasks: Task[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Error saving tasks:', e);
  }
};

export const loadTheme = (): 'dark' | 'light' => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // default
  } catch {
    return 'dark';
  }
};

export const saveTheme = (theme: 'dark' | 'light'): void => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error(e);
  }
};
