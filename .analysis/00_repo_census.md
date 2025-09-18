# StudyFall Repository Census

**Generated**: 2025-09-18
**Auditor**: Idle-Game Auditor v1.2
**Scope**: Core idle-RPG study gamification codebase

## Overview

StudyFall is a React-based idle RPG study gamification app with TypeScript. The codebase implements a complex study session management system with RPG-style progression, loot generation, equipment, and economy mechanics.

## Repository Statistics

- **Source Files**: 60 TypeScript/JavaScript files
- **Languages**: TypeScript (primary), React, JSON data
- **Framework**: React 19.1.1 + Vite
- **Architecture**: Context-based state management with useReducer

## Directory Structure

```
src/
├── components/
│   ├── systems/          # Core game systems (inventory, character, etc.)
│   ├── ui/               # Reusable UI components
│   └── views/            # Main application views/pages
├── constants/            # JSON game data (affixes, items, etc.)
├── context/              # React context providers (main game state)
├── services/             # Business logic and utilities
└── types/                # TypeScript type definitions
```

## Key Entry Points

| File | Purpose | Critical |
|------|---------|----------|
| `src/main.tsx:6` | React DOM root entry point | ✓ |
| `src/App.tsx:123` | Main app component with navigation | ✓ |
| `src/context/GameStateContext.tsx:815` | Core game loop and state management | ✓ |
| `src/components/views/StudyPage.tsx:14` | Primary study interface | ✓ |

## Core Systems Identified

### Game Loop Architecture
- **Tick Rate**: 1-second intervals (`GameStateContext.tsx:815-828`)
- **Auto-Save**: Every 5 seconds (`GameStateContext.tsx:765`)
- **State Management**: Single useReducer with 47 action types
- **Persistence**: localStorage-based save system

### Study Cycle Flow
1. **Study Phase**: Focus builds, XP accumulates, stamina depletes
2. **Automatic Transition**: At cycle completion (default 50min)
3. **Loot Generation**: Items + orbs based on focus/gear bonuses
4. **Rest Phase**: Focus preserved, stamina recovery (default 10min)
5. **Repeat**: Auto-transition back to study

### Progression Systems
- **Character Levels**: XP-based progression with equipment slots
- **Subject Gems**: Individual study topics with their own XP/levels
- **Focus System**: 1.0x to 1.5x multiplier, builds over time, decays when paused
- **Stamina System**: 0-100, depletes during study, affects XP gain when low

### Economy & Items
- **Equipment**: 6 slots (Head/Chest/Legs/Feet/Weapon/Accessory) with affixes
- **Currencies**: 5+ types (Transmute, Map Fragment, Chaos, etc.)
- **Loot Generation**: Deterministic seed-based with pity system
- **Crafting**: Currency-based item/map enhancement

## Data Sources & Constants

| File | Contents | Purpose |
|------|----------|---------|
| `src/constants/affixes.json` | Item stat modifiers | Loot generation |
| `src/constants/bases.json` | Base item names/types | Item creation |
| `src/constants/consumables.json` | Buff items for purchase | Progression boosting |
| `src/constants/orbs.json` | Currency drop weights | Economy tuning |
| `src/constants/unicamp_topics.json` | Brazilian exam topics | Subject gem seeding |

## Critical Services

| Service | File | Purpose |
|---------|------|---------|
| Experience | `experienceService.ts:1` | XP calculations, level progression |
| Loot | `lootService.ts:1` | Item generation algorithms |
| Character | `characterService.ts:1` | Stat calculations from equipment |
| Persistence | `persistenceService.ts:1` | Save/load game state |
| Currency | `currencyService.ts:1` | Economy transactions |

## Known Integrations

- **Anki Connect**: External flashcard system integration
- **UNICAMP Data**: Brazilian university entrance exam content
- **Map Crafting**: Dynamic study session generation
- **Knowledge Decay**: Spaced repetition mechanics

## Assessment Notes

- **Complexity**: High - 47 action types, ~20 interconnected systems
- **State Size**: Large - comprehensive game state object
- **Loop Frequency**: 1Hz tick rate with sub-systems on different intervals
- **Persistence Risk**: Auto-save could mask progression issues during simulation
- **Economic Balance**: Multiple currency types suggest complex economy needing analysis

## Next Analysis Targets

1. **Core Loop**: Study cycle mechanics and XP/loot calculations
2. **Balance**: Currency flow, loot rates, progression curves
3. **Edge Cases**: Overflow protection, negative values, state corruption
4. **Performance**: Tick frequency impact, state update efficiency