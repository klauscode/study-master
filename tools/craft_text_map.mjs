import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const GEMS = path.join(ROOT, 'data', 'gems.jsonl');
const RECIPE = path.join(ROOT, 'data', 'map_recipe.json');

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickAffixes(pool, slots, rng) {
  const p = Array.from(new Set(pool));
  const chosen = [];
  for (let i = 0; i < slots && p.length > 0; i++) {
    const idx = Math.floor(rng() * p.length);
    chosen.push(p[idx]);
    p.splice(idx, 1);
  }
  return chosen;
}

function craft(picked, recipe, seed) {
  const rng = mulberry32(seed >>> 0);
  const effective = picked.map((g) => ({ g, eff: Math.max(0.0001, (g.weight || 1) * (g.cycles || 1)) }));
  const total = effective.reduce((a, b) => a + b.eff, 0);
  const q = Math.max(1, Math.floor(recipe.question_count || 5));
  const alloc = effective.map((e) => ({ g: e.g, raw: (e.eff / total) * q, floor: 0 }));
  let used = 0;
  for (const a of alloc) { a.floor = Math.floor(a.raw); used += a.floor; }
  let rem = q - used;
  const byFrac = [...alloc].sort((A, B) => (B.raw - Math.floor(B.raw)) - (A.raw - Math.floor(A.raw)));
  for (let i = 0; i < byFrac.length && rem > 0; i++, rem--) byFrac[i].floor += 1;
  if (picked.length <= q) {
    for (const a of alloc) if (a.floor === 0) a.floor = 1;
    let totalNow = alloc.reduce((s, a) => s + a.floor, 0);
    while (totalNow > q) {
      const candidates = alloc.filter((a) => a.floor > 1);
      if (candidates.length === 0) break;
      const idx = Math.floor(rng() * candidates.length);
      candidates[idx].floor -= 1;
      totalNow -= 1;
    }
  }
  const lineup = alloc.filter((a) => a.floor > 0).map((a) => ({
    gemId: a.g.id,
    name: a.g.name,
    allocated: a.floor,
    cyclesApplied: a.g.cycles || 1,
    tags: a.g.tags || [],
  }));
  const affixes = pickAffixes(recipe.affixes_pool || [], Math.max(0, recipe.affix_slots || 0), rng);
  return { seed, affixes, questionCount: q, lineup };
}

function format(m) {
  const lines = [];
  lines.push(`Seed: ${m.seed}`);
  lines.push(`Affixes: ${m.affixes.join(', ') || 'none'}`);
  lines.push(`Questions: ${m.questionCount}`);
  lines.push('Lineup:');
  for (const l of m.lineup) lines.push(`- ${l.name} (${l.gemId}) × ${l.allocated}${l.tags.length ? ` [${l.tags.join(', ')}]` : ''}`);
  return lines.join('\n');
}

async function main() {
  const [gemsRaw, recipeRaw] = await Promise.all([
    fs.readFile(GEMS, 'utf8'),
    fs.readFile(RECIPE, 'utf8')
  ]);
  const gems = gemsRaw.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const recipe = JSON.parse(recipeRaw);
  const count = Math.min(3 + Math.floor(Math.random() * 3), gems.length); // pick 3-5
  const picked = [];
  const bag = [...gems];
  for (let i = 0; i < count && bag.length > 0; i++) {
    const idx = Math.floor(Math.random() * bag.length);
    picked.push(bag[idx]);
    bag.splice(idx, 1);
  }
  const seed = Math.floor(Math.random() * 2 ** 31);
  const crafted = craft(picked, recipe, seed);
  console.log(format(crafted));
}

main().catch((e) => { console.error(e); process.exit(1); });

