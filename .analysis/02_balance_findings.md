# StudyFall Balance & Economy Analysis

**Generated**: 2025-09-18
**Focus**: Economic balance, progression curves, and design issues

## Executive Summary

StudyFall implements a complex multi-currency idle economy with reasonable base mechanics but several concerning balance issues that could lead to exploitation, economic stagnation, or poor progression pacing. Most critical: runaway consumable stacking, extreme focus bonus potential, and insufficient currency sinks.

## Economic Flow Analysis

### Currency Sources & Rates

**Per Cycle Income** (based on `GameStateContext.tsx:957-973`):
```
Guaranteed Minimums:
- Map Fragment: 4
- Transmute: 2
- Augment: 1
- Alchemy: 1
- Chaos: 1

Random Additional (35% chance per slot, weighted):
- Transmute: 35% weight
- Scour: 25% weight
- Map Fragment: 40% weight
- Higher-tier orbs: 5-25% weight
```

**Economic Velocity**: At default 50min cycles = 28.8 cycles/day
- **Daily Guaranteed**: ~145 Map Fragment, ~72 Transmute, ~29 others
- **Total Daily Currency**: ~400-600 units across all types

### Currency Sinks

**Shop Consumables** (`consumables.json:1-157`):
- Micro tier: 25-85 cost
- Medium tier: 75-120 cost
- Premium tier: 180-300 cost

**Crafting Operations** (`craftingService.ts:21-174`):
- Transmute: 1 Transmute Orb (Common→Magic)
- Alchemy: 1 Alchemy Orb (Common→Rare)
- Chaos: 1 Chaos Orb (reroll Rare affixes)
- Regal: 1 Regal Orb (Magic→Rare + affix)

**Balance Issue**: Shop costs 25-300 vs daily income 400-600 = potential oversupply

## Progression Rate Analysis

### XP Scaling
**Level Requirements** (`experienceService.ts:57-61`):
```
Level 1→2: 100 XP
Level 10→11: 1,259 XP
Level 20→21: 4,472 XP
Level 50→51: 35,550 XP
Level 100→101: 177,828 XP
```

**XP Generation Rate** (`experienceService.ts:35-55`):
```
Base: 20 XP/min
With 1.5x focus + 50% gear + 2x consumable = 60 XP/min = 3,600 XP/hour

Time to Level 50: ~44 hours of active study
Time to Level 100: ~740 hours of active study
```

**Assessment**: Progression curve becomes extremely steep past level 50. May discourage long-term engagement.

### Focus Accumulation
**Build Rate** (`experienceService.ts:86-94`):
- Base: +0.01 per 60 seconds = +0.6/hour
- From 1.0 to 1.5 focus: 50 minutes of uninterrupted study
- With gear bonuses: Potentially faster accumulation

**Decay Rate** (`experienceService.ts:102-106`):
- Grace period: 120 seconds
- Decay: -0.05/second = -180/hour after grace
- Full decay (1.5→1.0): ~10 seconds after grace expires

**Balance Issue**: Extremely harsh decay creates pressure for unnatural study patterns

## Critical Balance Issues

### 1. Consumable Stacking Exploit
**Severity**: HIGH
**Location**: Multiple consumable effects stack multiplicatively

**Problem**:
```
Coffee (1.25x focus) + Energy Drink (1.4x focus) + Ultimate Focus (1.6x focus)
= 2.8x focus multiplier

Study Boost (1.5x XP) + Brain Pills (1.75x XP) + Genius Serum (2.0x XP)
= 5.25x XP multiplier

Combined: 14.7x effective XP gain
```

**Fix**: Implement diminishing returns or mutual exclusivity for consumable categories

### 2. Infinite Currency Generation
**Severity**: MEDIUM
**Location**: `GameStateContext.tsx:957-973`

**Problem**: No upper bounds on currency accumulation. Guaranteed minimums ensure positive income even with zero focus.

**Exploitation**: AFK with minimal focus still generates 145+ Map Fragments daily

**Fix**: Scale guaranteed minimums with performance metrics or implement currency caps

### 3. Focus System Punishes Natural Breaks
**Severity**: MEDIUM
**Location**: `experienceService.ts:102-106`

**Problem**: 10-second full decay after 2-minute grace period is unrealistic for human attention spans.

**Impact**: Discourages healthy study breaks, promotes unhealthy gaming patterns

**Fix**: Extend grace period to 10+ minutes, implement gentler decay curve

### 4. Stamina System Creates Dead Time
**Severity**: MEDIUM
**Location**: `experienceService.ts:118-135`

**Problem**: After 3-4 hours daily study, stamina bottleneck creates unproductive rest periods

**Calculation**:
```
Hour 1-3: Normal progression
Hour 4+: 70% stamina, still functional
Hour 6+: 30% stamina, -20% XP penalty
Hour 10+: 0 stamina, no meaningful progress
```

**Fix**: Rework stamina to be a gradual efficiency modifier rather than hard wall

### 5. Equipment Upgrade Path Unclear
**Severity**: LOW
**Location**: Crafting system, affix generation

**Problem**: No clear progression from starter gear to end-game equipment

**Affix Analysis**:
- T1 affixes: 6-8% base stats at level 1
- Scaling: +0.1% per level
- At level 50: ~11-13% per affix
- Max theoretical: 6 affixes × 13% = 78% total bonus per slot

**Missing**: Clear upgrade milestones, affix tiers progression visibility

## Economic Imbalances

### Currency Value Hierarchy Issues

**High-Value Currencies** (scarce):
- Exalted (5 weight): Premium crafting
- Vaal Orb (8 weight): High-end modifications

**Mid-Value Currencies** (balanced):
- Chaos (20 weight): Reroll mechanics
- Regal (15 weight): Upgrade path

**Low-Value Currencies** (oversupplied):
- Map Fragment (40 weight): Most common, unclear long-term use
- Transmute (35 weight): Only useful early game

**Problem**: Map Fragment oversupply with limited sinks creates economic bloat

### Shop Balance Analysis

**Cost/Benefit by Tier**:

**Micro Tier** (cost 25-85):
- Coffee: 25 cost, 1.25x focus, 30min → 5.8 XP/cost
- Study Boost: 35 cost, 1.5x XP, 25min → 6.4 XP/cost

**Premium Tier** (cost 180-300):
- Ultimate Focus: 200 cost, 1.6x focus, 45min → 3.6 XP/cost
- Genius Serum: 250 cost, 2.0x XP, 30min → 4.8 XP/cost

**Issue**: Mid-tier items often have better cost/benefit than premium items

## Progression Bottlenecks

### Early Game (Levels 1-20)
- **Strength**: Clear progression, frequent rewards
- **Issue**: None identified

### Mid Game (Levels 20-50)
- **Strength**: Crafting system becomes relevant
- **Issue**: XP requirements start climbing steeply

### Late Game (Levels 50+)
- **Strength**: Complex optimization becomes important
- **Issues**:
  - XP curve becomes punishing
  - Currency accumulation outpaces useful sinks
  - Focus management becomes tedious micromanagement

## Recommended Fixes (Priority Order)

### Priority 1: Consumable System Overhaul
**File**: `src/services/consumableService.ts`
```typescript
// Implement consumable categories with mutual exclusivity
enum ConsumableCategory { FOCUS, XP, LOOT }
// Max one active per category OR diminishing returns formula
```

### Priority 2: Focus Decay Rebalance
**File**: `src/services/experienceService.ts:102-106`
```typescript
// Extend grace period, implement gradual decay
const GRACE_PERIOD = 600; // 10 minutes
const DECAY_PER_SECOND = 0.01; // Much gentler: 100s for full decay
```

### Priority 3: Currency Sink Expansion
**File**: New crafting options, equipment upgrades
- Add expensive repeatable currency sinks
- Scale guaranteed minimums with performance
- Implement currency caps or depreciation

### Priority 4: XP Curve Softening
**File**: `src/services/experienceService.ts:57-61`
```typescript
// Reduce exponent from 1.55 to 1.35
const LEVEL_EXPONENT = 1.35;
// Or implement XP multiplier scaling at high levels
```

### Priority 5: Stamina System Rework
**File**: `src/services/experienceService.ts:118-135`
- Convert stamina to efficiency modifier (80-100% XP instead of 0-20% penalty)
- Add stamina recovery during brief pauses
- Remove hard productivity walls

## Testing Priorities for Simulation

1. **Consumable Stacking**: Test extreme buff combinations
2. **AFK Currency Generation**: Measure zero-focus income rates
3. **Late Game Progression**: Simulate levels 50+ advancement rates
4. **Economic Equilibrium**: Track currency balance over 7+ days
5. **Focus Decay Impact**: Measure effect on realistic study patterns

## Metrics to Monitor During 7-Day Sim

- Currency generation vs consumption rates
- XP/hour at different level ranges
- Focus uptime % under realistic pause patterns
- Time-to-level progression curve
- Equipment upgrade frequency and costs
- Consumable purchase frequency by tier