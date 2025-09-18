import type { SubjectGem } from '../types/gameTypes';

// Exam-optimized forgetting curve constants (reduced for study pressure)
const EXAM_DECAY_RATE = 0.05; // Slower decay rate (was 0.15)
const EXAM_DECAY_THRESHOLD_HOURS = 48; // Start decay after 48 hours (was 24)
const EXAM_MAX_DECAY_PERCENT = 0.15; // Maximum 15% XP loss (was 40%)

export interface DecayCalculation {
  currentEffectiveXP: number;
  decayedAmount: number;
  decayPercent: number;
  hoursSinceStudy: number;
  isInDangerZone: boolean; // true if significant decay is occurring
  recoveryStudyHours: number; // hours needed to recover lost XP
}

export function calculateKnowledgeDecay(gem: SubjectGem, nowISO: string): DecayCalculation {
  if (!gem.lastStudiedISO) {
    // Never studied, no decay
    return {
      currentEffectiveXP: gem.xp,
      decayedAmount: 0,
      decayPercent: 0,
      hoursSinceStudy: 0,
      isInDangerZone: false,
      recoveryStudyHours: 0,
    };
  }

  const lastStudied = new Date(gem.lastStudiedISO);
  const now = new Date(nowISO);
  const hoursSinceStudy = (now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60);

  if (hoursSinceStudy < EXAM_DECAY_THRESHOLD_HOURS) {
    // No decay yet
    return {
      currentEffectiveXP: gem.xp,
      decayedAmount: 0,
      decayPercent: 0,
      hoursSinceStudy,
      isInDangerZone: false,
      recoveryStudyHours: 0,
    };
  }

  // Calculate decay using exponential decay formula with exam-optimized rates
  const decayTime = hoursSinceStudy - EXAM_DECAY_THRESHOLD_HOURS;
  const decayFactor = Math.exp(-EXAM_DECAY_RATE * decayTime / 24); // Normalize to days
  const retentionPercent = Math.max(1 - EXAM_MAX_DECAY_PERCENT, decayFactor);

  const peakXP = gem.peakXP || gem.xp;
  const maxDecayableXP = peakXP * EXAM_MAX_DECAY_PERCENT;
  const actualDecayedAmount = maxDecayableXP * (1 - retentionPercent);

  const currentEffectiveXP = Math.max(0, gem.xp - actualDecayedAmount);
  const decayPercent = gem.xp > 0 ? (actualDecayedAmount / gem.xp) * 100 : 0;

  return {
    currentEffectiveXP,
    decayedAmount: actualDecayedAmount,
    decayPercent,
    hoursSinceStudy,
    isInDangerZone: decayPercent > 5, // Danger if losing more than 5%
    recoveryStudyHours: Math.ceil(actualDecayedAmount / 10), // Rough estimate: 10 XP per hour
  };
}

export function applyDecayToGem(gem: SubjectGem, nowISO: string): SubjectGem {
  const decay = calculateKnowledgeDecay(gem, nowISO);

  return {
    ...gem,
    peakXP: Math.max(gem.peakXP || gem.xp, gem.xp),
    decayedXP: decay.decayedAmount,
  };
}

export function getAllGemsDecayStatus(gems: SubjectGem[], nowISO: string): Array<SubjectGem & { decay: DecayCalculation }> {
  return gems.map(gem => ({
    ...gem,
    decay: calculateKnowledgeDecay(gem, nowISO),
  }));
}

// Spaced repetition optimal intervals (in hours)
export const SPACED_REPETITION_INTERVALS = [1, 4, 24, 72, 168, 336]; // 1h, 4h, 1d, 3d, 1w, 2w

export function getOptimalReviewTime(gem: SubjectGem): { nextReviewISO: string; intervalIndex: number } {
  const reviewCount = gem.level - 1; // Use level as proxy for review count
  const intervalIndex = Math.min(reviewCount, SPACED_REPETITION_INTERVALS.length - 1);
  const intervalHours = SPACED_REPETITION_INTERVALS[intervalIndex];

  const lastStudied = new Date(gem.lastStudiedISO || Date.now());
  const nextReview = new Date(lastStudied.getTime() + intervalHours * 60 * 60 * 1000);

  return {
    nextReviewISO: nextReview.toISOString(),
    intervalIndex,
  };
}