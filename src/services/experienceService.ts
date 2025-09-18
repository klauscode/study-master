// Experience and focus/stamina related calculations
import type { Item, GameState, GemCategory, ActiveConsumable } from '../types/gameTypes';

export const BASE_XP_PER_MINUTE = 20; // Base_Rate
export const LEVEL_BASE_XP = 100; // Base_XP for curve
export const LEVEL_EXPONENT = 1.55; // scaling exponent

export function sumXpBonusAffixes(items: Item[]): number {
  return items
    .flatMap((it) => it.affixes)
    .filter((a) => a.stat === 'xpGainPercent')
    .reduce((acc, a) => acc + a.value, 0);
}

function getActiveConsumableMultiplier(activeConsumables: ActiveConsumable[], effectType: string): number {
  if (!activeConsumables) return 1.0;

  const now = Date.now();
  let multiplier = 1.0;

  for (const consumable of activeConsumables) {
    // Check if consumable is still active
    if (new Date(consumable.endsAt).getTime() <= now) continue;

    // Find matching effect
    const effect = consumable.effects.find(e => e.type === effectType);
    if (effect) {
      multiplier *= effect.value;
    }
  }

  return multiplier;
}

export function calculateXpPerMinute(state: GameState): number {
  const equippedItems = Object.values(state.character.equipped).filter(
    (x): x is Item => Boolean(x)
  );
  const xpBonusPercent = sumXpBonusAffixes(equippedItems);
  const focusMultiplier = state.focus.multiplier; // 1.00..1.50

  const categoryNudge = computeCategoryNudge(state);

  // Get XP multiplier from active consumables
  const consumableXpMultiplier = getActiveConsumableMultiplier(state.activeConsumables || [], 'xp_multiplier');

  let rate = BASE_XP_PER_MINUTE * (1 + xpBonusPercent / 100) * focusMultiplier * categoryNudge * consumableXpMultiplier;

  // Fatigued debuff when stamina < 30: -20% final XP
  if (state.stamina.current < 30) {
    rate *= 0.8;
  }

  return rate;
}

export function calculateXPForNextLevel(currentLevel: number): number {
  // XP required to go from N to N+1 = 100 * N^1.55
  if (currentLevel < 1) return LEVEL_BASE_XP; // safe floor
  return Math.floor(LEVEL_BASE_XP * Math.pow(currentLevel, LEVEL_EXPONENT));
}

// Focus rules:
// - +0.01 per uninterrupted 60s, capped at 1.50
// - Pause freezes for 90s, after which it decays at 0.10 per second to min 1.00
export function tickFocus(
  multiplier: number,
  uninterruptedSeconds: number,
  isStudying: boolean,
  pausedAt: number | null,
  nowMs: number,
  deltaSeconds: number,
  generationRateMultiplier: number, // 1.0 base; includes gear bonuses and fatigue adjustments
  maxCap: number, // dynamic focus cap, e.g. 1.5 * (1 + capBonus)
  suppressDecay: boolean, // when true (e.g., during rest), do not decay or change pause state
  activeConsumables?: ActiveConsumable[] // add consumables for focus multiplier
): { multiplier: number; uninterruptedSeconds: number; pausedAt: number | null } {
  let m = multiplier;
  let streak = uninterruptedSeconds;
  let paused = pausedAt;

  // Apply focus multiplier from consumables
  const consumableFocusMultiplier = getActiveConsumableMultiplier(activeConsumables || [], 'focus_multiplier');

  if (isStudying) {
    // studying: increase streak and gain focus every 60s
    paused = null;
    streak += deltaSeconds;
    const gainedSteps = Math.floor(streak / 60);
    if (gainedSteps > 0) {
      const gain = 0.01 * generationRateMultiplier * consumableFocusMultiplier * gainedSteps;
      m = Math.min(maxCap, m + gain);
      streak = streak % 60;
    }
  } else {
    // paused: optionally suppress decay (e.g., during natural rest)
    if (!suppressDecay) {
      if (paused == null) paused = nowMs;
      const pausedFor = (nowMs - paused) / 1000;
      // 120s grace before starting decay (improved from 90s for better UX)
      if (pausedFor > 120) {
        // Gentle decay rate: 0.05/s matches UI expectations
        const DECAY_PER_SECOND = 0.05;
        const decaySeconds = pausedFor - 120;
        m = Math.max(1.0, m - DECAY_PER_SECOND * decaySeconds);
      }
    }
  }

  return { multiplier: Number(m.toFixed(4)), uninterruptedSeconds: streak, pausedAt: paused };
}

// Stamina rules:
// - Every 60 minutes studied today reduces max (effectively current cap) by 10 points.
// - We track minutesStudiedToday; caller should update per study time progressed.
// - Fatigued when current < 30 (handled by calculateXpPerMinute above)

export function applyStaminaProgress(
  current: number,
  minutesStudiedToday: number,
  addedSeconds: number
): { current: number; minutesStudiedToday: number } {
  const addedMinutes = addedSeconds / 60;
  const beforeBuckets = Math.floor(minutesStudiedToday / 60);
  const afterMinutes = minutesStudiedToday + addedMinutes;
  const afterBuckets = Math.floor(afterMinutes / 60);
  const bucketsGained = afterBuckets - beforeBuckets;

  let newCurrent = current;
  if (bucketsGained > 0) {
    newCurrent = Math.max(0, newCurrent - bucketsGained * 10);
  }

  return { current: Math.round(newCurrent), minutesStudiedToday: afterMinutes };
}

export function needsDailyReset(lastResetISO: string, now: Date): boolean {
  // Reset at 06:00 in America/Sao_Paulo (UTC-3), or if >24h elapsed since last reset
  try {
    const TZ = 'America/Sao_Paulo';
    const TARGET_HOUR = 6; // 06:00 Sao Paulo

    const last = new Date(lastResetISO);
    const since = now.getTime() - last.getTime();
    if (since >= 24 * 60 * 60 * 1000) return true;

    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });

    const parseParts = (d: Date) => {
      const parts = fmt.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = p.value;
        return acc;
      }, {});
      return {
        year: parts.year, month: parts.month, day: parts.day,
        hour: parseInt(parts.hour || '0', 10),
        minute: parseInt(parts.minute || '0', 10),
        second: parseInt(parts.second || '0', 10)
      };
    };

    const nowP = parseParts(now);
    const lastP = parseParts(last);
    const nowDateKey = `${nowP.year}-${nowP.month}-${nowP.day}`;
    const lastDateKey = `${lastP.year}-${lastP.month}-${lastP.day}`;

    // Trigger reset once per Sao Paulo day, first time user passes 06:00 local Sao Paulo time
    return nowDateKey !== lastDateKey && nowP.hour >= TARGET_HOUR;
  } catch {
    return true;
  }
}

// Calculate exam urgency multiplier based on days until exam
function calculateExamUrgencyMultiplier(state: GameState): number {
  const examDate = new Date(state.settings?.examDate || '2025-10-26');
  const now = new Date();
  const daysUntilExam = (examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // Increase urgency as exam approaches
  if (daysUntilExam <= 7) return 2.0;   // Double XP in final week
  if (daysUntilExam <= 14) return 1.5;  // 50% bonus in final 2 weeks
  if (daysUntilExam <= 30) return 1.2;  // 20% bonus in final month
  return 1.0;
}

// Enhanced category balance with exam urgency for UNICAMP preparation
// When a category's 7-day share is below 25%, grant up to +10% XP to help catch up.
export function computeCategoryNudge(state: GameState): number {
  if (!state.activeGemId) return calculateExamUrgencyMultiplier(state);
  const active = state.gems.find(g => g.id === state.activeGemId);
  if (!active) return calculateExamUrgencyMultiplier(state);

  const targetShare = 0.25;
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const since = now.getTime() - sevenDaysMs;
  const totals: Record<GemCategory, number> = { Math: 0, Science: 0, Language: 0, Humanities: 0 };
  let sum = 0;
  for (const r of state.analytics?.cycles ?? []) {
    const t = new Date(r.endedAtISO).getTime();
    if (t < since) continue;
    const cat = r.category ?? active.category; // fallback
    if (cat in totals) {
      totals[cat as GemCategory] += r.studySeconds;
      sum += r.studySeconds;
    }
  }

  const baseUrgencyMultiplier = calculateExamUrgencyMultiplier(state);

  if (sum <= 0) return baseUrgencyMultiplier;
  const currentShare = totals[active.category] / sum;
  const deficit = Math.max(0, targetShare - currentShare); // only bonus when behind
  // Map deficit (0..0.25+) to (0..0.10) cap, then apply exam urgency
  const balanceBonus = Math.min(0.10, deficit * 0.40); // if 25% behind -> 10% bonus
  const combinedMultiplier = (1 + balanceBonus) * baseUrgencyMultiplier;

  // Cap total multiplier to prevent extreme values
  return Math.min(2.5, combinedMultiplier);
}
