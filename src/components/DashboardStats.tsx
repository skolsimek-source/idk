import React from 'react';
import { Task } from '../types';
import { 
  BarChart3, CheckCircle2, BatteryCharging, Sparkles, 
  Flame, Clock, Calendar, TrendingUp, History, Download, Trash2 
} from 'lucide-react';
import { CircularOverviewChart } from './CircularOverviewChart';

interface DashboardStatsProps {
  tasks: Task[];
  onClearAllData?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ tasks, onClearAllData }) => {
  const completedTasks = tasks.filter((t) => t.status === 'completed' && t.trackingData);
  const totalCompleted = completedTasks.length;

  // Calculate statistics
  let totalSeconds = 0;
  let achievedCount = 0;
  let totalPreEnergy = 0;
  let totalPostEnergy = 0;
  let totalFocus = 0;

  completedTasks.forEach((t) => {
    if (t.trackingData) {
      totalSeconds += t.trackingData.actualDurationSeconds || 0;
      totalPreEnergy += t.trackingData.preCheckIn.energyLevel;
      if (t.trackingData.postReflection) {
        if (t.trackingData.postReflection.isGoalAchieved) achievedCount++;
        totalPostEnergy += t.trackingData.postReflection.energyLevelAfter;
        totalFocus += t.trackingData.postReflection.focusRating;
      }
    }
  });

  const avgPreEnergy = totalCompleted > 0 ? (totalPreEnergy / totalCompleted).toFixed(1) : '0.0';
  const avgPostEnergy = totalCompleted > 0 ? (totalPostEnergy / totalCompleted).toFixed(1) : '0.0';
  const avgFocus = totalCompleted > 0 ? (totalFocus / totalCompleted).toFixed(1) : '0.0';
  const successRate = totalCompleted > 0 ? Math.round((achievedCount / totalCompleted) * 100) : 0;

  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);

  // Export JSON function
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `focusflow-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Celkový čas */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Čas v hluboké práci</span>
            <Clock className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            {totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins} min`}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Celkový čistý čas měření</p>
        </div>

        {/* KPI 2: Úspěšnost splnění */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Úspěšnost cílů</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            {successRate}%
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">{achievedCount} z {totalCompleted} cílů splněno</p>
        </div>

        {/* KPI 3: Průměrný Focus */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Průměrný Focus</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            {avgFocus} <span className="text-sm font-normal text-zinc-400">/ 10</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Subjektivní míra soustředění</p>
        </div>

        {/* KPI 4: Změna energie */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Energie (Před vs Po)</span>
            <BatteryCharging className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            {avgPreEnergy} <span className="text-zinc-400 text-lg">→</span> {avgPostEnergy}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Průměrná spotřeba energie</p>
        </div>
      </div>

      {/* KRUHOVÝ GRAF: VIZUÁLNÍ PŘEHLED AKTIVIT (DONUT CHART) */}
      <CircularOverviewChart tasks={tasks} />

      {/* Visual Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Energy & Focus Correlation Chart Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              Dynamika energie a soustředění
            </h3>
            <span className="text-xs text-zinc-400">Průměrné hodnoty</span>
          </div>

          <div className="space-y-4 pt-2">
            {/* Pre-energy bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Energie PŘED aktivitou</span>
                <span className="text-brand-600 dark:text-brand-400">{avgPreEnergy} / 10</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Number(avgPreEnergy) * 10}%` }}
                />
              </div>
            </div>

            {/* Post-energy bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Energie PO aktivitě</span>
                <span className="text-brand-600 dark:text-brand-400">{avgPostEnergy} / 10</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Number(avgPostEnergy) * 10}%` }}
                />
              </div>
            </div>

            {/* Focus rating bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Udržený FOCUS (soustředění)</span>
                <span className="text-amber-500">{avgFocus} / 10</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Number(avgFocus) * 10}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
            💡 <strong>Insight:</strong> Vaše energie klesá po úkolech v průměru o{' '}
            <strong>{(Number(avgPreEnergy) - Number(avgPostEnergy)).toFixed(1)} bodu</strong>. Nejvyššího focusu dosahujete, když začínáte s energií alespoň 7/10.
          </div>
        </div>

        {/* Data Tools & Quick Management */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              Správa dat a záloha
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
              Veškerá data jsou zabezpečena v SQLite databázi i lokálně v prohlížeči (PWA). Můžete je kdykoliv exportovat do formátu JSON.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleExportJSON}
                className="w-full py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4 text-brand-500" />
                Stáhnout kompletní zálohu dat (JSON)
              </button>

              {onClearAllData && (
                <button
                  onClick={() => {
                    if (window.confirm('Opravdu chcete vyresetovat data a načíst výchozí příklady?')) {
                      onClearAllData();
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Resetovat data do výchozího stavu
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <span className="text-[11px] text-zinc-400">
              FocusFlow Full-Stack • Zabezpečeno v SQLite
            </span>
          </div>
        </div>
      </div>

      {/* History Log: Completed Sessions & Reflections */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-brand-500" />
            Historie sebereflexí a dokončených aktivit
          </h3>
          <span className="text-xs text-zinc-400">{totalCompleted} záznamů</span>
        </div>

        {completedTasks.length === 0 ? (
          <p className="text-center py-8 text-xs text-zinc-400">
            Zatím nemáte žádné dokončené měření. Spusťte svůj první úkol!
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {completedTasks.map((t) => {
              const r = t.trackingData?.postReflection;
              const pre = t.trackingData?.preCheckIn;
              const mins = Math.round((t.trackingData?.actualDurationSeconds || 0) / 60);

              return (
                <div key={t.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 capitalize">
                        {t.category}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                      {t.scheduledDate} • {mins} min (plán: {t.estimatedDurationMinutes} min)
                    </span>
                  </div>

                  {/* Pre & Post badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium">
                      Před: Energie {pre?.energyLevel}/10 ({pre?.mood})
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium">
                      Po: Energie {r?.energyLevelAfter}/10 • Focus {r?.focusRating}/10
                    </span>
                    {r?.isGoalAchieved && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 font-medium">
                        ✓ Cíl splněn
                      </span>
                    )}
                  </div>

                  {/* Reflection comment */}
                  {r?.howItWent && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 italic bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
                      "{r.howItWent}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
