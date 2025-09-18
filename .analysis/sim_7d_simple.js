#!/usr/bin/env node
/**
 * StudyFall 7-Day Simulation (Simplified JavaScript Version)
 *
 * Generates deterministic KPI data for balance analysis without complex dependencies.
 * This produces representative data based on the actual game equations.
 */

import fs from 'fs';

// Seeded RNG for deterministic results
class SeededRNG {
  constructor(seed) {
    this.seed = 0;
    for (let i = 0; i < seed.length; i++) {
      this.seed = ((this.seed << 5) - this.seed) + seed.charCodeAt(i);
      this.seed = this.seed & this.seed;
    }
    this.seed = Math.abs(this.seed) || 1;
  }

  next() {
    this.seed = (1664525 * this.seed + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// Game constants (from analysis)
const BASE_XP_PER_MINUTE = 20;
const LEVEL_EXPONENT = 1.55;
const FOCUS_BUILD_RATE = 0.01 / 60; // per second
const FOCUS_DECAY_RATE = 0.05; // per second after grace period
const CYCLE_LENGTH_SECONDS = 3000; // 50 minutes
const REST_LENGTH_SECONDS = 600; // 10 minutes

// Initialize RNG
const rng = new SeededRNG("auditor-7d");

// Game state
let gameState = {
  character: { level: 1, xp: 0 },
  focus: { multiplier: 1.0, uninterruptedSeconds: 0 },
  stamina: { current: 100, minutesStudiedToday: 0 },
  currency: { 'Map Fragment': 15, 'Transmute': 200, 'Alchemy': 5, 'Chaos': 3 },
  session: {
    mode: 'study', // 'study' or 'rest'
    elapsedSeconds: 0,
    restElapsedSeconds: 0,
    xpThisStudy: 0,
    studySecondsThisCycle: 0,
    focusIntegralSeconds: 0
  },
  analytics: { cycles: [] },
  gems: [{ id: 'sim-gem-1', name: 'Geometria Plana', level: 1, xp: 0 }],
  activeGemId: 'sim-gem-1',
  isStudying: true
};

// Helper functions
function calculateXPForNextLevel(level) {
  if (level < 1) return 100;
  return Math.floor(100 * Math.pow(level, LEVEL_EXPONENT));
}

function calculateXpPerMinute(state) {
  const baseRate = BASE_XP_PER_MINUTE;
  const focusMultiplier = state.focus.multiplier;
  const fatigueMultiplier = state.stamina.current < 30 ? 0.8 : 1.0;
  return baseRate * focusMultiplier * fatigueMultiplier;
}

function updateFocus(state, deltaSeconds) {
  if (state.isStudying && state.session.mode === 'study') {
    // Build focus
    const gainPerSecond = FOCUS_BUILD_RATE;
    state.focus.multiplier = Math.min(1.5, state.focus.multiplier + gainPerSecond * deltaSeconds);
    state.focus.uninterruptedSeconds += deltaSeconds;
  }
  // Note: We don't simulate focus decay in this simplified version
}

function updateStamina(state, deltaSeconds) {
  if (state.isStudying && state.session.mode === 'study') {
    const minutesDelta = deltaSeconds / 60;
    state.stamina.minutesStudiedToday += minutesDelta;

    // Stamina depletion: -10 per hour
    const hoursPassed = Math.floor(state.stamina.minutesStudiedToday / 60);
    const expectedStamina = Math.max(0, 100 - hoursPassed * 10);
    state.stamina.current = Math.min(state.stamina.current, expectedStamina);
  }
}

function addXP(state, deltaSeconds) {
  if (!state.isStudying || state.session.mode !== 'study') return;

  const xpPerMin = calculateXpPerMinute(state);
  const xpGained = (xpPerMin / 60) * deltaSeconds;

  state.character.xp += xpGained;
  state.session.xpThisStudy += xpGained;
  state.session.focusIntegralSeconds += state.focus.multiplier * deltaSeconds;

  // Level up logic
  let needed = calculateXPForNextLevel(state.character.level);
  while (state.character.xp >= needed) {
    state.character.xp -= needed;
    state.character.level += 1;
    needed = calculateXPForNextLevel(state.character.level);
  }

  // Update gem XP (simplified)
  const activeGem = state.gems.find(g => g.id === state.activeGemId);
  if (activeGem) {
    activeGem.xp += xpGained * 1.12; // +12% gem XP bonus from starter gear
    let gemNeeded = calculateXPForNextLevel(activeGem.level);
    while (activeGem.xp >= gemNeeded) {
      activeGem.xp -= gemNeeded;
      activeGem.level += 1;
      gemNeeded = calculateXPForNextLevel(activeGem.level);
    }
  }
}

function completeCycle(state, simulatedTime) {
  // Generate loot (simplified)
  const baseCount = 3 + Math.floor(state.focus.multiplier * 2);
  const lootCount = Math.max(3, Math.round(baseCount * 1.15)); // +15% from gear

  // Add currency (guaranteed minimums)
  state.currency['Map Fragment'] += 4;
  state.currency['Transmute'] += 2;
  state.currency['Alchemy'] += 1;
  state.currency['Chaos'] += 1;

  // Random additional currency
  for (let i = 0; i < 3; i++) {
    if (rng.next() < 0.6) state.currency['Map Fragment'] += 1;
    if (rng.next() < 0.4) state.currency['Transmute'] += 1;
  }

  // Record cycle analytics
  const avgFocus = state.session.studySecondsThisCycle > 0 ?
    state.session.focusIntegralSeconds / state.session.studySecondsThisCycle :
    state.focus.multiplier;

  const cycleRecord = {
    startedAtISO: new Date(simulatedTime - CYCLE_LENGTH_SECONDS * 1000).toISOString(),
    endedAtISO: new Date(simulatedTime).toISOString(),
    studySeconds: Math.floor(state.session.studySecondsThisCycle),
    avgFocus: Number(avgFocus.toFixed(3)),
    xpGained: Math.round(state.session.xpThisStudy),
    lootCount,
    gemId: state.activeGemId,
    category: 'Math'
  };

  state.analytics.cycles.push(cycleRecord);
  if (state.analytics.cycles.length > 500) state.analytics.cycles.shift();

  // Reset session for rest
  state.session.mode = 'rest';
  state.session.elapsedSeconds = 0;
  state.session.restElapsedSeconds = 0;
  state.session.xpThisStudy = 0;
  state.session.studySecondsThisCycle = 0;
  state.session.focusIntegralSeconds = 0;
  state.isStudying = false;
}

function completeRest(state) {
  state.session.mode = 'study';
  state.session.restElapsedSeconds = 0;
  state.isStudying = true;
}

function dailyReset(state) {
  state.stamina.current = 100;
  state.stamina.minutesStudiedToday = 0;
}

// Generate hourly KPI
function generateKPI(hour, state, simulatedTime) {
  const activeGem = state.gems.find(g => g.id === state.activeGemId);
  const totalCurrency = Object.values(state.currency).reduce((a, b) => a + b, 0);

  // Calculate rates
  const xpPerMin = calculateXpPerMinute(state);
  const dps = xpPerMin / 60;
  const xpToNext = calculateXPForNextLevel(state.character.level) - state.character.xp;
  const ttk = dps > 0 ? xpToNext / dps : 999999;

  // Find cycles in the last hour
  const hourStart = simulatedTime - 3600000;
  const recentCycles = state.analytics.cycles.filter(c => {
    const cycleTime = new Date(c.endedAtISO).getTime();
    return cycleTime >= hourStart && cycleTime < simulatedTime;
  });

  const xpThisHour = recentCycles.reduce((sum, c) => sum + (c.xpGained || 0), 0);

  return {
    time_hr: hour,
    start_iso: new Date(simulatedTime - 3600000).toISOString(),
    end_iso: new Date(simulatedTime).toISOString(),
    player_level: state.character.level,
    zone: activeGem ? activeGem.name : "No Active Subject",
    xp_total: Math.round(state.character.xp),
    xp_per_hr: xpThisHour,
    gold_total: totalCurrency,
    gold_per_hr: recentCycles.length * 6, // Approximate currency per cycle
    dps: Number(dps.toFixed(2)),
    ttk_avg: Number(ttk.toFixed(2)),
    drops_rare: recentCycles.length, // Simplified: one rare per cycle
    drops_epic: Math.floor(recentCycles.length / 3), // Simplified: one epic per 3 cycles
    craft_items: recentCycles.length,
    upgrade_costs_spent: recentCycles.length * 2, // Approximate spending
    prestige_count: 0
  };
}

// Main simulation
function runSimulation() {
  console.log('Starting 7-day StudyFall simulation (simplified)...');

  let simulatedTime = new Date('2025-09-18T13:20:26.878Z').getTime();
  const SIMULATION_HOURS = 24 * 7;
  const TICK_INTERVAL = 10; // 10-second ticks for performance

  const kpis = [];

  for (let hour = 1; hour <= SIMULATION_HOURS; hour++) {
    if (hour % 24 === 0) {
      console.log(`Day ${hour / 24} complete...`);
    }

    // Simulate this hour
    for (let second = 0; second < 3600; second += TICK_INTERVAL) {
      simulatedTime += TICK_INTERVAL * 1000;

      // Update game state
      updateFocus(gameState, TICK_INTERVAL);
      updateStamina(gameState, TICK_INTERVAL);

      if (gameState.session.mode === 'study') {
        gameState.session.elapsedSeconds += TICK_INTERVAL;
        gameState.session.studySecondsThisCycle += TICK_INTERVAL;
        addXP(gameState, TICK_INTERVAL);

        // Check for cycle completion
        if (gameState.session.elapsedSeconds >= CYCLE_LENGTH_SECONDS) {
          completeCycle(gameState, simulatedTime);
        }
      } else if (gameState.session.mode === 'rest') {
        gameState.session.restElapsedSeconds += TICK_INTERVAL;

        // Check for rest completion
        if (gameState.session.restElapsedSeconds >= REST_LENGTH_SECONDS) {
          completeRest(gameState);
        }
      }

      // Daily reset (simplified: every 24 hours)
      if (hour % 24 === 0 && second === 0) {
        dailyReset(gameState);
      }
    }

    // Generate hourly KPI
    const kpi = generateKPI(hour, gameState, simulatedTime);
    kpis.push(kpi);
  }

  // Export results
  console.log('Generating output files...');

  const csvHeaders = Object.keys(kpis[0]).join(',');
  const csvRows = kpis.map(kpi => Object.values(kpi).join(','));
  const csvContent = [csvHeaders, ...csvRows].join('\n');

  fs.writeFileSync('03_kpis_7d.csv', csvContent);

  // Generate summary
  const summary = {
    final_state: {
      level: gameState.character.level,
      xp: Math.round(gameState.character.xp),
      focus: Number(gameState.focus.multiplier.toFixed(3)),
      stamina: gameState.stamina.current,
      total_currency: Object.values(gameState.currency).reduce((a, b) => a + b, 0),
      cycles_completed: gameState.analytics.cycles.length,
      active_gem_level: gameState.gems[0].level,
      active_gem_xp: Math.round(gameState.gems[0].xp)
    },
    kpis_last_24h: kpis.slice(-24),
    simulation_meta: {
      duration_hours: SIMULATION_HOURS,
      tick_interval_seconds: TICK_INTERVAL,
      rng_seed: "auditor-7d",
      start_time: "2025-09-18T13:20:26.878Z",
      end_time: new Date(simulatedTime).toISOString(),
      note: "Simplified simulation based on analyzed game equations"
    },
    balance_observations: {
      max_focus_reached: Math.max(...kpis.map(k => gameState.focus.multiplier)),
      avg_xp_per_hour: kpis.reduce((sum, k) => sum + k.xp_per_hr, 0) / kpis.length,
      total_cycles: gameState.analytics.cycles.length,
      final_progression_rate: `Level ${gameState.character.level} reached in ${SIMULATION_HOURS} hours`
    }
  };

  fs.writeFileSync('sim_7d_out.json', JSON.stringify(summary, null, 2));

  console.log('Simulation complete!');
  console.log(`Final state: Level ${gameState.character.level}, XP ${Math.round(gameState.character.xp)}`);
  console.log(`Focus: ${gameState.focus.multiplier.toFixed(3)}, Stamina: ${gameState.stamina.current}`);
  console.log(`Active gem: ${gameState.gems[0].name} Level ${gameState.gems[0].level}`);
  console.log(`Total currency: ${Object.values(gameState.currency).reduce((a, b) => a + b, 0)}`);
  console.log(`Cycles completed: ${gameState.analytics.cycles.length}`);
  console.log('\nOutput files generated:');
  console.log('  03_kpis_7d.csv - Hourly KPI data (168 rows)');
  console.log('  sim_7d_out.json - Simulation summary and analysis');

  return summary;
}

// Run simulation
runSimulation();

export { runSimulation };