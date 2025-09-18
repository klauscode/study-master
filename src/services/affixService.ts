import AFFIX_STATS from '../constants/affix_tiers.json';
import type { ItemAffix } from '../types/gameTypes';

export interface AffixTierInfo {
  tier: 'T1' | 'T2' | 'T3';
  color: string;
}

/**
 * Determines the tier of an affix based on its value and item level
 */
export function getAffixTier(affix: ItemAffix, itemLevel: number): AffixTierInfo {
  // Find the stat configuration
  const statConfig = (AFFIX_STATS as { stat: string; t1Base: number; scaling: number }[]).find(s => s.stat === affix.stat);
  if (!statConfig) {
    return { tier: 'T3', color: '#94a3b8' }; // Default to T3 if unknown
  }

  const t1Base = statConfig.t1Base;
  const scaling = statConfig.scaling;

  // Calculate what the theoretical T1, T2 values would be at this item level
  const t1Value = t1Base * 1.0 + itemLevel * scaling;
  const t2Value = t1Base * 0.66 + itemLevel * scaling;

  // Determine which tier this affix is closest to (with some tolerance)
  const tolerance = 0.5; // Allow small variations due to rounding

  if (Math.abs(affix.value - t1Value) <= tolerance) {
    return { tier: 'T1', color: '#fbbf24' }; // Amber/gold for T1
  } else if (Math.abs(affix.value - t2Value) <= tolerance) {
    return { tier: 'T2', color: '#60a5fa' }; // Blue for T2
  } else {
    return { tier: 'T3', color: '#94a3b8' }; // Gray for T3
  }
}

/**
 * Gets all allowed tiers for a given item level
 */
export function getAllowedTiers(itemLevel: number): Array<'T1' | 'T2' | 'T3'> {
  if (itemLevel >= 40) return ['T1', 'T2', 'T3'];
  if (itemLevel >= 20) return ['T2', 'T3'];
  return ['T3'];
}

/**
 * Formats an affix display name with tier information
 */
export function formatAffixWithTier(affix: ItemAffix, itemLevel: number): {
  displayName: string;
  tierInfo: AffixTierInfo;
  value: string;
} {
  const tierInfo = getAffixTier(affix, itemLevel);
  return {
    displayName: affix.name,
    tierInfo,
    value: `${affix.value}%`
  };
}