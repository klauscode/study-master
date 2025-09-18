import affixNames from '../constants/affixNames.json';

export type GemTopic = {
  id: string;
  name: string;
  tier: number; // 1..3
  weight: number; // relative weight in allocation
  cycles: number; // how many times it contributes a question block
  tags?: string[];
  level?: number; // gem level for scaling difficulty
};

export type MapRecipe = {
  question_count: number;
  affix_slots: number;
  affixes_pool: string[];
};

export type CraftedMapLineup = {
  gemId: string;
  name: string;
  allocated: number; // number of questions allocated
  cyclesApplied: number;
  tags: string[];
};

export type DifficultyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export type CraftedMap = {
  seed: number;
  affixes: string[];
  questionCount: number;
  lineup: CraftedMapLineup[];
  difficultyTier: DifficultyTier;
  difficultyScore: number;
};

// Simple deterministic RNG (mulberry32)
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickAffixes(pool: string[], slots: number, rng: () => number) {
  const p = [...new Set(pool)];
  const chosen: string[] = [];
  for (let i = 0; i < slots && p.length > 0; i++) {
    const idx = Math.floor(rng() * p.length);
    chosen.push(p[idx]);
    p.splice(idx, 1);
  }
  return chosen;
}

// Calculate difficulty tier based on various factors
function calculateDifficulty(questionCount: number, affixes: string[], avgLevel: number): { tier: DifficultyTier, score: number } {
  let score = 0;

  // Base score from question count (0-60 points)
  score += questionCount * 5;

  // Score from gem level (0-50 points)
  score += avgLevel * 5;

  // Score from affixes (0-100 points)
  const affixScores: Record<string, number> = {
    'time_crunch': 15,
    'auto_skip': 10,
    'low_level_only': -5,
    'speed_run': 25,
    'hard_mode': 30,
    'no_hints': 20,
    'timed_pressure': 15,
    'focus_lock': 10,
    'quick_fire': 35,
    'advanced_only': 25,
    'marathon': 40,
    'precision': 10
  };

  affixes.forEach(affix => {
    score += affixScores[affix] || 0;
  });

  // Determine tier based on score
  if (score >= 150) return { tier: 'Diamond', score };
  if (score >= 120) return { tier: 'Platinum', score };
  if (score >= 90) return { tier: 'Gold', score };
  if (score >= 60) return { tier: 'Silver', score };
  return { tier: 'Bronze', score };
}

// Generate map based on selected gems and their levels
export function craftMapFromGems(
  picked: GemTopic[],
  seed?: number
): CraftedMap {
  const baseSeed = seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = mulberry32(baseSeed >>> 0);

  // Calculate average gem level for scaling
  const avgLevel = picked.reduce((sum, gem) => sum + (gem.level || 1), 0) / picked.length;

  // RNG-based question count scaling with gem levels
  const baseQuestions = 3 + Math.floor(rng() * 4); // 3-6 base questions
  const levelScaling = Math.floor(avgLevel / 3); // +1 question per 3 average levels

  // Progressive scaling with cap at level 19 for 1-hour sessions
  const questionCap = avgLevel >= 19 ? 20 : 12;
  const q = Math.min(questionCap, baseQuestions + levelScaling);

  // RNG-based affix count - higher level gems = more affixes
  const baseAffixChance = Math.min(0.8, 0.3 + (avgLevel * 0.05)); // 30% at level 1, 80% cap
  const maxAffixes = Math.min(4, Math.floor(avgLevel / 2) + 1); // More affixes at higher levels
  let affixCount = 0;
  for (let i = 0; i < maxAffixes; i++) {
    if (rng() < baseAffixChance) affixCount++;
  }

  const effective = picked.map((g) => ({
    g,
    eff: Math.max(0.0001, (g.weight || 1) * (g.cycles || 1)),
  }));
  const total = effective.reduce((a, b) => a + b.eff, 0);

  // initial proportional allocation
  const alloc = effective.map((e) => ({
    g: e.g,
    raw: (e.eff / total) * q,
    floor: 0,
  }));
  let used = 0;
  for (const a of alloc) {
    a.floor = Math.floor(a.raw);
    used += a.floor;
  }
  let rem = q - used;
  // distribute remainder by largest fractional part
  const byFrac = [...alloc].sort((A, B) => (B.raw - Math.floor(B.raw)) - (A.raw - Math.floor(A.raw)));
  for (let i = 0; i < byFrac.length && rem > 0; i++, rem--) {
    byFrac[i].floor += 1;
  }

  // ensure each picked gets at least 1 if possible
  if (picked.length <= q) {
    for (const a of alloc) if (a.floor === 0) a.floor = 1;
    // rebalance if we overshot
    let totalNow = alloc.reduce((s, a) => s + a.floor, 0);
    while (totalNow > q) {
      // remove one from a random slot with count > 1
      const candidates = alloc.filter((a) => a.floor > 1);
      if (candidates.length === 0) break;
      const idx = Math.floor(rng() * candidates.length);
      candidates[idx].floor -= 1;
      totalNow -= 1;
    }
  }

  const lineup: CraftedMapLineup[] = alloc
    .filter((a) => a.floor > 0)
    .map((a) => ({
      gemId: a.g.id,
      name: a.g.name,
      allocated: a.floor,
      cyclesApplied: a.g.cycles || 1,
      tags: a.g.tags || [],
    }));

  // Load affix pool from data file
  const affixPool = [
    "time_crunch", "auto_skip", "low_level_only", "speed_run",
    "hard_mode", "no_hints", "timed_pressure", "focus_lock",
    "quick_fire", "advanced_only", "marathon", "precision"
  ];

  const affixes = pickAffixes(affixPool, affixCount, rng);

  // Calculate difficulty tier
  const difficulty = calculateDifficulty(q, affixes, avgLevel);

  return {
    seed: baseSeed,
    affixes,
    questionCount: q,
    lineup,
    difficultyTier: difficulty.tier,
    difficultyScore: difficulty.score,
  };
}

export function getAffixDisplayName(affixId: string): string {
  return (affixNames as Record<string, string>)[affixId] || affixId;
}

export function formatCraftedMapText(m: CraftedMap): string {
  const lines: string[] = [];
  lines.push(`Seed: ${m.seed}`);
  lines.push(`Difficulty: ${m.difficultyTier} (${m.difficultyScore} points)`);
  lines.push(`Affixes: ${m.affixes.map(getAffixDisplayName).join(', ') || 'none'}`);
  lines.push(`Questions: ${m.questionCount}`);
  lines.push('Lineup:');
  for (const l of m.lineup) {
    lines.push(`- ${l.name} (${l.gemId}) × ${l.allocated}${l.tags.length ? ` [${l.tags.join(', ')}]` : ''}`);
  }
  return lines.join('\n');
}

