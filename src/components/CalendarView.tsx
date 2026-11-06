import React, { useState } from 'react';
import { Task, CalendarViewMode } from '../types';
import { 
  ChevronLeft, ChevronRight, Clock, CheckCircle2, Play, 
  Plus, Calendar as CalendarIcon, Tag, Trash2 
} from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  onStartTracking: (task: Task) => void;
  onOpenNewTask: () => void;
  onDeleteTask: (taskId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onStartTracking,
  onOpenNewTask,
  onDeleteTask,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const pad = (n: number) => n.toString().padStart(2, '0');
  const selectedDateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;

  // Filter tasks for selected day
  const dayTasks = tasks
    .filter((t) => t.scheduledDate === selectedDateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const dateHeading = new Intl.DateTimeFormat('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(selectedDate);

  // Category color mapper
  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'work':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'creative':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'health':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'study':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-1">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400"
            >
              Dnes
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base sm:text-lg font-bold capitalize text-zinc-900 dark:text-white">
            {dateHeading}
          </h3>
        </div>

        {/* View switcher (Day, Week, Month) */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-1">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {mode === 'day' ? 'Den' : mode === 'week' ? 'Týden' : 'Měsíc'}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Přidat cíl</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          {dayTasks.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
              <CalendarIcon className="w-12 h-12 mx-auto text-zinc-400 mb-3" />
              <h4 className="font-bold text-zinc-800 dark:text-zinc-200">Žádné úkoly pro tento den</h4>
              <p className="text-xs text-zinc-500 mt-1 mb-4">Naplánuj si aktivity a rozděl si čas do efektivních bloků.</p>
              <button
                onClick={onOpenNewTask}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow-md shadow-brand-500/20"
              >
                <Plus className="w-4 h-4" />
                Přidat první cíl
              </button>
            </div>
          ) : (
            dayTasks.map((t) => {
              const isCompleted = t.status === 'completed';

              return (
                <div
                  key={t.id}
                  className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-all ${
                    isCompleted
                      ? 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/60 opacity-80'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-brand-500/50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Time block pillar */}
                    <div className="min-w-[70px] text-left pt-0.5">
                      <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                        {t.startTime}
                      </span>
                      <span className="text-xs font-mono text-zinc-400 block">
                        {t.endTime}
                      </span>
                    </div>

                    <div className="w-1 self-stretch rounded-full bg-brand-500/30" />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${getCategoryBadge(t.category)}`}>
                          {t.category}
                        </span>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Dokončeno
                          </span>
                        )}
                      </div>

                      <h4 className={`text-base font-bold mt-1 text-zinc-900 dark:text-zinc-100 ${isCompleted ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}`}>
                        {t.title}
                      </h4>

                      {t.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                          {t.description}
                        </p>
                      )}

                      {/* Summary of reflection if completed */}
                      {isCompleted && t.trackingData?.postReflection && (
                        <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-2">
                          <span>Focus: {t.trackingData.postReflection.focusRating}/10</span>
                          <span>•</span>
                          <span>Energie po: {t.trackingData.postReflection.energyLevelAfter}/10</span>
                          <span>•</span>
                          <span>Skutečný čas: {Math.round(t.trackingData.actualDurationSeconds / 60)} min</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!isCompleted && (
                      <button
                        onClick={() => onStartTracking(t)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Měřit</span>
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteTask(t.id)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all opacity-0 group-hover:opacity-100"
                      title="Smazat úkol"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Week / Month Preview */}
      {viewMode !== 'day' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
          <CalendarIcon className="w-10 h-10 mx-auto text-brand-500 mb-2" />
          <h4 className="font-bold text-zinc-900 dark:text-white">Přehled {viewMode === 'week' ? 'Týdne' : 'Měsíce'}</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            V tomto období máš celkem <strong>{tasks.length}</strong> naplánovaných nebo dokončených aktivit.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-left">
            {tasks.slice(0, 4).map((t) => (
              <div key={t.id} className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <span className="text-[10px] text-zinc-400 block font-mono">{t.scheduledDate}</span>
                <span className="text-xs font-bold block truncate mt-0.5">{t.title}</span>
                <span className="text-[10px] text-brand-500">{t.startTime} - {t.endTime}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
