import React, { useState } from 'react';
import { Task, TaskCategory } from '../types';
import { X, Calendar, Clock, Tag, BellRing, Sparkles } from 'lucide-react';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
}) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const currentHour = (today.getHours() + 1) % 24;
  const defaultStart = `${pad(currentHour)}:00`;
  const defaultEnd = `${pad((currentHour + 1) % 24)}:00`;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [scheduledDate, setScheduledDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(15);

  if (!isOpen) return null;

  // Calculate duration from start and end times
  const calculateDuration = () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60; // Crosses midnight
    return diff;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveTask({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      scheduledDate,
      startTime,
      endTime,
      estimatedDurationMinutes: calculateDuration(),
      reminderMinutesBefore,
    });

    // Reset fields
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-500" />
            <h3 className="font-bold text-lg">Naplánovat nový cíl</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
              Název aktivity / cíle *
            </label>
            <input
              type="text"
              required
              placeholder="např. Dokončit analýzu klientského rozpočtu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Category selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
              Kategorie
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(['work', 'creative', 'study', 'health', 'personal'] as TaskCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                    category === cat
                      ? 'border-brand-600 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Datum
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Začátek (Od)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Konec (Do)
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Duration hint */}
          <div className="text-xs text-brand-600 dark:text-brand-400 bg-brand-500/10 px-3 py-2 rounded-xl flex items-center justify-between font-medium">
            <span>Vypočtená doba trvání:</span>
            <strong>{calculateDuration()} minut</strong>
          </div>

          {/* Notification Reminder */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
              Upozornění před začátkem
            </label>
            <select
              value={reminderMinutesBefore}
              onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value={0}>Bez upozornění</option>
              <option value={5}>5 minut předem</option>
              <option value={10}>10 minut předem</option>
              <option value={15}>15 minut předem (doporučeno)</option>
              <option value={30}>30 minut předem</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
              Poznámka / Kontext (volitelné)
            </label>
            <textarea
              rows={2}
              placeholder="Odkazy na dokumenty, klíčové body..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              Zrušit
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/25 active:scale-98 transition-all"
            >
              Uložit cíl do rozvrhu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
