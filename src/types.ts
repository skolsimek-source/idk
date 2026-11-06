export type MoodType = 'energized' | 'calm' | 'focused' | 'tired' | 'stressed' | 'distracted';
export type TaskCategory = 'work' | 'study' | 'health' | 'personal' | 'creative';
export type TaskStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped';

export interface PreTaskCheckIn {
  energyLevel: number; // 1-10
  mood: MoodType;
  intentions: string;
  startedCheckInAt: string;
}

export interface PostTaskReflection {
  completedAt: string;
  focusRating: number; // 1-10
  energyLevelAfter: number; // 1-10
  moodAfter: MoodType;
  howItWent: string;
  isGoalAchieved: boolean;
  timeDifferenceMinutes: number; // actual - planned
}

export interface TaskTrackingSession {
  preCheckIn: PreTaskCheckIn;
  actualStartTime: string;
  actualEndTime?: string;
  actualDurationSeconds: number;
  postReflection?: PostTaskReflection;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  estimatedDurationMinutes: number;
  reminderMinutesBefore: number;
  status: TaskStatus;
  trackingData?: TaskTrackingSession;
  createdAt: string;
}

export type ViewTab = 'dashboard' | 'calendar' | 'stats';
export type CalendarViewMode = 'day' | 'week' | 'month';
