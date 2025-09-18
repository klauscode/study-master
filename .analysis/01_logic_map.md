# StudyFall Logic Map

**Generated**: 2025-09-18
**Focus**: Core game loop, state mutations, and key equations

## Core Game Loop Architecture

### Main Timer Loop
**Location**: `src/context/GameStateContext.tsx:815-828`
```typescript
// 1-second tick interval
setInterval(() => {
  dispatch({ type: 'TICK', deltaSeconds: delta, nowMs: Date.now() });
  if (state.isStudying && state.session.mode === 'study' && delta > 0) {
    dispatch({ type: 'ADD_XP', seconds: delta });
  }
}, 1000);
```

### Study Cycle State Machine
**Location**: `src/context/GameStateContext.tsx:879-1033`

```
[START_STUDY] → [STUDY_MODE] → [CYCLE_COMPLETE] → [START_REST] → [REST_MODE] → [START_STUDY]
      ↑                                                                              ↓
      └──────────────────── AUTO TRANSITION ────────────────────────────────────────┘
```

## Key Equations & Calculations

### XP Calculation
**Location**: `src/services/experienceService.ts:35-55`

```typescript
XP_per_minute = BASE_XP_PER_MINUTE * gear_multiplier * focus_multiplier * category_nudge * consumable_multiplier * fatigue_penalty

where:
- BASE_XP_PER_MINUTE = 20
- gear_multiplier = 1 + (sum of xpGainPercent affixes) / 100
- focus_multiplier = 1.0 to 1.5 (builds while studying)
- category_nudge = 1.0 to 1.1 (balancing bonus for underused categories)
- consumable_multiplier = active consumable XP buffs
- fatigue_penalty = 0.8 if stamina < 30, else 1.0
```

### Focus System
**Location**: `src/services/experienceService.ts:66-111`

```typescript
Focus Rules:
- Builds: +0.01 per 60 uninterrupted seconds (while studying)
- Cap: 1.5 * (1 + focusCapPercent/100) from gear
- Decay: After 120s pause, -0.05/second until 1.0
- Gear bonus: focusGainRatePercent affects build rate
```

### Stamina System
**Location**: `src/services/experienceService.ts:118-135`

```typescript
Stamina Rules:
- Depletion: -10 per hour of study completed
- Daily cap: 100 - (hours_studied_today * 10)
- Recovery: +1 per 10 minutes during rest mode
- Fatigue: <30 stamina = -20% XP gain
```

### Level Progression
**Location**: `src/services/experienceService.ts:57-61`

```typescript
XP_required(level) = 100 * level^1.55
```

### Loot Generation
**Location**: `src/context/GameStateContext.tsx:907-990`

```typescript
Loot Formula:
base_count = 3 + floor(focus_multiplier * 2.0)
momentum_bonus = min(2, floor(momentum_seconds / 900))
gear_bonus = 1 + lootQuantityPercent/100
consumable_bonus = active consumable multipliers
final_count = max(3, round((base_count + momentum_bonus) * gear_bonus * consumable_bonus))

Triple Loot Buff: final_count *= 3

Rarity Bias:
focus_bonus = max(0, (avg_focus - 1.0) * 0.5)
gear_bonus = lootRarityPercent/100 * consumable_multipliers
total_bias = min(0.75, focus_bonus + gear_bonus)
```

### Item Generation
**Location**: `src/services/lootService.ts:33-79`

```typescript
Rarity Weights (base):
Common: 30, Magic: 40, Rare: 25, Epic: 5

With bias applied:
Rare_weight *= (1 + bias)
Epic_weight *= (1 + bias * 1.5)

Affix Count by Rarity:
Common: 0-1, Magic: 1-3, Rare: 2-5, Epic: 3-6

Affix Value Calculation:
value = (t1_base * tier_multiplier) + (item_level * scaling)
tier_multiplier: T1=1.0, T2=0.66, T3=0.33
```

## Critical State Mutations

### TICK Action
**Location**: `src/context/GameStateContext.tsx:129-201`

**Every 1 second when active:**
1. Update focus (build/decay based on study state)
2. Update stamina (deplete during study, recover during rest)
3. Expire active rewards/consumables
4. Accumulate loot momentum
5. Update session timers

### ADD_XP Action
**Location**: `src/context/GameStateContext.tsx:202-258`

**Per second while studying:**
1. Calculate XP gain using XP formula
2. Apply to character level progression
3. Apply gem XP bonus to active gem
4. Update task progress for study-time tasks
5. Track focus integral for cycle analytics

### Cycle Completion
**Location**: `src/context/GameStateContext.tsx:879-1033`

**At study cycle end (default 50min):**
1. Generate loot based on focus/gear/buffs
2. Generate orbs with guaranteed minimums
3. Apply pity system for rare items
4. Create cycle analytics record
5. Transition to rest mode
6. Play completion sound

## Economy Flow

### Currency Sources
1. **Loot Orbs**: Generated per cycle with weights from `orbs.json:1-12`
2. **Task Rewards**: Daily tasks reward specific currencies
3. **Guaranteed Minimums**: Each cycle guarantees minimum orbs

### Currency Sinks
1. **Crafting**: Item enhancement and rerolling
2. **Maps**: Purchased map modifications
3. **Shop**: Consumable purchases

### Daily Reset
**Location**: `src/context/GameStateContext.tsx:297-309`

**At 06:00 America/Sao_Paulo:**
1. Reset stamina to 100
2. Reset daily study minutes to 0
3. Generate new smart tasks
4. Clear task completion status

## Task System

### Smart Task Generation
**Location**: `src/services/smartTaskService.ts:12-36`

**Triggers**: Daily reset, hourly intervals
**Priority System**: 1-10 scale based on:
- SRS review due dates
- Category balance (7-day analysis)
- Study streak maintenance
- Equipment upgrade needs
- Exam preparation urgency

### Task Types
1. **study_minutes**: Total study time
2. **cycles**: Number of completed cycles
3. **category_minutes**: Category-specific study time
4. **topic_accuracy**: Performance-based challenges
5. **map_objective**: Map completion goals

## Critical Timing Systems

### Auto-Transitions
- **Study → Rest**: At `cycleLengthSeconds` (default 3000s = 50min)
- **Rest → Study**: At `restLengthSeconds` (default 600s = 10min)
- **Daily Reset**: 06:00 local time (America/Sao_Paulo)

### Background Timers
- **Main Loop**: 1-second intervals
- **Auto-Save**: Every 5 seconds
- **Knowledge Decay**: Every 30 seconds
- **Stamina Recovery**: Every 10 minutes (rest mode only)
- **Smart Tasks**: Every hour

## Balance-Critical Constants

| Constant | Value | Location | Impact |
|----------|-------|----------|--------|
| BASE_XP_PER_MINUTE | 20 | `experienceService.ts:4` | Core progression rate |
| LEVEL_EXPONENT | 1.55 | `experienceService.ts:6` | Level scaling curve |
| Focus build rate | +0.01/60s | `experienceService.ts:89` | Focus accumulation |
| Focus decay rate | -0.05/s | `experienceService.ts:103` | Focus loss when paused |
| Stamina per hour | -10 | `experienceService.ts:131` | Study fatigue rate |
| Base loot count | 3 + 2×focus | `GameStateContext.tsx:907` | Items per cycle |
| Pity rare streak | 2 cycles | `GameStateContext.tsx:976` | Bad luck protection |

## Risk Areas for Simulation

1. **Focus Decay**: Could cause unexpected XP loss if pausing logic fails
2. **Stamina Overflow**: Negative stamina could break XP calculations
3. **Loot Generation**: RNG seed predictability critical for determinism
4. **Currency Arithmetic**: Integer overflow on large values
5. **Timer Drift**: Real-time vs simulated time synchronization
6. **Daily Reset**: Timezone calculations could desync state

## State Invariants to Monitor

1. **Focus**: Always between 1.0 and focus_cap (≤1.5 + gear bonuses)
2. **Stamina**: Always between 0 and 100
3. **XP**: Never decreases (except gem decay)
4. **Level**: Never decreases
5. **Currency**: Never negative
6. **Session Time**: Never exceeds configured cycle/rest lengths
7. **Item Count**: Inventory has reasonable bounds