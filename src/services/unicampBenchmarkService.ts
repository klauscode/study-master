import type { StudyCycleRecord, MockExamScore } from '../types/gameTypes';

export interface UnicampBenchmarkData {
  medianDailyHours: number;
  top10DailyHours: number;
  averagePreparationDays: number;
  minimumViableHours: number;
  successfulStudentProfiles: StudentProfile[];
  criticalMilestones: Milestone[];
}

export interface StudentProfile {
  id: string;
  finalScore: number;
  totalStudyHours: number;
  dailyAverage: number;
  preparationDays: number;
  mockScoreProgression: number[];
  studyPattern: 'intense_short' | 'steady_long' | 'inconsistent' | 'cramming';
  outcome: 'passed' | 'failed';
}

export interface Milestone {
  daysBeforeExam: number;
  expectedScore: number;
  requiredDailyHours: number;
  description: string;
  severity: 'critical' | 'warning' | 'target' | 'excellent';
}

export interface BenchmarkAnalysis {
  userRank: number; // Out of 100 (percentile)
  comparison: 'far_behind' | 'behind' | 'on_track' | 'ahead' | 'exceptional';
  dailyHoursVsMedian: number; // Percentage difference
  dailyHoursVsTop10: number;
  projectedOutcome: 'very_likely_fail' | 'likely_fail' | 'uncertain' | 'likely_pass' | 'very_likely_pass';
  closestProfile: StudentProfile;
  nextMilestone: Milestone | null;
  realityMessage: string;
  motivationMessage: string;
}

// Historical Unicamp entrance exam data (simulated based on real patterns)
const UNICAMP_HISTORICAL_DATA: UnicampBenchmarkData = {
  medianDailyHours: 6.5,
  top10DailyHours: 9.2,
  averagePreparationDays: 180,
  minimumViableHours: 4.0,
  successfulStudentProfiles: [
    {
      id: 'intense_A',
      finalScore: 78,
      totalStudyHours: 520,
      dailyAverage: 8.7,
      preparationDays: 60,
      mockScoreProgression: [45, 52, 61, 69, 75, 78],
      studyPattern: 'intense_short',
      outcome: 'passed'
    },
    {
      id: 'steady_A',
      finalScore: 82,
      totalStudyHours: 950,
      dailyAverage: 6.8,
      preparationDays: 140,
      mockScoreProgression: [35, 42, 48, 56, 65, 72, 78, 82],
      studyPattern: 'steady_long',
      outcome: 'passed'
    },
    {
      id: 'intense_B',
      finalScore: 71,
      totalStudyHours: 480,
      dailyAverage: 9.6,
      preparationDays: 50,
      mockScoreProgression: [50, 58, 65, 68, 71],
      studyPattern: 'intense_short',
      outcome: 'passed'
    },
    {
      id: 'steady_B',
      finalScore: 75,
      totalStudyHours: 720,
      dailyAverage: 5.8,
      preparationDays: 124,
      mockScoreProgression: [30, 38, 45, 52, 59, 67, 73, 75],
      studyPattern: 'steady_long',
      outcome: 'passed'
    },
    {
      id: 'inconsistent_fail',
      finalScore: 42,
      totalStudyHours: 280,
      dailyAverage: 3.2,
      preparationDays: 87,
      mockScoreProgression: [25, 32, 38, 35, 41, 42],
      studyPattern: 'inconsistent',
      outcome: 'failed'
    },
    {
      id: 'cramming_fail',
      finalScore: 38,
      totalStudyHours: 200,
      dailyAverage: 10.0,
      preparationDays: 20,
      mockScoreProgression: [20, 30, 38],
      studyPattern: 'cramming',
      outcome: 'failed'
    }
  ],
  criticalMilestones: [
    {
      daysBeforeExam: 30,
      expectedScore: 65,
      requiredDailyHours: 7.0,
      description: "Critical checkpoint - must score 65+ on mock exams",
      severity: 'critical'
    },
    {
      daysBeforeExam: 20,
      expectedScore: 70,
      requiredDailyHours: 8.0,
      description: "Danger zone - need 70+ to have decent chance",
      severity: 'warning'
    },
    {
      daysBeforeExam: 14,
      expectedScore: 72,
      requiredDailyHours: 8.5,
      description: "Final sprint - maintain 72+ performance",
      severity: 'warning'
    },
    {
      daysBeforeExam: 7,
      expectedScore: 75,
      requiredDailyHours: 9.0,
      description: "Last week - peak performance required",
      severity: 'critical'
    }
  ]
};

export function calculateUnicampBenchmark(
  cycles: StudyCycleRecord[],
  mockExams: MockExamScore[],
  examDate: string
): BenchmarkAnalysis {
  const daysUntilExam = Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  // Calculate user's current metrics
  const totalHours = cycles.reduce((sum, c) => sum + c.studySeconds / 3600, 0);
  const studyDays = getUniqueDaysStudied(cycles);
  const dailyAverage = studyDays > 0 ? totalHours / studyDays : 0;

  // trend calculations can be added here in future if needed
  const currentScore = mockExams.length > 0 ? mockExams[mockExams.length - 1].percentage : 0;

  // Compare against historical data
  const dailyHoursVsMedian = ((dailyAverage - UNICAMP_HISTORICAL_DATA.medianDailyHours) / UNICAMP_HISTORICAL_DATA.medianDailyHours) * 100;
  const dailyHoursVsTop10 = ((dailyAverage - UNICAMP_HISTORICAL_DATA.top10DailyHours) / UNICAMP_HISTORICAL_DATA.top10DailyHours) * 100;

  // Find closest matching profile
  const closestProfile = findClosestProfile(dailyAverage, totalHours, studyDays, currentScore);

  // Calculate percentile rank
  const userRank = calculatePercentileRank(dailyAverage, totalHours, currentScore);

  // Determine comparison category
  const comparison = getComparisonCategory(dailyAverage, currentScore, daysUntilExam);

  // Project outcome based on current trajectory
  const projectedOutcome = projectExamOutcome(dailyAverage, currentScore, daysUntilExam, mockExams);

  // Find next milestone
  const nextMilestone = UNICAMP_HISTORICAL_DATA.criticalMilestones.find(m => m.daysBeforeExam <= daysUntilExam) || null;

  // Generate messages
  const realityMessage = generateRealityMessage(comparison, projectedOutcome, dailyHoursVsMedian, daysUntilExam);
  const motivationMessage = generateMotivationMessage(comparison, closestProfile, nextMilestone);

  return {
    userRank,
    comparison,
    dailyHoursVsMedian,
    dailyHoursVsTop10,
    projectedOutcome,
    closestProfile,
    nextMilestone,
    realityMessage,
    motivationMessage
  };
}

function getUniqueDaysStudied(cycles: StudyCycleRecord[]): number {
  const days = new Set(cycles.map(c => c.startedAtISO.split('T')[0]));
  return days.size;
}

// Note: recent daily average computation removed for now to satisfy noUnusedLocals

function findClosestProfile(dailyAvg: number, _totalHours: number, _studyDays: number, currentScore: number): StudentProfile {
  const profiles = UNICAMP_HISTORICAL_DATA.successfulStudentProfiles;

  let closest = profiles[0];
  let minDistance = Infinity;

  profiles.forEach(profile => {
    // Multi-dimensional distance calculation
    const dailyDiff = Math.abs(dailyAvg - profile.dailyAverage);
    const scoreDiff = Math.abs(currentScore - (profile.mockScoreProgression[profile.mockScoreProgression.length - 1] || 0));
    const daysDiff = Math.abs(_studyDays - profile.preparationDays);

    const distance = dailyDiff * 2 + scoreDiff * 1.5 + daysDiff * 0.1;

    if (distance < minDistance) {
      minDistance = distance;
      closest = profile;
    }
  });

  return closest;
}

function calculatePercentileRank(dailyAvg: number, totalHours: number, currentScore: number): number {
  // Simulate percentile based on multiple factors
  let rank = 50; // Start at median

  // Daily hours factor (40% weight)
  if (dailyAvg >= UNICAMP_HISTORICAL_DATA.top10DailyHours) rank += 30;
  else if (dailyAvg >= UNICAMP_HISTORICAL_DATA.medianDailyHours) rank += 15;
  else if (dailyAvg >= UNICAMP_HISTORICAL_DATA.minimumViableHours) rank -= 10;
  else rank -= 25;

  // Current score factor (35% weight)
  if (currentScore >= 75) rank += 25;
  else if (currentScore >= 65) rank += 15;
  else if (currentScore >= 50) rank += 5;
  else if (currentScore >= 35) rank -= 5;
  else rank -= 20;

  // Total effort factor (25% weight)
  if (totalHours >= 500) rank += 15;
  else if (totalHours >= 300) rank += 10;
  else if (totalHours >= 150) rank += 5;
  else rank -= 10;

  return Math.max(1, Math.min(99, Math.round(rank)));
}

function getComparisonCategory(dailyAvg: number, currentScore: number, _daysLeft: number): BenchmarkAnalysis['comparison'] {
  const hoursFactor = dailyAvg / UNICAMP_HISTORICAL_DATA.medianDailyHours;
  const scoreFactor = currentScore / 65; // Expected score at this point
  const combined = (hoursFactor + scoreFactor) / 2;

  if (combined >= 1.3) return 'exceptional';
  if (combined >= 1.1) return 'ahead';
  if (combined >= 0.9) return 'on_track';
  if (combined >= 0.7) return 'behind';
  return 'far_behind';
}

function projectExamOutcome(dailyAvg: number, currentScore: number, daysLeft: number, mockExams: MockExamScore[]): BenchmarkAnalysis['projectedOutcome'] {
  // Factor in improvement trend from mock exams
  let improvementRate = 0;
  if (mockExams.length >= 2) {
    const recent = mockExams.slice(-2);
    const daysBetween = (new Date(recent[1].dateISO).getTime() - new Date(recent[0].dateISO).getTime()) / (1000 * 60 * 60 * 24);
    improvementRate = daysBetween > 0 ? (recent[1].percentage - recent[0].percentage) / daysBetween : 0;
  }

  const projectedScore = currentScore + (improvementRate * daysLeft);
  const hoursFactor = dailyAvg / UNICAMP_HISTORICAL_DATA.medianDailyHours;

  // Combine projected score with study intensity
  const overallScore = (projectedScore * 0.7) + (hoursFactor * 30);

  if (overallScore >= 75) return 'very_likely_pass';
  if (overallScore >= 65) return 'likely_pass';
  if (overallScore >= 50) return 'uncertain';
  if (overallScore >= 35) return 'likely_fail';
  return 'very_likely_fail';
}

function generateRealityMessage(comparison: string, _outcome: string, vsMedian: number, daysLeft: number): string {
  if (comparison === 'exceptional') {
    return `🏆 Elite performance! You're studying ${Math.abs(vsMedian).toFixed(0)}% more than median successful students.`;
  }

  if (comparison === 'ahead') {
    return `🎯 Above average trajectory. You're outperforming ${Math.round(70 + vsMedian/2)}% of historical students.`;
  }

  if (comparison === 'on_track') {
    return `✅ Decent pace but no room for complacency. ${daysLeft} days to optimize everything.`;
  }

  if (comparison === 'behind') {
    return `⚠️ Below median performance. You're studying ${Math.abs(vsMedian).toFixed(0)}% less than successful students. Critical improvement needed.`;
  }

  return `🚨 DANGER: Far below successful student patterns. ${Math.abs(vsMedian).toFixed(0)}% deficit vs median. Exam failure highly probable.`;
}

function generateMotivationMessage(comparison: string, profile: StudentProfile, milestone: Milestone | null): string {
  const profileMessage = profile.outcome === 'passed' ?
    `Similar student (${profile.dailyAverage.toFixed(1)}h/day) scored ${profile.finalScore}%` :
    `⚠️ Similar pattern led to ${profile.finalScore}% failure`;

  const milestoneMessage = milestone ?
    `Next milestone: ${milestone.description} (${milestone.daysBeforeExam} days)` :
    `Focus on maintaining peak performance until exam day`;

  if (comparison === 'exceptional' || comparison === 'ahead') {
    return `${profileMessage}. Keep this intensity! ${milestoneMessage}`;
  }

  return `${profileMessage}. ${milestoneMessage}`;
}

export function getUnicampHistoricalData(): UnicampBenchmarkData {
  return UNICAMP_HISTORICAL_DATA;
}

export function getMilestoneStatus(daysUntilExam: number, currentScore: number): {
  current: Milestone | null;
  isOnTrack: boolean;
  deficit: number;
} {
  const milestone = UNICAMP_HISTORICAL_DATA.criticalMilestones.find(m =>
    daysUntilExam <= m.daysBeforeExam + 2 && daysUntilExam >= m.daysBeforeExam - 2
  );

  if (!milestone) {
    return { current: null, isOnTrack: true, deficit: 0 };
  }

  const deficit = milestone.expectedScore - currentScore;
  const isOnTrack = deficit <= 5; // 5 point tolerance

  return { current: milestone, isOnTrack, deficit };
}
