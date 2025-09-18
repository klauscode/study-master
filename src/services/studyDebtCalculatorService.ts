import type { StudyCycleRecord } from '../types/gameTypes';

export interface StudyDebt {
  totalDebtHours: number;
  compoundedDebt: number; // Debt with penalty compound interest
  dailyInterestRate: number; // Penalty for each day of deficit
  debtLevel: 'manageable' | 'concerning' | 'critical' | 'catastrophic';
  timeToZeroDebt: number; // Days needed to clear debt at current pace
  minimumDailyHours: number; // Hours needed just to stop accumulating debt
  recommendedDailyHours: number; // Hours needed to clear debt by exam
  probabilityCalculation: ProbabilityAnalysis;
}

export interface ProbabilityAnalysis {
  currentTrajectory: ExamProbability;
  withMinimumEffort: ExamProbability;
  withRecommendedEffort: ExamProbability;
  withIntenseEffort: ExamProbability;
  mostLikelyOutcome: string;
  worstCaseScenario: string;
  bestCaseScenario: string;
  realityCheckMessage: string;
}

export interface ExamProbability {
  passChance: number; // 0-100%
  scoreRange: { min: number; max: number };
  requiredDailyHours: number;
  scenario: string;
  confidence: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
}

export interface DebtProjection {
  date: string;
  debtHours: number;
  cumulativeDeficit: number;
  requiredDailyHours: number;
  actualHours: number;
  debtChangeRate: number;
}

export function calculateStudyDebt(
  cycles: StudyCycleRecord[],
  examDate: string,
  targetDailyHours: number = 8
): StudyDebt {
  // Check if exam date is valid
  const examDateTime = new Date(examDate).getTime();
  if (!examDate || isNaN(examDateTime)) {
    // Return zero debt if no valid exam date
    return {
      totalDebtHours: 0,
      compoundedDebt: 0,
      dailyInterestRate: 0,
      debtLevel: 'manageable',
      timeToZeroDebt: 0,
      minimumDailyHours: targetDailyHours,
      recommendedDailyHours: targetDailyHours,
      probabilityCalculation: getDefaultProbabilityAnalysis()
    };
  }

  const daysUntilExam = Math.max(1, Math.ceil((examDateTime - Date.now()) / (1000 * 60 * 60 * 24)));

  // Calculate daily performance vs target
  const dailyPerformance = calculateDailyPerformance(cycles, targetDailyHours);

  // Calculate accumulated debt with compound penalties
  const { totalDebt, compoundedDebt } = calculateAccumulatedDebt(dailyPerformance);

  // Debt severity assessment
  const dailyInterestRate = 0.05; // 5% compound daily for overdue study hours
  const debtLevel = getDebtLevel(compoundedDebt, daysUntilExam);

  // Calculate recovery scenarios
  const currentPace = getCurrentStudyPace(cycles);
  const timeToZeroDebt = compoundedDebt > 0 && currentPace > 0 ? compoundedDebt / currentPace : Infinity;

  const minimumDailyHours = targetDailyHours; // Just to stop accumulating debt
  const recommendedDailyHours = daysUntilExam > 0 ? (compoundedDebt / daysUntilExam) + targetDailyHours : Infinity;

  // Calculate probability scenarios
  const probabilityCalculation = calculateProbabilityScenarios(
    compoundedDebt,
    daysUntilExam,
    currentPace,
    targetDailyHours
  );

  return {
    totalDebtHours: totalDebt,
    compoundedDebt,
    dailyInterestRate,
    debtLevel,
    timeToZeroDebt,
    minimumDailyHours,
    recommendedDailyHours,
    probabilityCalculation
  };
}

function calculateDailyPerformance(cycles: StudyCycleRecord[], targetDailyHours: number): Record<string, number> {
  const dailyPerformance: Record<string, number> = {};

  // If no cycles, return empty performance (no debt)
  if (!cycles || cycles.length === 0) {
    return dailyPerformance;
  }

  // Group cycles by day
  const dailyHours: Record<string, number> = {};
  cycles.forEach(cycle => {
    const date = cycle.startedAtISO.split('T')[0];
    dailyHours[date] = (dailyHours[date] || 0) + (cycle.studySeconds / 3600);
  });

  // Calculate deficit/surplus for each day
  Object.entries(dailyHours).forEach(([date, hours]) => {
    dailyPerformance[date] = hours - targetDailyHours;
  });

  return dailyPerformance;
}

function calculateAccumulatedDebt(dailyPerformance: Record<string, number>): { totalDebt: number; compoundedDebt: number } {
  let totalDebt = 0;
  let compoundedDebt = 0;
  const dailyInterest = 0.05;

  const sortedDates = Object.keys(dailyPerformance).sort();

  // If no performance data, no debt
  if (sortedDates.length === 0) {
    return { totalDebt: 0, compoundedDebt: 0 };
  }

  sortedDates.forEach((date, index) => {
    const deficit = Math.min(0, dailyPerformance[date]); // Only negative values (deficits)
    const debtHours = Math.abs(deficit);

    totalDebt += debtHours;

    // Apply compound interest for each day the debt has been outstanding
    const daysOutstanding = sortedDates.length - index;
    const compoundFactor = Math.pow(1 + dailyInterest, daysOutstanding);
    compoundedDebt += debtHours * compoundFactor;
  });

  return { totalDebt, compoundedDebt };
}

function getDebtLevel(compoundedDebt: number, daysLeft: number): StudyDebt['debtLevel'] {
  const debtPerDay = compoundedDebt / Math.max(1, daysLeft);

  if (debtPerDay >= 6) return 'catastrophic';
  if (debtPerDay >= 4) return 'critical';
  if (debtPerDay >= 2) return 'concerning';
  return 'manageable';
}

function getCurrentStudyPace(cycles: StudyCycleRecord[]): number {
  if (!cycles || cycles.length === 0) return 0;

  // Calculate average daily hours from last 7 days
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

  const recentCycles = cycles.filter(c => new Date(c.startedAtISO).getTime() >= weekAgo);
  const totalHours = recentCycles.reduce((sum, c) => sum + c.studySeconds / 3600, 0);

  return totalHours / 7; // Daily average
}

function calculateProbabilityScenarios(
  debtHours: number,
  daysLeft: number,
  currentPace: number,
  targetDailyHours: number
): ProbabilityAnalysis {
  const scenarios = [
    {
      name: 'currentTrajectory',
      dailyHours: currentPace,
      description: 'Continuing current study pace'
    },
    {
      name: 'withMinimumEffort',
      dailyHours: targetDailyHours,
      description: 'Meeting minimum daily target'
    },
    {
      name: 'withRecommendedEffort',
      dailyHours: Math.max(targetDailyHours, (debtHours / daysLeft) + targetDailyHours),
      description: 'Following debt recovery plan'
    },
    {
      name: 'withIntenseEffort',
      dailyHours: Math.max(targetDailyHours * 1.5, (debtHours / (daysLeft * 0.7)) + targetDailyHours),
      description: 'Maximum sustainable effort'
    }
  ];

  const probabilities: Record<string, ExamProbability> = {};

  scenarios.forEach(scenario => {
    const totalStudyHours = scenario.dailyHours * daysLeft;
    const netProgress = totalStudyHours - debtHours;

    // Calculate pass probability based on net study progress
    let passChance: number;
    if (netProgress <= 0) passChance = 5; // Almost certain failure
    else if (netProgress < targetDailyHours * daysLeft * 0.5) passChance = 15;
    else if (netProgress < targetDailyHours * daysLeft * 0.7) passChance = 35;
    else if (netProgress < targetDailyHours * daysLeft * 0.9) passChance = 65;
    else if (netProgress < targetDailyHours * daysLeft) passChance = 80;
    else passChance = 95;

    // Adjust for time pressure
    if (daysLeft <= 7) passChance *= 0.8;
    else if (daysLeft <= 14) passChance *= 0.9;

    const scoreRange = calculateScoreRange(passChance, netProgress, targetDailyHours * daysLeft);
    const confidence = getConfidenceLevel(passChance, scenario.dailyHours, currentPace);

    probabilities[scenario.name] = {
      passChance: Math.max(0, Math.min(100, passChance)),
      scoreRange,
      requiredDailyHours: scenario.dailyHours,
      scenario: scenario.description,
      confidence
    };
  });

  const mostLikelyOutcome = generateMostLikelyOutcome(probabilities.currentTrajectory);
  const worstCaseScenario = generateWorstCaseScenario(debtHours, daysLeft);
  const bestCaseScenario = generateBestCaseScenario(probabilities.withIntenseEffort);
  const realityCheckMessage = generateRealityCheckMessage(probabilities.currentTrajectory, debtHours);

  return {
    currentTrajectory: probabilities.currentTrajectory,
    withMinimumEffort: probabilities.withMinimumEffort,
    withRecommendedEffort: probabilities.withRecommendedEffort,
    withIntenseEffort: probabilities.withIntenseEffort,
    mostLikelyOutcome,
    worstCaseScenario,
    bestCaseScenario,
    realityCheckMessage
  };
}

function calculateScoreRange(passChance: number, netProgress: number, targetProgress: number): { min: number; max: number } {
  const progressRatio = Math.max(0, netProgress / targetProgress);

  const baseScore = Math.min(100, 30 + (progressRatio * 55)); // 30-85 base range
  const variance = Math.max(5, 20 - (passChance / 5)); // Higher pass chance = lower variance

  return {
    min: Math.max(0, Math.round(baseScore - variance)),
    max: Math.min(100, Math.round(baseScore + variance))
  };
}

function getConfidenceLevel(passChance: number, requiredHours: number, currentPace: number): ExamProbability['confidence'] {
  const paceRatio = currentPace > 0 ? requiredHours / currentPace : 0;

  if (passChance < 20 || paceRatio > 3) return 'very_low';
  if (passChance < 40 || paceRatio > 2) return 'low';
  if (passChance < 60 || paceRatio > 1.5) return 'moderate';
  if (passChance < 80) return 'high';
  return 'very_high';
}

function generateMostLikelyOutcome(current: ExamProbability): string {
  if (current.passChance < 15) {
    return `💀 Exam failure almost certain (${current.passChance}% pass chance). Score likely ${current.scoreRange.min}-${current.scoreRange.max}%.`;
  }
  if (current.passChance < 40) {
    return `🚨 High risk of failure (${current.passChance}% pass chance). Major intervention needed immediately.`;
  }
  if (current.passChance < 60) {
    return `⚠️ Uncertain outcome (${current.passChance}% pass chance). Critical improvement required.`;
  }
  if (current.passChance < 80) {
    return `📈 Moderate chance of success (${current.passChance}% pass chance). Stay consistent.`;
  }
  return `✅ Good trajectory (${current.passChance}% pass chance). Maintain current effort.`;
}

function generateWorstCaseScenario(debtHours: number, daysLeft: number): string {
  if (debtHours === 0) {
    return `📉 If you stop studying completely, exam failure is guaranteed.`;
  }

  const debtPerDay = debtHours / daysLeft;
  if (debtPerDay >= 6) {
    return `💀 CATASTROPHIC: ${debtHours.toFixed(0)}h debt + ${daysLeft} days = Impossible recovery. Exam failure certain.`;
  }
  if (debtPerDay >= 4) {
    return `🚨 CRITICAL: Current debt trajectory leads to 15-25% exam score. Consider deferring exam.`;
  }
  return `⚠️ If current deficit continues, expect 30-45% exam score. Recovery still possible but urgent.`;
}

function generateBestCaseScenario(intense: ExamProbability): string {
  if (intense.passChance >= 90) {
    return `🏆 With maximum effort (${intense.requiredDailyHours.toFixed(1)}h/day), ${intense.passChance}% pass chance and 75-85% score possible.`;
  }
  if (intense.passChance >= 70) {
    return `🎯 Intensive studying (${intense.requiredDailyHours.toFixed(1)}h/day) gives ${intense.passChance}% pass chance.`;
  }
  return `📈 Even with maximum effort (${intense.requiredDailyHours.toFixed(1)}h/day), only ${intense.passChance}% pass chance. Consider alternatives.`;
}

function generateRealityCheckMessage(current: ExamProbability, debtHours: number): string {
  if (debtHours === 0) {
    return `✅ No study debt! You're on track. Current trajectory: ${current.passChance}% pass chance.`;
  }

  if (current.passChance < 30) {
    return `💀 BRUTAL REALITY: ${debtHours.toFixed(0)}h study debt. Current pace = exam failure. Immediate drastic action required.`;
  }

  if (current.passChance < 50) {
    return `🚨 HARSH TRUTH: Significant study debt accumulated. Current trajectory leads to likely failure.`;
  }

  return `⚠️ Study debt exists but recoverable with consistent effort. Don't let it compound further.`;
}

export function generateDebtProjection(
  cycles: StudyCycleRecord[],
  examDate: string,
  targetDailyHours: number,
  projectionDays: number = 14
): DebtProjection[] {
  // Check if exam date is valid
  const examDateTime = new Date(examDate).getTime();
  if (!examDate || isNaN(examDateTime)) {
    return [];
  }

  const projections: DebtProjection[] = [];
  const dailyPerformance = calculateDailyPerformance(cycles, targetDailyHours);

  let cumulativeDeficit = Object.values(dailyPerformance)
    .filter(deficit => deficit < 0)
    .reduce((sum, deficit) => sum + Math.abs(deficit), 0);

  for (let i = 0; i < projectionDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const actualHours = dailyPerformance[dateStr] || 0;
    const debtChange = Math.max(0, targetDailyHours - actualHours);
    cumulativeDeficit += debtChange;

    projections.push({
      date: dateStr,
      debtHours: debtChange,
      cumulativeDeficit,
      requiredDailyHours: targetDailyHours,
      actualHours: Math.max(0, actualHours),
      debtChangeRate: debtChange
    });
  }

  return projections;
}

function getDefaultProbabilityAnalysis(): ProbabilityAnalysis {
  const defaultProbability: ExamProbability = {
    passChance: 50,
    scoreRange: { min: 40, max: 60 },
    requiredDailyHours: 8,
    scenario: 'No exam date set',
    confidence: 'very_low'
  };

  return {
    currentTrajectory: defaultProbability,
    withMinimumEffort: defaultProbability,
    withRecommendedEffort: defaultProbability,
    withIntenseEffort: defaultProbability,
    mostLikelyOutcome: 'Set an exam date to see projections',
    worstCaseScenario: 'No exam configured',
    bestCaseScenario: 'Configure your exam in Settings',
    realityCheckMessage: 'Set your exam date in Settings to track study debt'
  };
}