import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { Clock, Play, Sparkles, CheckCircle2, BellRing, ArrowRight } from 'lucide-react';

interface HeroCountdownProps {
  tasks: Task[];
  onStartTracking: (task: Task) => void;
}

export const HeroCountdown: React.FC<HeroCountdownProps> = ({ tasks, onStartTracking }) => {
  const [upcomingTask, setUpcomingTask] = useState<Task | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      // Filter scheduled tasks for today
      const pendingTasks = tasks.filter(
        (t) => t.status === 'scheduled' && t.scheduledDate === todayStr
      );

      if (pendingTasks.length === 0) {
        setUpcomingTask(null);
        setSecondsRemaining(null);
        return;
      }

      // Sort by start time
      const sorted = [...pendingTasks].sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Find the next one that hasn't finished yet
      let found: Task | null = null;
      let minDiff: number | null = null;

      for (const t of sorted) {
        const [h, m] = t.startTime.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setHours(h, m, 0, 0);

        const diffSec = Math.floor((targetDate.getTime() - now.getTime()) / 1000);
        // If it starts in the future or started less than 15 mins ago
        if (diffSec > -900) {
          found = t;
          minDiff = diffSec;
          break;
        }
      }

      if (found && minDiff !== null) {
        setUpcomingTask(found);
        setSecondsRemaining(minDiff);
      } else {
        setUpcomingTask(sorted[0] || null);
        setSecondsRemaining(null);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [tasks]);

  if (!upcomingTask) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center bg-zinc-50/50 dark:bg-zinc-900/30">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Všechny dnešní cíle jsou splněny!</h3>
        <p className="text-xs text-zinc-500 mt-1">Skvělá práce. Můžeš si odpočinout nebo naplánovat další cíl.</p>
      </div>
    );
  }

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return 'Čas začít! Úkol je připraven';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${s}s`;
    return `${mins} min ${s} s`;
  };

  const isUrgent = secondsRemaining !== null && secondsRemaining > 0 && secondsRemaining <= 900; // 15 min or less
  const isStarted = secondsRemaining !== null && secondsRemaining <= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-900/30 via-zinc-900/60 to-zinc-950 p-6 md:p-8 shadow-xl shadow-brand-950/20 text-white">
      {/* Background glow decoration */}
      <div className="absolute -right-12 -top-12 w-56 h-56 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Nadcházející aktivita
            </span>

            {isUrgent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                <BellRing className="w-3 h-3" />
                Začíná brzy
              </span>
            )}
            {isStarted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Play className="w-3 h-3 fill-current" />
                Připraveno ke spuštění
              </span>
            )}
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              {upcomingTask.title}
            </h2>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300 mt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-400" />
                {upcomingTask.startTime} – {upcomingTask.endTime} ({upcomingTask.estimatedDurationMinutes} min)
              </span>
              <span className="text-zinc-600">•</span>
              <span className="capitalize text-zinc-400">{upcomingTask.category}</span>
            </div>
          </div>
        </div>

        {/* Live Countdown & Start Button */}
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-4">
          <div className="bg-black/40 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 text-center sm:text-left md:text-center lg:text-left">
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider block font-medium">
              {isStarted ? 'Status' : 'Do začátku zbývá'}
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-brand-300 tracking-tight">
              {secondsRemaining !== null ? formatCountdown(secondsRemaining) : '--:--'}
            </span>
          </div>

          <button
            onClick={() => onStartTracking(upcomingTask)}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-brand-600/30 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Spustit Check-in (Před)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
