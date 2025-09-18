import type { Item, ItemAffix, ItemRarity, EquipmentSlot } from '../types/gameTypes';
import RARITIES from '../constants/rarities.json';
import AFFIX_STATS from '../constants/affix_tiers.json';
import SLOTS from '../constants/slots.json';
import BASES from '../constants/bases.json';

function randomChoiceWeighted<T extends { weight: number }>(arr: T[], rng: () => number): T {
  const total = arr.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const it of arr) {
    if ((r -= it.weight) <= 0) return it;
  }
  return arr[arr.length - 1];
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickTierByItemLevel(itemLevel: number): 'T1'|'T2'|'T3'|'T4' {
  if (itemLevel >= 60) return 'T4';
  if (itemLevel >= 40) return 'T3';
  if (itemLevel >= 20) return 'T2';
  return 'T1';
}

function allowedAffixTiers(itemLevel: number): Array<'T1'|'T2'|'T3'> {
  if (itemLevel >= 40) return ['T1','T2','T3'];
  if (itemLevel >= 20) return ['T2','T3'];
  return ['T3'];
}

export function generateRandomItem(seed: number, itemLevel: number, rarityBias = 0): Item {
  let s = seed;
  const rng = () => {
    // simple LCG for determinism (not crypto)
    s = (1664525 * s + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  const slot = (SLOTS as EquipmentSlot[])[randomInt(0, (SLOTS as string[]).length - 1, rng)];
  // apply rarity bias: increase weight of higher rarities proportionally
  const raritiesWeighted = (RARITIES as any[]).map(r => {
    let w = r.weight as number;
    if (r.rarity === 'Rare') w *= 1 + rarityBias;
    if (r.rarity === 'Epic') w *= 1 + rarityBias * 1.5;
    return { rarity: r.rarity as ItemRarity, weight: w, affixRange: r.affixRange as [number, number] };
  });
  const rarityPick = randomChoiceWeighted(raritiesWeighted, rng);

  const [minA, maxA] = rarityPick.affixRange;
  const affixCount = minA === maxA ? minA : randomInt(minA, maxA, rng);

  const affixes: ItemAffix[] = [];
  const allowedTiers = allowedAffixTiers(itemLevel);
  for (let i = 0; i < affixCount; i++) {
    const stat = (AFFIX_STATS as any[])[randomInt(0, (AFFIX_STATS as any[]).length - 1, rng)];
    const tier = allowedTiers[randomInt(0, allowedTiers.length - 1, rng)];
    const t1 = stat.t1Base as number;
    const scaling = stat.scaling as number; // per item level
    const tierMult = tier === 'T1' ? 1.0 : tier === 'T2' ? 0.66 : 0.33;
    const value = +(t1 * tierMult + itemLevel * scaling).toFixed(2);
    affixes.push({ id: `${Date.now()}-${i}-${Math.floor(rng() * 1e6)}`, name: `+% ${prettyStat(stat.stat)}`, stat: stat.stat, value });
  }

  // base item names by tier band
  const tierBand = pickTierByItemLevel(itemLevel);
  const baseList = (BASES as any)[slot][tierBand] as string[];
  const baseName = baseList[randomInt(0, baseList.length - 1, rng)];

  return {
    id: `${Date.now()}-${Math.floor(rng() * 1e9)}`,
    name: `${baseName}`,
    rarity: rarityPick.rarity,
    slot,
    itemLevel,
    affixes,
  };
}

export function generateLootCache(seed: number, count: number, itemLevel: number, rarityBias = 0): Item[] {
  const items: Item[] = [];
  for (let i = 0; i < count; i++) items.push(generateRandomItem(seed + i + 1, itemLevel, rarityBias));
  return items;
}

function prettyStat(key: string): string {
  const map: Record<string,string> = {
    gemXpGainPercent: 'Gem XP Gain',
    xpGainPercent: 'XP Gain',
    lootQuantityPercent: 'Loot Quantity',
    lootRarityPercent: 'Loot Rarity',
    focusGainRatePercent: 'Focus Gain Rate',
  };
  return map[key] ?? key;
}
