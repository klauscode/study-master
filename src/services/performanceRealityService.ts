export interface MockExamScore {
  id: string;
  examName: string;
  dateISO: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  timeSpentMinutes: number;
  subjects: {
    [subject: string]: {
      correct: number;
      total: number;
      percentage: number;
    };
  };
  targetScore?: number; // What score they need for their goal
}

export interface PerformanceAnalysis {
  currentReadiness: number; // 0-100 percentage
  projectedExamScore: number; // Based on trend
  improvementRate: number; // Points per week
  timeToTarget: number; // Weeks to reach target score
  confidenceLevel: 'critical' | 'low' | 'moderate' | 'high';
  weakestSubjects: string[];
  strongestSubjects: string[];
  recommendation: string;
  realityCheck: string;
  studyEfficiency: number; // Score improvement per hour studied
}

export interface StudyEffectiveness {
  hoursStudied: number;
  scoreImprovement: number;
  efficiency: number; // points per hour
}

export function calculatePerformanceReality(
  mockScores: MockExamScore[],
  studyHours: number,
  targetScore: number = 80,
  examDate: string
): PerformanceAnalysis {
  if (mockScores.length === 0) {
    return getDefaultAnalysis(targetScore);
  }

  // Sort scores by date
  const sortedScores = [...mockScores].sort((a, b) =>
    new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
  );

  const latestScore = sortedScores[sortedScores.length - 1];
  const currentReadiness = latestScore.percentage;

  // Calculate improvement trend
  let improvementRate = 0;
  if (sortedScores.length >= 2) {
    const firstScore = sortedScores[0];
    const timeSpanWeeks = (new Date(latestScore.dateISO).getTime() - new Date(firstScore.dateISO).getTime()) / (1000 * 60 * 60 * 24 * 7);
    const scoreImprovement = latestScore.percentage - firstScore.percentage;
    improvementRate = timeSpanWeeks > 0 ? scoreImprovement / timeSpanWeeks : 0;
  }

  // Project exam score based on current trend
  const weeksUntilExam = Math.max(0, (new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7));
  const projectedImprovement = improvementRate * weeksUntilExam;
  const projectedExamScore = Math.max(0, Math.min(100, currentReadiness + projectedImprovement));

  // Calculate time to target
  const pointsNeeded = targetScore - currentReadiness;
  const timeToTarget = improvementRate > 0 ? pointsNeeded / improvementRate : Infinity;

  // Calculate study efficiency
  const studyEfficiency = studyHours > 0 && improvementRate > 0 ?
    (improvementRate / (studyHours / weeksUntilExam || 1)) : 0;

  // Analyze subject performance
  const subjectAnalysis = analyzeSubjectPerformance(sortedScores);

  // Determine confidence level
  const confidenceLevel = getConfidenceLevel(currentReadiness, projectedExamScore, targetScore, timeToTarget);

  // Generate recommendations and reality checks
  const recommendation = getRecommendation(currentReadiness, targetScore, improvementRate, timeToTarget, subjectAnalysis);
  const realityCheck = getRealityCheck(currentReadiness, projectedExamScore, targetScore, weeksUntilExam);

  return {
    currentReadiness,
    projectedExamScore,
    improvementRate,
    timeToTarget,
    confidenceLevel,
    weakestSubjects: subjectAnalysis.weakest,
    strongestSubjects: subjectAnalysis.strongest,
    recommendation,
    realityCheck,
    studyEfficiency
  };
}

function analyzeSubjectPerformance(scores: MockExamScore[]): {
  weakest: string[];
  strongest: string[];
} {
  if (scores.length === 0) return { weakest: [], strongest: [] };

  const latestScore = scores[scores.length - 1];
  const subjects = Object.entries(latestScore.subjects);

  if (subjects.length === 0) return { weakest: [], strongest: [] };

  const sorted = subjects.sort((a, b) => a[1].percentage - b[1].percentage);

  return {
    weakest: sorted.slice(0, Math.min(3, Math.ceil(subjects.length / 2))).map(s => s[0]),
    strongest: sorted.slice(-Math.min(3, Math.ceil(subjects.length / 2))).map(s => s[0])
  };
}

function getConfidenceLevel(
  current: number,
  projected: number,
  target: number,
  timeToTarget: number
): 'critical' | 'low' | 'moderate' | 'high' {
  if (current < 30 || projected < target - 20 || timeToTarget > 20) return 'critical';
  if (current < 50 || projected < target - 10 || timeToTarget > 10) return 'low';
  if (current < 70 || projected < target) return 'moderate';
  return 'high';
}

function getRecommendation(
  current: number,
  target: number,
  _improvementRate: number,
  _timeToTarget: number,
  subjectAnalysis: { weakest: string[]; strongest: string[] }
): string {
  const gap = target - current;

  if (gap <= 5) {
    return `🎯 You're close! Focus on ${subjectAnalysis.weakest[0] || 'weak areas'} and maintain current pace.`;
  }

  if (gap <= 15) {
    return `📈 Solid progress needed. Prioritize ${subjectAnalysis.weakest.slice(0, 2).join(' and ')} immediately.`;
  }

  if (gap <= 30) {
    return `🚨 Major improvement required. Double study time on ${subjectAnalysis.weakest.join(', ')}. Consider tutoring.`;
  }

  return `💀 Critical situation. Complete study method overhaul needed. Seek immediate professional help.`;
}

function getRealityCheck(
  _current: number,
  projected: number,
  target: number,
  weeksLeft: number
): string {
  const gap = target - projected;

  if (gap <= 0) {
    return `✅ You're on track to exceed your target! Keep pushing!`;
  }

  if (gap <= 5) {
    return `⚠️ Slightly behind target. Need ${gap.toFixed(1)} more points.`;
  }

  if (gap <= 15) {
    return `🔥 Seriously behind! You need ${gap.toFixed(1)} more points in ${weeksLeft.toFixed(1)} weeks.`;
  }

  if (gap <= 30) {
    return `💣 DANGER ZONE: ${gap.toFixed(1)} points short of target with ${weeksLeft.toFixed(1)} weeks left!`;
  }

  return `💀 FAILING TRAJECTORY: At current pace, you'll score ${projected.toFixed(1)}% vs ${target}% target. Exam failure likely.`;
}

function getDefaultAnalysis(_targetScore: number): PerformanceAnalysis {
  return {
    currentReadiness: 0,
    projectedExamScore: 0,
    improvementRate: 0,
    timeToTarget: Infinity,
    confidenceLevel: 'critical',
    weakestSubjects: [],
    strongestSubjects: [],
    recommendation: '🚨 Take a mock exam immediately to assess your current level!',
    realityCheck: '❓ Unknown readiness level. Take practice tests to get reality check.',
    studyEfficiency: 0
  };
}

// Helper functions for mock exam management
export function calculateMockExamScore(
  correct: number,
  total: number,
  timeSpentMinutes: number,
  subjectBreakdown?: { [subject: string]: { correct: number; total: number } }
): MockExamScore {
  const percentage = total > 0 ? (correct / total) * 100 : 0;

  const subjects: { [subject: string]: { correct: number; total: number; percentage: number } } = {};
  if (subjectBreakdown) {
    Object.entries(subjectBreakdown).forEach(([subject, data]) => {
      subjects[subject] = {
        ...data,
        percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0
      };
    });
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    examName: `Mock Exam ${new Date().toLocaleDateString()}`,
    dateISO: new Date().toISOString(),
    totalQuestions: total,
    correctAnswers: correct,
    percentage,
    timeSpentMinutes,
    subjects
  };
}

export function getPerformanceSeverity(analysis: PerformanceAnalysis): {
  level: 'critical' | 'danger' | 'warning' | 'good' | 'excellent';
  color: string;
  icon: string;
} {
  const { currentReadiness, projectedExamScore, confidenceLevel } = analysis;

  if (confidenceLevel === 'critical' || currentReadiness < 30) {
    return { level: 'critical', color: '#7c2d12', icon: '💀' };
  }

  if (confidenceLevel === 'low' || currentReadiness < 50) {
    return { level: 'danger', color: '#dc2626', icon: '🚨' };
  }

  if (confidenceLevel === 'moderate' || currentReadiness < 70) {
    return { level: 'warning', color: '#f59e0b', icon: '⚠️' };
  }

  if (projectedExamScore >= 85) {
    return { level: 'excellent', color: '#059669', icon: '🏆' };
  }

  return { level: 'good', color: '#22c55e', icon: '✅' };
}