#!/usr/bin/env bash
set -euo pipefail

# === CONFIG ==============================================================
CODEx="codex"                     # your CLI binary
PROFILE="default"                 # adjust if you use a different profile
PROMPTS_DIR=".analysis/prompts"
OUT_DIR=".analysis/out"
SIM_FILE=".analysis/sim_7d.ts"

LANG="en-US"
EXCLUDE=".git|node_modules|dist|build|.turbo|coverage|.cache|*.min.*"
ENTRY="src, game, core, systems"
GOAL="Validate core logic, find balance/design issues, and run a deterministic 7-day simulation with KPIs and tuning suggestions."
BUDGET="deep/60m"

# === PREP ================================================================
mkdir -p "$PROMPTS_DIR" "$OUT_DIR" ".analysis/diagrams"

# Base spec (system prompt content)
BASE_PROMPT="$PROMPTS_DIR/idle_game_auditor_spec.txt"
if [[ ! -f "$BASE_PROMPT" ]]; then
  cat > "$BASE_PROMPT" <<'TXT'
You are Idle-Game Auditor v1.2.

## Mission
Analyze an idle-RPG codebase, verify gameplay logic correctness, surface balance/design issues, and run a deterministic 7-day simulation of the game loop. Produce actionable artifacts markdown, CSV/JSON, tiny harness scripts and cite file:line evidence for every claim.

## Hard Priorities
1. Logic correctness over style (ignore ESLint/typing unless runtime risk).
2. Deterministic simulation with seeded RNG.
3. Evidence with citations (`path:start-end`).
4. Non-destructive (create harness files under ./.analysis/).
5. Plan → Probe → Summarize → Next steps.

## Artifacts to Produce
- ./.analysis/00_repo_census.md
- ./.analysis/01_logic_map.md
- ./.analysis/02_balance_findings.md
- ./.analysis/03_kpis_7d.csv
- ./.analysis/04_repro_commands.md
- ./.analysis/diagrams/flow.mmd
TXT
fi

# Specialized prompts
SURVEY_PROMPT="$PROMPTS_DIR/01_survey.txt"
cat > "$SURVEY_PROMPT" <<TXT
$(cat "$BASE_PROMPT")

## Context
- \$GOAL = $GOAL
- \$BUDGET = $BUDGET
- \$ENTRY = $ENTRY
- \$EXCLUDE = $EXCLUDE
- \$LANG_PREF = $LANG

## Task
Run Initial Survey and produce 00_repo_census.md, 01_logic_map.md, and 04_repro_commands.md with citations.
Focus on core loop, progression, economy, timers, save/load. Ignore linting noise.
TXT

ECON_PROMPT="$PROMPTS_DIR/02_economy.txt"
cat > "$ECON_PROMPT" <<TXT
$(cat "$BASE_PROMPT")

## Context
- \$GOAL = Quantify economy: sources/sinks, droprates, crafting conversions, upgrade ROI.
- \$BUDGET = $BUDGET
- \$ENTRY = $ENTRY
- \$EXCLUDE = $EXCLUDE
- \$LANG_PREF = $LANG

## Task
Deep-dive economy & progression curves. Produce/append 02_balance_findings.md with ranked issues and patch sketches (no edits).
TXT

ANALYZE_PROMPT="$PROMPTS_DIR/04_analyze_sim.txt"
cat > "$ANALYZE_PROMPT" <<TXT
$(cat "$BASE_PROMPT")

## Context
- \$GOAL = Read .analysis/03_kpis_7d.csv and .analysis/sim_7d_out.json; propose concrete tuning changes with exact code locations.
- \$BUDGET = $BUDGET
- \$LANG_PREF = $LANG

## Task
Summarize growth, TTK cliffs, dead upgrades, runaway multipliers. Append to 02_balance_findings.md and suggest 2–4 “NEXT” commands to validate.
TXT

# === STEP 1: Survey Agent ===============================================
echo "[*] Agent: Survey (repo census + logic map)"
$CODEx --profile "$PROFILE" "$(cat "$SURVEY_PROMPT")" | tee "$OUT_DIR/01_survey.log" >/dev/null

# === STEP 2: Economy/Balance Agent ======================================
echo "[*] Agent: Economy deep-dive"
$CODEx --profile "$PROFILE" "$(cat "$ECON_PROMPT")" | tee "$OUT_DIR/02_economy.log" >/dev/null

# === STEP 3: Simulation Harness =========================================
if [[ ! -f "$SIM_FILE" ]]; then
  echo "[*] Scaffolding $SIM_FILE (adjust imports if needed)"
  cat > "$SIM_FILE" <<'TS'
// .analysis/sim_7d.ts
import fs from "node:fs";
import seedrandom from "seedrandom";
// Adjust this import to your actual game loop entry
import { initGame, tickGame } from "../src/game";

const rng = seedrandom("auditor-7d");
const DELTA_MS = 1000;
const HOURS = 24 * 7;
const KPIs: any[] = [];

let state = initGame(rng);
let prevXP = 0, prevGold = 0;

for (let hr = 0; hr < HOURS; hr++) {
  for (let sec = 0; sec < 3600; sec++) {
    state = tickGame(state, DELTA_MS, rng);
  }
  KPIs.push({
    time_hr: hr,
    level: state.player.level,
    xp_total: state.player.xp,
    xp_per_hr: state.player.xp - prevXP,
    gold_total: state.resources.gold,
    gold_per_hr: state.resources.gold - prevGold,
    dps: state.combat.dps,
    zone: state.player.zone,
  });
  prevXP = state.player.xp;
  prevGold = state.resources.gold;
}

const csvHead = Object.keys(KPIs[0]).join(",");
const csvBody = KPIs.map(r => Object.values(r).join(",")).join("\n");
fs.writeFileSync(".analysis/03_kpis_7d.csv", csvHead + "\n" + csvBody);
fs.writeFileSync(".analysis/sim_7d_out.json", JSON.stringify({ final: state, kpis: KPIs }, null, 2));
console.log("Wrote .analysis/03_kpis_7d.csv and .analysis/sim_7d_out.json");
TS
fi

echo "[*] Running simulation (7d accelerated)"
npm tsx "$SIM_FILE" | tee "$OUT_DIR/03_sim.log" >/dev/null || {
  echo "[!] Simulation failed. Adjust imports in $SIM_FILE"
  exit 1
}

# === STEP 4: Analyze simulation =========================================
echo "[*] Agent: Analyze sim outputs"
$CODEx --profile "$PROFILE" "$(cat "$ANALYZE_PROMPT")" | tee "$OUT_DIR/04_analysis.log" >/dev/null

echo
echo "=== DONE ==="
echo "Artifacts:"
echo "  .analysis/00_repo_census.md"
echo "  .analysis/01_logic_map.md"
echo "  .analysis/02_balance_findings.md"
echo "  .analysis/03_kpis_7d.csv"
echo "  .analysis/04_repro_commands.md"
echo "  .analysis/diagrams/flow.mmd"
