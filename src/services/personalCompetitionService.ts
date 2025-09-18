import type { StudyCycleRecord } from '../types/gameTypes';

export interface PersonalRecord {
  type: 'daily_hours' | 'weekly_hours' | 'focus_average' | 'study_streak' | 'xp_rate' | 'cycle_efficiency';
  value: number;
  dateISO: string;
  context?: string; // Additional context about the record
}

export interface CompetitionMetrics {
  currentStreak: number;
  bestStreak: number;
  streakProgress: number; // How close to beating best streak (0-1)

  todayHours: number;
  bestDailyHours: number;
  dailyProgress: number; // How close to beating best day (0-1)

  thisWeekHours: number;
  bestWeeklyHours: number;
  weeklyProgress: number;

  recentFocusAverage: number; // Last 7 days
  bestFocusAverage: number;
  focusProgress: number;

  currentXPRate: number; // XP per hour in recent sessions
  bestXPRate: number;
  xpRateProgress: number;

  personalRecords: PersonalRecord[];
  recentAchievements: PersonalRecord[]; // Records set in last 7 days

  // Performance vs past periods
  thisVsLastWeek: number; // Percentage change
  thisVsLastMonth: number;

  // Momentum indicators
  improvementTrend: 'declining' | 'stable' | 'improving' | 'accelerating';
  daysSinceLastRecord: number;
  recordsThisMonth: number;
}

export function calculatePersonalCompetition(
  cycles: StudyCycleRecord[],
): CompetitionMetrics {
  if (cycles.length === 0) {
    return getEmptyMetrics();
  }

  const sortedCycles = [...cycles].sort((a, b) =>
    new Date(a.startedAtISO).getTime() - new Date(b.startedAtISO).getTime()
  );

  const personalRecords = calculatePersonalRecords(sortedCycles);
  const streakData = calculateStreakMetrics(sortedCycles);
  const dailyData = calculateDailyMetrics(sortedCycles);
  const weeklyData = calculateWeeklyMetrics(sortedCycles);
  const focusData = calculateFocusMetrics(sortedCycles);
  const xpData = calculateXPMetrics(sortedCycles);
  const trends = calculateTrends(sortedCycles);

  return {
    currentStreak: streakData.current,
    bestStreak: streakData.best,
    streakProgress: streakData.current / Math.max(1, streakData.best),

    todayHours: dailyData.today,
    bestDailyHours: dailyData.best,
    dailyProgress: dailyData.today / Math.max(1, dailyData.best),

    thisWeekHours: weeklyData.thisWeek,
    bestWeeklyHours: weeklyData.best,
    weeklyProgress: weeklyData.thisWeek / Math.max(1, weeklyData.best),

    recentFocusAverage: focusData.recent,
    bestFocusAverage: focusData.best,
    focusProgress: focusData.recent / Math.max(1, focusData.best),

    currentXPRate: xpData.current,
    bestXPRate: xpData.best,
    xpRateProgress: xpData.current / Math.max(1, xpData.best),

    personalRecords,
    recentAchievements: personalRecords.filter(record =>
      (Date.now() - new Date(record.dateISO).getTime()) <= 7 * 24 * 60 * 60 * 1000
    ),

    thisVsLastWeek: trends.weeklyChange,
    thisVsLastMonth: trends.monthlyChange,

    improvementTrend: trends.trend,
    daysSinceLastRecord: Math.floor((Date.now() - Math.max(...personalRecords.map(r => new Date(r.dateISO).getTime()))) / (24 * 60 * 60 * 1000)),
    recordsThisMonth: personalRecords.filter(record =>
      (Date.now() - new Date(record.dateISO).getTime()) <= 30 * 24 * 60 * 60 * 1000
    ).length
  };
}

function calculatePersonalRecords(cycles: StudyCycleRecord[]): PersonalRecord[] {
  const records: PersonalRecord[] = [];

  // Group cycles by day
  const dailyHours = groupCyclesByDay(cycles);
  const weeklyHours = groupCyclesByWeek(cycles);

  // Find best daily hours
  const bestDayEntry = Object.entries(dailyHours).reduce((best, [date, hours]) =>
    hours > best.hours ? { date, hours } : best, { date: '', hours: 0 }
  );

  if (bestDayEntry.hours > 0) {
    records.push({
      type: 'daily_hours',
      value: bestDayEntry.hours,
      dateISO: bestDayEntry.date,
      context: `${bestDayEntry.hours.toFixed(1)}h in one day`
    });
  }

  // Find best weekly hours
  const bestWeekEntry = Object.entries(weeklyHours).reduce((best, [week, hours]) =>
    hours > best.hours ? { week, hours } : best, { week: '', hours: 0 }
  );

  if (bestWeekEntry.hours > 0) {
    records.push({
      type: 'weekly_hours',
      value: bestWeekEntry.hours,
      dateISO: bestWeekEntry.week,
      context: `${bestWeekEntry.hours.toFixed(1)}h in one week`
    });
  }

  // Best focus average (7-day rolling)
  const focusAverages = calculateRollingFocusAverages(cycles, 7);
  const bestFocus = Math.max(...focusAverages.map(f => f.average));
  const bestFocusEntry = focusAverages.find(f => f.average === bestFocus);

  if (bestFocusEntry) {
    records.push({
      type: 'focus_average',
      value: bestFocus,
      dateISO: bestFocusEntry.endDate,
      context: `${bestFocus.toFixed(3)} average focus over 7 days`
    });
  }

  // Calculate study streaks
  const streaks = calculateAllStreaks(cycles);
  const longestStreak = Math.max(...streaks.map(s => s.length));
  const bestStreakEntry = streaks.find(s => s.length === longestStreak);

  if (bestStreakEntry) {
    records.push({
      type: 'study_streak',
      value: longestStreak,
      dateISO: bestStreakEntry.endDate,
      context: `${longestStreak} consecutive study days`
    });
  }

  // Best XP rate
  const xpRates = calculateRollingXPRates(cycles, 5); // 5-cycle rolling average
  const bestXPRate = Math.max(...xpRates.map(x => x.rate));
  const bestXPEntry = xpRates.find(x => x.rate === bestXPRate);

  if (bestXPEntry) {
    records.push({
      type: 'xp_rate',
      value: bestXPRate,
      dateISO: bestXPEntry.endDate,
      context: `${bestXPRate.toFixed(1)} XP/hour sustained rate`
    });
  }

  return records.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
}

function calculateStreakMetrics(cycles: StudyCycleRecord[]): { current: number; best: number } {
  if (cycles.length === 0) return { current: 0, best: 0 };

  const streaks = calculateAllStreaks(cycles);
  const currentStreak = getCurrentStreak(cycles);
  const bestStreak = Math.max(...streaks.map(s => s.length));

  return { current: currentStreak, best: bestStreak };
}

function calculateDailyMetrics(cycles: StudyCycleRecord[]): { today: number; best: number } {
  const dailyHours = groupCyclesByDay(cycles);
  const today = new Date().toISOString().split('T')[0];
  const todayHours = dailyHours[today] || 0;
  const bestDailyHours = Math.max(...Object.values(dailyHours));

  return { today: todayHours, best: bestDailyHours };
}

function calculateWeeklyMetrics(cycles: StudyCycleRecord[]): { thisWeek: number; best: number } {
  const weeklyHours = groupCyclesByWeek(cycles);
  const thisWeek = getCurrentWeek();
  const thisWeekHours = weeklyHours[thisWeek] || 0;
  const bestWeeklyHours = Math.max(...Object.values(weeklyHours));

  return { thisWeek: thisWeekHours, best: bestWeeklyHours };
}

function calculateFocusMetrics(cycles: StudyCycleRecord[]): { recent: number; best: number } {
  const recentCycles = cycles.slice(-14); // Last 14 cycles
  const recentFocus = recentCycles.length > 0 ?
    recentCycles.reduce((sum, c) => sum + c.avgFocus, 0) / recentCycles.length : 0;

  const focusAverages = calculateRollingFocusAverages(cycles, 7);
  const bestFocus = Math.max(...focusAverages.map(f => f.average));

  return { recent: recentFocus, best: bestFocus };
}

function calculateXPMetrics(cycles: StudyCycleRecord[]): { current: number; best: number } {
  const recentCycles = cycles.slice(-10); // Last 10 cycles
  const currentXPRate = recentCycles.length > 0 ?
    recentCycles.reduce((sum, c) => sum + (c.xpGained / (c.studySeconds / 3600)), 0) / recentCycles.length : 0;

  const xpRates = calculateRollingXPRates(cycles, 5);
  const bestXPRate = Math.max(...xpRates.map(x => x.rate));

  return { current: currentXPRate, best: bestXPRate };
}

function calculateTrends(cycles: StudyCycleRecord[]): {
  weeklyChange: number;
  monthlyChange: number;
  trend: 'declining' | 'stable' | 'improving' | 'accelerating';
} {
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000;

  const thisWeek = cycles.filter(c => (now - new Date(c.startedAtISO).getTime()) <= oneWeek);
  const lastWeek = cycles.filter(c => {
    const age = now - new Date(c.startedAtISO).getTime();
    return age > oneWeek && age <= 2 * oneWeek;
  });

  const thisMonth = cycles.filter(c => (now - new Date(c.startedAtISO).getTime()) <= oneMonth);
  const lastMonth = cycles.filter(c => {
    const age = now - new Date(c.startedAtISO).getTime();
    return age > oneMonth && age <= 2 * oneMonth;
  });

  const thisWeekHours = thisWeek.reduce((sum, c) => sum + c.studySeconds / 3600, 0);
  const lastWeekHours = lastWeek.reduce((sum, c) => sum + c.studySeconds / 3600, 0);
  const weeklyChange = lastWeekHours > 0 ? ((thisWeekHours - lastWeekHours) / lastWeekHours) * 100 : 0;

  const thisMonthHours = thisMonth.reduce((sum, c) => sum + c.studySeconds / 3600, 0);
  const lastMonthHours = lastMonth.reduce((sum, c) => sum + c.studySeconds / 3600, 0);
  const monthlyChange = lastMonthHours > 0 ? ((thisMonthHours - lastMonthHours) / lastMonthHours) * 100 : 0;

  let trend: 'declining' | 'stable' | 'improving' | 'accelerating';
  if (weeklyChange < -10) trend = 'declining';
  else if (weeklyChange < 5) trend = 'stable';
  else if (weeklyChange < 25) trend = 'improving';
  else trend = 'accelerating';

  return { weeklyChange, monthlyChange, trend };
}

// Helper functions
function groupCyclesByDay(cycles: StudyCycleRecord[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  cycles.forEach(cycle => {
    const date = cycle.startedAtISO.split('T')[0];
    grouped[date] = (grouped[date] || 0) + (cycle.studySeconds / 3600);
  });
  return grouped;
}

function groupCyclesByWeek(cycles: StudyCycleRecord[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  cycles.forEach(cycle => {
    const week = getWeekKey(new Date(cycle.startedAtISO));
    grouped[week] = (grouped[week] || 0) + (cycle.studySeconds / 3600);
  });
  return grouped;
}

function getWeekKey(date: Date): string {
  const week = new Date(date);
  week.setDate(week.getDate() - week.getDay()); // Start of week (Sunday)
  return week.toISOString().split('T')[0];
}

function getCurrentWeek(): string {
  return getWeekKey(new Date());
}

function calculateAllStreaks(cycles: StudyCycleRecord[]): Array<{ length: number; endDate: string }> {
  const dailyHours = groupCyclesByDay(cycles);
  const dates = Object.keys(dailyHours).sort();

  const streaks: Array<{ length: number; endDate: string }> = [];
  let currentStreak = 0;

  for (let i = 0; i < dates.length; i++) {
    if (dailyHours[dates[i]] > 0) {
      currentStreak++;
    } else {
      if (currentStreak > 0) {
        streaks.push({ length: currentStreak, endDate: dates[i - 1] });
      }
      currentStreak = 0;
    }
  }

  if (currentStreak > 0) {
    streaks.push({ length: currentStreak, endDate: dates[dates.length - 1] });
  }

  return streaks;
}

function getCurrentStreak(cycles: StudyCycleRecord[]): number {
  const dailyHours = groupCyclesByDay(cycles);

  let streak = 0;
  let currentDate = new Date();

  while (true) {
    const dateKey = currentDate.toISOString().split('T')[0];
    if (dailyHours[dateKey] && dailyHours[dateKey] > 0) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function calculateRollingFocusAverages(cycles: StudyCycleRecord[], windowSize: number): Array<{ average: number; endDate: string }> {
  const averages: Array<{ average: number; endDate: string }> = [];

  for (let i = windowSize - 1; i < cycles.length; i++) {
    const window = cycles.slice(i - windowSize + 1, i + 1);
    const average = window.reduce((sum, c) => sum + c.avgFocus, 0) / window.length;
    averages.push({ average, endDate: cycles[i].endedAtISO });
  }

  return averages;
}

function calculateRollingXPRates(cycles: StudyCycleRecord[], windowSize: number): Array<{ rate: number; endDate: string }> {
  const rates: Array<{ rate: number; endDate: string }> = [];

  for (let i = windowSize - 1; i < cycles.length; i++) {
    const window = cycles.slice(i - windowSize + 1, i + 1);
    const totalXP = window.reduce((sum, c) => sum + c.xpGained, 0);
    const totalHours = window.reduce((sum, c) => sum + (c.studySeconds / 3600), 0);
    const rate = totalHours > 0 ? totalXP / totalHours : 0;
    rates.push({ rate, endDate: cycles[i].endedAtISO });
  }

  return rates;
}

function getEmptyMetrics(): CompetitionMetrics {
  return {
    currentStreak: 0,
    bestStreak: 0,
    streakProgress: 0,
    todayHours: 0,
    bestDailyHours: 0,
    dailyProgress: 0,
    thisWeekHours: 0,
    bestWeeklyHours: 0,
    weeklyProgress: 0,
    recentFocusAverage: 0,
    bestFocusAverage: 0,
    focusProgress: 0,
    currentXPRate: 0,
    bestXPRate: 0,
    xpRateProgress: 0,
    personalRecords: [],
    recentAchievements: [],
    thisVsLastWeek: 0,
    thisVsLastMonth: 0,
    improvementTrend: 'stable',
    daysSinceLastRecord: Infinity,
    recordsThisMonth: 0
  };
}
