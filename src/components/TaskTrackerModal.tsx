import React, { useState, useEffect } from 'react';
import { Task, MoodType, TaskTrackingSession } from '../types';
import { 
  Play, Pause, CheckCircle2, Clock, BatteryMedium, Sparkles, 
  Smile, Meh, Frown, Flame, Zap, X, ShieldAlert, Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/sound';

interface TaskTrackerModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onFinishTracking: (taskId: string, sessionData: TaskTrackingSession) => void;
}

type Phase = 'PRE_CHECKIN' | 'TRACKING_ACTIVE' | 'POST_REFLECTION';

export const TaskTrackerModal: React.FC<TaskTrackerModalProps> = ({
  task,
  isOpen,
  onClose,
  onFinishTracking,
}) => {
  const [phase, setPhase] = useState<Phase>('PRE_CHECKIN');

  // Phase 1: Pre-checkin
  const [energyLevel, setEnergyLevel] = useState<number>(7);
  const [mood, setMood] = useState<MoodType>('focused');
  const [intentions, setIntentions] = useState<string>('');

  // Phase 2: Live stopwatch
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<string>('');

  // Phase 3: Post-reflection
  const [focusRating, setFocusRating] = useState<number>(8);
  const [energyLevelAfter, setEnergyLevelAfter] = useState<number>(6);
  const [moodAfter, setMoodAfter] = useState<MoodType>('focused');
  const [howItWent, setHowItWent] = useState<string>('');
  const [isGoalAchieved, setIsGoalAchieved] = useState<boolean>(true);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setPhase('PRE_CHECKIN');
      setElapsedSeconds(0);
      setIsPaused(false);
      setIntentions('');
      setHowItWent('');
    }
  }, [isOpen, task.id]);

  // Stopwatch effect
  useEffect(() => {
    let interval: any;
    if (phase === 'TRACKING_ACTIVE' && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, isPaused]);

  if (!isOpen) return null;

  // Format MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTracking = () => {
    sounds.playStart();
    setStartTime(new Date().toISOString());
    setPhase('TRACKING_ACTIVE');
  };

  const handleTogglePause = () => {
    sounds.playTick();
    setIsPaused(!isPaused);
  };

  const handleCompleteSession = () => {
    sounds.playComplete();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}
    setPhase('POST_REFLECTION');
  };

  const handleSaveReflection = () => {
    const plannedSecs = task.estimatedDurationMinutes * 60;
    const diffMinutes = Math.round((elapsedSeconds - plannedSecs) / 60);

    const sessionData: TaskTrackingSession = {
      preCheckIn: {
        energyLevel,
        mood,
        intentions: intentions.trim() || 'Soustředěná práce na úkolu',
        startedCheckInAt: startTime || new Date().toISOString(),
      },
      actualStartTime: startTime || new Date().toISOString(),
      actualEndTime: new Date().toISOString(),
      actualDurationSeconds: elapsedSeconds,
      postReflection: {
        completedAt: new Date().toISOString(),
        focusRating,
        energyLevelAfter,
        moodAfter,
        howItWent: howItWent.trim() || 'Úkol úspěšně dokončen.',
        isGoalAchieved,
        timeDifferenceMinutes: diffMinutes,
      }
    };

    onFinishTracking(task.id, sessionData);
    onClose();
  };

  const plannedSeconds = task.estimatedDurationMinutes * 60;
  const progressRatio = Math.min(elapsedSeconds / plannedSeconds, 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 capitalize">
              {task.category}
            </span>
            <span className="text-xs text-zinc-400">
              Plán: {task.estimatedDurationMinutes} min
            </span>
          </div>

          {phase !== 'TRACKING_ACTIVE' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* ==========================================================
              FAZE 1: PRED (CHECK-IN)
             ========================================================== */}
          {phase === 'PRE_CHECKIN' && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Fáze 1 • Příprava
                </span>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1">
                  {task.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Než spustíš časomíru, zhodnoť svůj výchozí stav pro pozdější analýzu produktivity.
                </p>
              </div>

              {/* Energy Level Slider */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <BatteryMedium className="w-4 h-4 text-emerald-500" />
                    Aktuální hladina energie:
                  </label>
                  <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    {energyLevel} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <div className="flex justify-between text-[11px] text-zinc-400 mt-1">
                  <span>Vyčerpaný (1)</span>
                  <span>Průměr (5)</span>
                  <span>Plný energie (10)</span>
                </div>
              </div>

              {/* Mood selector */}
              <div>
                <label className="text-sm font-semibold block mb-2">
                  Aktuální nálada:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { key: 'focused', label: 'Fokus', icon: Flame },
                    { key: 'energized', label: 'Energie', icon: Zap },
                    { key: 'calm', label: 'Klid', icon: Smile },
                    { key: 'tired', label: 'Únava', icon: Frown },
                    { key: 'stressed', label: 'Stres', icon: Meh },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = mood === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setMood(item.key as MoodType)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? 'border-brand-600 bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Intention */}
              <div>
                <label className="text-sm font-semibold block mb-1.5">
                  Hlavní záměr pro tento blok:
                </label>
                <input
                  type="text"
                  placeholder="např. Dokončit hlavní sekci bez otevírání sociálních sítí"
                  value={intentions}
                  onChange={(e) => setIntentions(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleStartTracking}
                className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Začít pracovat & Spustit stopky</span>
              </button>
            </div>
          )}

          {/* ==========================================================
              FAZE 2: BEHEM (TRACKING & STOPWATCH)
             ========================================================== */}
          {phase === 'TRACKING_ACTIVE' && (
            <div className="text-center py-6 space-y-6">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Aktivní sledování času
                </span>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {task.title}
                </h3>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    elapsedSeconds > plannedSeconds ? 'bg-amber-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${progressRatio * 100}%` }}
                />
              </div>

              {/* Large Clock Display */}
              <div className="py-2">
                <div className="text-6xl sm:text-7xl font-mono font-black tracking-tight text-zinc-900 dark:text-white">
                  {formatTime(elapsedSeconds)}
                </div>
                <div className="text-xs text-zinc-400 mt-2 flex items-center justify-center gap-2">
                  <span>Plán: {task.estimatedDurationMinutes} min</span>
                  <span>•</span>
                  <span>{isPaused ? 'Pozastaveno' : 'Měření běží'}</span>
                </div>
              </div>

              {/* Active Intention Card */}
              {intentions && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 max-w-md mx-auto">
                  🎯 <strong>Záměr:</strong> {intentions}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={handleTogglePause}
                  className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm border transition-all ${
                    isPaused
                      ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                  <span>{isPaused ? 'Pokračovat' : 'Pauza'}</span>
                </button>

                <button
                  onClick={handleCompleteSession}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Dokončit úkol</span>
                </button>
              </div>
            </div>
          )}

          {/* ==========================================================
              FAZE 3: PO (SEBEREFLEXE)
             ========================================================== */}
          {phase === 'POST_REFLECTION' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                    Skvělá práce! Jak to šlo?
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Skutečný čas: <strong>{Math.round(elapsedSeconds / 60)} min</strong> (plán: {task.estimatedDurationMinutes} min)
                  </p>
                </div>
              </div>

              {/* Focus Rating Slider */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    Hodnocení soustředění (Focus):
                  </label>
                  <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    {focusRating} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={focusRating}
                  onChange={(e) => setFocusRating(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>

              {/* Energy Level After */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <BatteryMedium className="w-4 h-4 text-emerald-500" />
                    Energie po dokončení:
                  </label>
                  <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    {energyLevelAfter} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={energyLevelAfter}
                  onChange={(e) => setEnergyLevelAfter(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>

              {/* Goal Achieved Checkbox */}
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGoalAchieved}
                  onChange={(e) => setIsGoalAchieved(e.target.checked)}
                  className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <span className="text-sm font-semibold">
                  Podařilo se splnit zamýšlený cíl v plném rozsahu?
                </span>
              </label>

              {/* Reflection note */}
              <div>
                <label className="text-sm font-semibold block mb-1.5">
                  Stručná reflexe (co šlo hladce, co tě vyrušovalo):
                </label>
                <textarea
                  rows={2}
                  placeholder="např. Výborný flow v první polovině, pak drobná únava..."
                  value={howItWent}
                  onChange={(e) => setHowItWent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleSaveReflection}
                className="w-full py-4 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Uložit sebereflexi a dokončit</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
