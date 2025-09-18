import type { StudyCycleRecord } from '../types/gameTypes';

export interface DailyTarget {
  date: string; // YYYY-MM-DD format
  targetHours: number;
  actualHours: number;
  debtHours: number; // negative hours if behind target
  compoundedDebt: number; // debt that accumulates from previous days
  isOverachieved: boolean; // if exceeded target
  overachievement: number; // hours above target (can offset debt)
}

export interface ProgressDebt {
  totalDebtHours: number;
  totalOverachievement: number;
  netDebt: number; // total debt minus overachievement
  dailyTargets: DailyTarget[];
  currentStreak: number; // consecutive days meeting targets
  worstDay: { date: string; debtHours: number } | null;
  averageDeficit: number;
  projectedExamReadiness: number; // percentage based on current trajectory
}

export function calculateDailyTarget(examDate: string, totalStudyHoursNeeded: number = 320): number {
  const now = new Date();
  const exam = new Date(examDate);
  const daysRemaining = Math.max(1, Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate daily hours needed based on remaining time
  const dailyHoursNeeded = totalStudyHoursNeeded / daysRemaining;

  // Cap at reasonable maximum (12 hours/day) and minimum (2 hours/day)
  return Math.max(2, Math.min(12, dailyHoursNeeded));
}

export function calculateProgressDebt(
  cycles: StudyCycleRecord[],
  examDate: string,
  startDate: string = getStudyStartDate(examDate)
): ProgressDebt {
  const dailyTargets: DailyTarget[] = [];
  const targetHoursPerDay = calculateDailyTarget(examDate);

  // Group cycles by date
  const cyclesByDate = groupCyclesByDate(cycles);

  // Determine fair start date: if no cycles yet, start today to avoid retroactive debt
  const today = new Date();
  let start = new Date(startDate);
  const earliestKey = Object.keys(cyclesByDate).sort()[0];
  if (!earliestKey) {
    // No history: don't penalize past days
    start = new Date(today.toISOString().split('T')[0]);
  } else {
    const earliestDate = new Date(earliestKey);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    // Don't go earlier than user's first recorded study day, nor earlier than 30 days ago
    const computedStart = new Date(startDate);
    start = new Date(Math.max(earliestDate.getTime(), computedStart.getTime(), thirtyDaysAgo.getTime()));
  }
  const current = new Date(start);

  let cumulativeDebt = 0;
  let currentStreak = 0;
  let worstDay: { date: string; debtHours: number } | null = null;
  let totalDeficit = 0;
  let deficitDays = 0;

  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0];
    const dayHours = cyclesByDate[dateStr] || 0;
    const debtHours = Math.max(0, targetHoursPerDay - dayHours);
    const overachievement = Math.max(0, dayHours - targetHoursPerDay);

    // Compound debt - each day of deficit adds to cumulative burden
    cumulativeDebt += debtHours;

    // Overachievement can reduce cumulative debt (but not below 0)
    if (overachievement > 0) {
      cumulativeDebt = Math.max(0, cumulativeDebt - overachievement);
    }

    const dailyTarget: DailyTarget = {
      date: dateStr,
      targetHours: targetHoursPerDay,
      actualHours: dayHours,
      debtHours,
      compoundedDebt: cumulativeDebt,
      isOverachieved: dayHours >= targetHoursPerDay,
      overachievement
    };

    dailyTargets.push(dailyTarget);

    // Update statistics
    if (dailyTarget.isOverachieved) {
      currentStreak++;
    } else {
      currentStreak = 0;
      totalDeficit += debtHours;
      deficitDays++;

      if (!worstDay || debtHours > worstDay.debtHours) {
        worstDay = { date: dateStr, debtHours };
      }
    }

    current.setDate(current.getDate() + 1);
  }

  const totalOverachievement = dailyTargets.reduce((sum, day) => sum + day.overachievement, 0);
  const netDebt = Math.max(0, cumulativeDebt);
  const averageDeficit = deficitDays > 0 ? totalDeficit / deficitDays : 0;

  // Calculate projected exam readiness
  const daysRemaining = Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const currentPace = dailyTargets.length > 0 ?
    dailyTargets.reduce((sum, day) => sum + day.actualHours, 0) / dailyTargets.length : 0;
  const projectedTotalHours = currentPace * (dailyTargets.length + daysRemaining);
  const projectedExamReadiness = Math.min(100, (projectedTotalHours / 320) * 100);

  return {
    totalDebtHours: cumulativeDebt,
    totalOverachievement,
    netDebt,
    dailyTargets,
    currentStreak,
    worstDay,
    averageDeficit,
    projectedExamReadiness
  };
}

function groupCyclesByDate(cycles: StudyCycleRecord[]): Record<string, number> {
  const grouped: Record<string, number> = {};

  cycles.forEach(cycle => {
    const date = cycle.startedAtISO.split('T')[0];
    const hours = cycle.studySeconds / 3600;
    grouped[date] = (grouped[date] || 0) + hours;
  });

  return grouped;
}

function getStudyStartDate(examDate: string): string {
  // Assume study started 90 days before exam, or 30 days ago, whichever is more recent
  const exam = new Date(examDate);
  const idealStart = new Date(exam.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const actualStart = idealStart > thirtyDaysAgo ? idealStart : thirtyDaysAgo;
  return actualStart.toISOString().split('T')[0];
}

export function getDebtSeverity(debt: ProgressDebt): {
  level: 'safe' | 'warning' | 'danger' | 'critical';
  color: string;
  message: string;
} {
  const netDebtHours = debt.netDebt;

  if (netDebtHours <= 2) {
    return {
      level: 'safe',
      color: '#22c55e',
      message: '✅ On track! Keep up the momentum!'
    };
  } else if (netDebtHours <= 8) {
    return {
      level: 'warning',
      color: '#f59e0b',
      message: '⚠️ Falling behind. Time to catch up!'
    };
  } else if (netDebtHours <= 20) {
    return {
      level: 'danger',
      color: '#ef4444',
      message: '🚨 Serious deficit! Major catch-up needed!'
    };
  } else {
    return {
      level: 'critical',
      color: '#dc2626',
      message: '💀 Critical debt! Exam readiness at risk!'
    };
  }
}

export function calculateCatchUpPlan(debt: ProgressDebt, examDate: string): {
  dailyHoursNeeded: number;
  daysToNeutral: number;
  feasible: boolean;
  intensity: 'light' | 'moderate' | 'intense' | 'extreme';
} {
  const daysRemaining = Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const normalDailyTarget = calculateDailyTarget(examDate);
  const catchUpHours = debt.netDebt;

  // Calculate additional daily hours needed to eliminate debt
  const additionalHoursPerDay = catchUpHours / daysRemaining;
  const totalDailyNeeded = normalDailyTarget + additionalHoursPerDay;

  // Calculate days needed to reach neutral at current pace + extra effort
  const extraEffortHours = 2; // assume 2 extra hours per day for catch-up
  const daysToNeutral = Math.ceil(catchUpHours / extraEffortHours);

  let intensity: 'light' | 'moderate' | 'intense' | 'extreme';
  if (totalDailyNeeded <= 6) intensity = 'light';
  else if (totalDailyNeeded <= 8) intensity = 'moderate';
  else if (totalDailyNeeded <= 10) intensity = 'intense';
  else intensity = 'extreme';

  return {
    dailyHoursNeeded: totalDailyNeeded,
    daysToNeutral,
    feasible: totalDailyNeeded <= 12, // 12 hours/day is theoretical maximum
    intensity
  };
}
