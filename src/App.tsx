import React, { useState, useEffect } from 'react';
import { Task, ViewTab, TaskTrackingSession } from './types';
import { loadTasks, saveTasks, loadTheme, saveTheme } from './utils/storage';
import { 
  fetchTasksApi, createTaskApi, deleteTaskApi, saveTrackingApi, 
  resetDatabaseApi, checkBackendHealth, fetchCurrentUserApi, 
  logoutApi, getCachedUser, User 
} from './services/api';
import { Navbar } from './components/Navbar';
import { HeroCountdown } from './components/HeroCountdown';
import { CalendarView } from './components/CalendarView';
import { TaskTrackerModal } from './components/TaskTrackerModal';
import { TaskFormModal } from './components/TaskFormModal';
import { DashboardStats } from './components/DashboardStats';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AuthModal } from './components/AuthModal';
import { Bell, UserCheck, LogIn, Sparkles } from 'lucide-react';

export function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [theme, setTheme] = useState<'dark' | 'light'>(loadTheme);
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(getCachedUser);
  
  // Modals state
  const [activeTrackingTask, setActiveTrackingTask] = useState<Task | null>(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Sync theme with DOM class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  // Initial fetch from backend + current user auth check
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      const health = await checkBackendHealth();
      if (!isMounted) return;
      setIsBackendConnected(health.connected);

      // Verify session with backend
      const user = await fetchCurrentUserApi();
      if (!isMounted) return;
      setCurrentUser(user);

      // Load tasks
      const { tasks: loadedTasks, fromBackend } = await fetchTasksApi();
      if (!isMounted) return;
      if (loadedTasks) {
        setTasks(loadedTasks);
      }
      setIsBackendConnected(fromBackend);
    };

    initData();

    // Periodic health check every 15s
    const healthInterval = setInterval(async () => {
      const health = await checkBackendHealth();
      if (isMounted) setIsBackendConnected(health.connected);
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(healthInterval);
    };
  }, []);

  // Reload tasks when user changes (login or logout)
  const reloadTasksForUser = async () => {
    const { tasks: loadedTasks } = await fetchTasksApi();
    if (loadedTasks) {
      setTasks(loadedTasks);
    }
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    reloadTasksForUser();
  };

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
    reloadTasksForUser();
  };

  // Request browser notifications
  const requestNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('FocusFlow notifikace aktivní', {
          body: 'Budeme vás upozorňovat před začátkem vašich cílů.',
          icon: './icon.svg'
        });
      }
    }
  };

  // Check reminders every 30 seconds
  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const interval = setInterval(() => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      tasks.forEach((t) => {
        if (t.status === 'scheduled' && t.scheduledDate === todayStr && t.reminderMinutesBefore > 0) {
          const [sh, sm] = t.startTime.split(':').map(Number);
          const taskTime = new Date();
          taskTime.setHours(sh, sm, 0, 0);

          const diffMins = Math.round((taskTime.getTime() - now.getTime()) / 60000);
          if (diffMins === t.reminderMinutesBefore) {
            new Notification(`Připomenutí: ${t.title}`, {
              body: `Aktivita začíná za ${diffMins} minut. Připravte se na check-in!`,
              icon: './icon.svg'
            });
          }
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [tasks, notificationPermission]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Add new task via API
  const handleSaveNewTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    const createdTask = await createTaskApi(taskData);
    setTasks((prev) => {
      const updated = [createdTask, ...prev];
      saveTasks(updated);
      return updated;
    });
  };

  // Complete tracking session via API
  const handleFinishTracking = async (taskId: string, sessionData: TaskTrackingSession) => {
    // Optimistic UI update
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'completed' as const,
            trackingData: sessionData,
          };
        }
        return t;
      });
      saveTasks(updated);
      return updated;
    });

    // Save to SQLite backend
    await saveTrackingApi(taskId, sessionData);
  };

  // Delete task via API
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      saveTasks(updated);
      return updated;
    });
    await deleteTaskApi(taskId);
  };

  // Reset demo data via API
  const handleResetData = async () => {
    const refreshed = await resetDatabaseApi();
    setTasks(refreshed);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors pb-24 md:pb-10">
      {/* Top Sticky Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewTask={() => setIsTaskFormOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        backendConnected={isBackendConnected}
        user={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Prominent Login/Profile Banner when not logged in */}
        {!currentUser && (
          <div className="bg-gradient-to-r from-brand-900/40 via-purple-900/30 to-zinc-900 border-2 border-brand-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-brand-950/20 text-white">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-lg shadow-brand-600/30 flex-shrink-0">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">
                    Uživatelský účet & Přihlášení
                  </h3>
                  <span className="text-[10px] bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded-full font-bold">
                    Nové
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Přihlaste se ke svému účtu nebo vyzkoušejte Demo profil na 1 kliknutí pro ukládání do SQLite databáze.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Otevřít přihlášení / Registraci</span>
            </button>
          </div>
        )}

        {/* User Logged-in Status Bar */}
        {currentUser && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 px-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Přihlášen jako <strong>{currentUser.name}</strong> ({currentUser.email})</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-rose-500 hover:underline"
            >
              Odhlásit
            </button>
          </div>
        )}

        {/* Notification Permission Banner (if not yet granted) */}
        {notificationPermission === 'default' && (
          <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
              <Bell className="w-4 h-4 flex-shrink-0 text-brand-500" />
              <span>Chcete dostávat upozornění před začátkem vašich aktivit?</span>
            </div>
            <button
              onClick={requestNotifications}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-white font-semibold hover:bg-zinc-700 transition-all self-end sm:self-auto"
            >
              Povolit notifikace
            </button>
          </div>
        )}

        {/* TAB 1: DASHBOARD (DNES) */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Hero Live Countdown & Next Task */}
            <HeroCountdown
              tasks={tasks}
              onStartTracking={(task) => setActiveTrackingTask(task)}
            />

            {/* Split Grid: Today's Timeline + Quick Stats preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <CalendarView
                  tasks={tasks}
                  onStartTracking={(task) => setActiveTrackingTask(task)}
                  onOpenNewTask={() => setIsTaskFormOpen(true)}
                  onDeleteTask={handleDeleteTask}
                />
              </div>

              <div className="lg:col-span-4 space-y-6">
                <DashboardStats tasks={tasks} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FULL CALENDAR */}
        {currentTab === 'calendar' && (
          <div className="max-w-4xl mx-auto">
            <CalendarView
              tasks={tasks}
              onStartTracking={(task) => setActiveTrackingTask(task)}
              onOpenNewTask={() => setIsTaskFormOpen(true)}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        )}

        {/* TAB 3: STATS & ANALYTICS */}
        {currentTab === 'stats' && (
          <div className="max-w-5xl mx-auto">
            <DashboardStats
              tasks={tasks}
              onClearAllData={handleResetData}
            />
          </div>
        )}
      </main>

      {/* Task Tracker Modal (Pre -> During -> Post flow) */}
      {activeTrackingTask && (
        <TaskTrackerModal
          task={activeTrackingTask}
          isOpen={!!activeTrackingTask}
          onClose={() => setActiveTrackingTask(null)}
          onFinishTracking={handleFinishTracking}
        />
      )}

      {/* New Task Creation Modal */}
      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        onSaveTask={handleSaveNewTask}
      />

      {/* Authentication Modal (Login / Register / 1-click Demo) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Mobile Bottom Navigation with Auth tab */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewTask={() => setIsTaskFormOpen(true)}
        user={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />
    </div>
  );
}

export default App;
