# Studyfall

A gamified study companion built with React + TypeScript + Vite. Track focused study cycles, gain XP and loot, equip items, manage "subject gems", and analyze progress with dashboards — optionally integrating with Anki via AnkiConnect.

## Quick Start

- `npm install`
- `npm run dev` (Vite dev server)
- `npm run build` (production build)
- `npm run preview` (serve the build)
- Utilities:
  - `npm run gen:gems` (generate gems from edital, see `tools/`)
  - `npm run craft:map` (craft text map from lineup)

Open `http://localhost:5173` (or the port Vite prints).

## Features

- Focused study/rest cycles with autosave and daily resets
- XP/Level curve, focus and stamina system, knowledge decay
- Deterministic loot generator with rarity tiers and affixes
- Inventory and equipment affecting stats and rewards
- Consumables and timed rewards that multiply gains
- Subject gems with categories for study balance/nudges
- Analytics: cycles, time bins, category totals, CSV export
- Optional Anki integration (local AnkiConnect)

## Project Structure

- `src/context/GameStateContext.tsx` — global reducer + autosave + timers
- `src/services/` — domain logic (xp, loot, crafting, decay, ledger, etc.)
- `src/components/` — UI (systems, views, and small UI pieces)
- `public/data/gems.jsonl` — initial gem catalog (JSON Lines)

## Anki Integration (Optional)

1) Install Anki + AnkiConnect add‑on (default port 8765)
2) Keep Anki running when using Anki features
3) The app calls AnkiConnect at `http://127.0.0.1:8765`

If disconnected, UI should degrade gracefully (no crash).

## Persistence

- Saves to `localStorage` under `studyfall.save.v1`
- Basic migration scaffolding is present; schema evolution can be handled in `persistenceService.ts`

## Development Notes

- TypeScript is strict; ESLint is configured but the codebase intentionally allows some `any` in places for faster iteration
- No external state libraries; a single reducer keeps logic centralized
- UI uses inline styles and CSS variables in `src/index.css`

## License

Private project — do not redistribute without permission.
