import React, { useState } from 'react';
import { Task, TaskCategory } from '../types';
import { PieChart, CheckCircle2, Clock, Layers, Sparkles } from 'lucide-react';

interface CircularOverviewChartProps {
  tasks: Task[];
}

interface CategorySlice {
  category: TaskCategory;
  label: string;
  count: number;
  totalMinutes: number;
  color: string;
  bgClass: string;
}

const CATEGORY_CONFIG: Record<TaskCategory, { label: string; color: string; bgClass: string }> = {
  work: { label: 'Práce', color: '#6366f1', bgClass: 'bg-indigo-500' },
  creative: { label: 'Kreativita', color: '#a855f7', bgClass: 'bg-purple-500' },
  health: { label: 'Zdraví', color: '#10b981', bgClass: 'bg-emerald-500' },
  study: { label: 'Studium', color: '#f59e0b', bgClass: 'bg-amber-500' },
  personal: { label: 'Osobní', color: '#06b6d4', bgClass: 'bg-cyan-500' },
};

export const CircularOverviewChart: React.FC<CircularOverviewChartProps> = ({ tasks }) => {
  const [viewType, setViewType] = useState<'category' | 'status'>('category');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // 1. Calculate Category Slices
  const categoryMap: Partial<Record<TaskCategory, { count: number; minutes: number }>> = {};

  tasks.forEach((t) => {
    const cat = t.category || 'work';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, minutes: 0 };
    }
    categoryMap[cat]!.count += 1;
    // Use actual time if completed, otherwise estimated duration
    const mins = t.trackingData?.actualDurationSeconds 
      ? Math.round(t.trackingData.actualDurationSeconds / 60)
      : t.estimatedDurationMinutes || 45;
    categoryMap[cat]!.minutes += mins;
  });

  const categorySlices: CategorySlice[] = Object.entries(categoryMap)
    .map(([cat, data]) => {
      const config = CATEGORY_CONFIG[cat as TaskCategory] || { label: cat, color: '#a1a1aa', bgClass: 'bg-zinc-400' };
      return {
        category: cat as TaskCategory,
        label: config.label,
        count: data!.count,
        totalMinutes: data!.minutes,
        color: config.color,
        bgClass: config.bgClass,
      };
    })
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  const totalMinutes = categorySlices.reduce((acc, s) => acc + s.totalMinutes, 0) || 1;
  const totalTasks = tasks.length || 1;

  // 2. Calculate Status Slices (Completed vs Scheduled)
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const scheduledCount = tasks.filter((t) => t.status === 'scheduled').length;

  const statusSlices = [
    {
      key: 'completed',
      label: 'Dokončeno',
      count: completedCount,
      color: '#10b981',
      bgClass: 'bg-emerald-500',
    },
    {
      key: 'scheduled',
      label: 'Naplánováno',
      count: scheduledCount,
      color: '#6366f1',
      bgClass: 'bg-indigo-500',
    },
  ];

  // SVG Geometry for Donut Chart
  const size = 220;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Render SVG Slices for Category
  let accumulatedCategoryOffset = 0;
  const renderedCategoryCircles = categorySlices.map((slice) => {
    const fraction = slice.totalMinutes / totalMinutes;
    const strokeDasharray = `${fraction * circumference} ${circumference * (1 - fraction)}`;
    const strokeDashoffset = -accumulatedCategoryOffset;
    accumulatedCategoryOffset += fraction * circumference;
    const isHovered = hoveredSlice === slice.category;

    return (
      <circle
        key={slice.category}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={slice.color}
        strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="butt"
        className="transition-all duration-300 cursor-pointer origin-center"
        onMouseEnter={() => setHoveredSlice(slice.category)}
        onMouseLeave={() => setHoveredSlice(null)}
      />
    );
  });

  // Render SVG Slices for Status
  let accumulatedStatusOffset = 0;
  const renderedStatusCircles = statusSlices.map((slice) => {
    const fraction = slice.count / totalTasks;
    const strokeDasharray = `${fraction * circumference} ${circumference * (1 - fraction)}`;
    const strokeDashoffset = -accumulatedStatusOffset;
    accumulatedStatusOffset += fraction * circumference;
    const isHovered = hoveredSlice === slice.key;

    return (
      <circle
        key={slice.key}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={slice.color}
        strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="butt"
        className="transition-all duration-300 cursor-pointer origin-center"
        onMouseEnter={() => setHoveredSlice(slice.key)}
        onMouseLeave={() => setHoveredSlice(null)}
      />
    );
  });

  // Highlighted info in the center of the donut
  const activeCategory = categorySlices.find((s) => s.category === hoveredSlice);
  const activeStatus = statusSlices.find((s) => s.key === hoveredSlice);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-zinc-900 dark:text-white flex items-center gap-2">
              Kruhový přehled aktivit
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                Graf
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Vizuální rozdělení času a úspěšnosti cílů
            </p>
          </div>
        </div>

        {/* View Switcher: Category vs Status */}
        <div className="flex rounded-xl p-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => { setViewType('category'); setHoveredSlice(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewType === 'category'
                ? 'bg-white dark:bg-zinc-700 text-brand-600 dark:text-brand-400 shadow-sm font-bold'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Kategorie (Čas)</span>
          </button>
          <button
            onClick={() => { setViewType('status'); setHoveredSlice(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewType === 'status'
                ? 'bg-white dark:bg-zinc-700 text-brand-600 dark:text-brand-400 shadow-sm font-bold'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Stav plnění</span>
          </button>
        </div>
      </div>

      {/* Main Graph Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* SVG Circular Donut Chart */}
        <div className="md:col-span-5 flex justify-center relative py-2">
          <div className="relative w-[220px] h-[220px]">
            <svg
              width={size}
              height={size}
              className="transform -rotate-90 filter drop-shadow-md"
            >
              {/* Background Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-zinc-100 dark:text-zinc-800/60"
              />

              {/* Dynamic Slices */}
              {viewType === 'category' ? renderedCategoryCircles : renderedStatusCircles}
            </svg>

            {/* Center Information Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              {viewType === 'category' ? (
                activeCategory ? (
                  <>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      {activeCategory.label}
                    </span>
                    <span className="text-xl font-black text-zinc-900 dark:text-white">
                      {formatHours(activeCategory.totalMinutes)}
                    </span>
                    <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                      {Math.round((activeCategory.totalMinutes / totalMinutes) * 100)} %
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Celkový čas
                    </span>
                    <span className="text-2xl font-black text-zinc-900 dark:text-white">
                      {formatHours(totalMinutes)}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">
                      {tasks.length} cílů celkem
                    </span>
                  </>
                )
              ) : (
                activeStatus ? (
                  <>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      {activeStatus.label}
                    </span>
                    <span className="text-2xl font-black text-zinc-900 dark:text-white">
                      {activeStatus.count}
                    </span>
                    <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                      {Math.round((activeStatus.count / totalTasks) * 100)} %
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Úspěšnost
                    </span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {Math.round((completedCount / totalTasks) * 100)} %
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">
                      {completedCount} z {tasks.length} splněno
                    </span>
                  </>
                )
              )}
            </div>
          </div>
        </div>

        {/* Interactive Legend & Breakdown Table */}
        <div className="md:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-100 dark:border-zinc-800">
            <span>{viewType === 'category' ? 'Kategorie' : 'Stav cíle'}</span>
            <div className="flex items-center gap-6">
              <span>{viewType === 'category' ? 'Čas' : 'Počet'}</span>
              <span className="w-12 text-right">Podíl</span>
            </div>
          </div>

          {viewType === 'category' ? (
            categorySlices.map((slice) => {
              const percent = Math.round((slice.totalMinutes / totalMinutes) * 100);
              const isHovered = hoveredSlice === slice.category;

              return (
                <div
                  key={slice.category}
                  onMouseEnter={() => setHoveredSlice(slice.category)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-zinc-100 dark:bg-zinc-800 shadow-sm scale-[1.01]'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                        {slice.label}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">
                        {slice.count} {slice.count === 1 ? 'úkol' : slice.count < 5 ? 'úkoly' : 'úkolů'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      {formatHours(slice.totalMinutes)}
                    </span>
                    <span
                      className="w-12 text-right font-mono font-bold"
                      style={{ color: slice.color }}
                    >
                      {percent}%
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            statusSlices.map((slice) => {
              const percent = Math.round((slice.count / totalTasks) * 100);
              const isHovered = hoveredSlice === slice.key;

              return (
                <div
                  key={slice.key}
                  onMouseEnter={() => setHoveredSlice(slice.key)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-zinc-100 dark:bg-zinc-800 shadow-sm scale-[1.01]'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {slice.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      {slice.count} cílů
                    </span>
                    <span
                      className="w-12 text-right font-mono font-bold"
                      style={{ color: slice.color }}
                    >
                      {percent}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
