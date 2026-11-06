import React from 'react';
import { LayoutDashboard, Calendar, BarChart3, Plus, User as UserIcon, LogIn } from 'lucide-react';
import { ViewTab } from '../types';
import { User } from '../services/api';

interface MobileBottomNavProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenNewTask: () => void;
  user: User | null;
  onOpenAuth: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewTask,
  user,
  onOpenAuth,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 safe-bottom shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {/* Tab 1: Dnes */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
            currentTab === 'dashboard'
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Dnes</span>
        </button>

        {/* Tab 2: Kalendář */}
        <button
          onClick={() => onSelectTab('calendar')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
            currentTab === 'calendar'
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px]">Kalendář</span>
        </button>

        {/* Action: Quick Add Floating Button */}
        <button
          onClick={onOpenNewTask}
          aria-label="Přidat cíl"
          className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/40 ring-4 ring-white dark:ring-zinc-950 active:scale-95 transition-all flex-shrink-0"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Tab 3: Statistiky */}
        <button
          onClick={() => onSelectTab('stats')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
            currentTab === 'stats'
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Statistiky</span>
        </button>

        {/* Tab 4: Profil / Přihlášení (Mobile) */}
        <button
          onClick={onOpenAuth}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-zinc-500 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-all"
        >
          {user ? (
            <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[10px]">
              {user.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <LogIn className="w-5 h-5 text-brand-500" />
          )}
          <span className="text-[10px] truncate max-w-[50px]">
            {user ? user.name.split(' ')[0] : 'Přihlásit'}
          </span>
        </button>
      </div>
    </div>
  );
};
