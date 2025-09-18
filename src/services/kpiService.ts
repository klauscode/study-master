import type { GameState, CurrencyLedger } from '../types/gameTypes'
import { calculateXpPerMinute, calculateXPForNextLevel } from './experienceService'

type KPIEntry = {
  time_hr: number
  start_iso: string
  end_iso: string
  player_level: number
  zone: string
  xp_total: number
  xp_per_hr: number
  gold_total: number
  gold_per_hr: number
  dps: number
  ttk_avg: number
  drops_rare: number
  drops_epic: number
  craft_items: number
  upgrade_costs_spent: number
  prestige_count: number
}

function guardFinite(n: number, name: string): number {
  if (!Number.isFinite(n)) throw new Error(`NaN/Inf detected for ${name}`)
  return n
}

function sumCurrency(state: GameState): number {
  const map = state.currency || {}
  return Object.values(map).reduce((a, b) => a + (b || 0), 0)
}

function sumLedger(
  ledger: CurrencyLedger | undefined,
  startMs: number,
  endMs: number,
  filter: (t: CurrencyLedger['transactions'][number]) => boolean
): number {
  if (!ledger) return 0
  let total = 0
  for (const t of ledger.transactions) {
    const ts = new Date(t.timestamp).getTime()
    if (ts >= startMs && ts < endMs && filter(t)) total += t.amount
  }
  return total
}

export function computeKpisLastHours(state: GameState, HOURS: number, now: Date = new Date()): KPIEntry[] {
  const KPIs: KPIEntry[] = []
  const nowMs = now.getTime()

  for (let hr = 0; hr < HOURS; hr++) {
    const startMs = nowMs - (HOURS - hr) * 3600_000
    const endMs = nowMs - (HOURS - hr - 1) * 3600_000

    // XP gained this hour via cycle analytics
    const cycles = (state.analytics?.cycles || []).filter((c) => {
      const end = new Date(c.endedAtISO).getTime()
      return end >= startMs && end < endMs
    })
    const xpPerHr = Math.max(0, Math.round(cycles.reduce((s, c) => s + (c.xpGained || 0), 0)))

    // Currency gained and spent this hour via ledger
    const gainedThisHour = sumLedger(
      state.currencyLedger,
      startMs,
      endMs,
      (t) => t.source === 'loot' || t.source === 'task'
    )
    const spentThisHour = sumLedger(state.currencyLedger, startMs, endMs, (t) => t.source === 'spent')

    // Throughput and TTK analogue
    const dps = guardFinite(calculateXpPerMinute(state), 'xpm')
    const lvl = state.character.level || 0
    const xp = guardFinite(state.character.xp || 0, 'xp')
    const toNext = Math.max(0, calculateXPForNextLevel(lvl) - xp)
    const ttk_avg = dps > 0 ? +(toNext / dps * 60).toFixed(2) : 0 // seconds to next level

    // Context (zone)
    const zone = state.gems.find(g => g.id === state.activeGemId)?.name || 'None'

    // Drops/crafting analogues
    const craft_items = cycles.length // study cycles completed in the window
    // We do not persist item rarities per cycle; expose zeros for now.
    const drops_rare = 0
    const drops_epic = 0

    // Maps completed
    const mapsCompleted = (state.analytics?.mapResults || []).filter(r => {
      const ts = new Date(r.endedAtISO).getTime()
      return ts >= startMs && ts < endMs
    }).length

    KPIs.push({
      time_hr: hr,
      start_iso: new Date(startMs).toISOString(),
      end_iso: new Date(endMs).toISOString(),
      player_level: lvl,
      zone,
      xp_total: xp,
      xp_per_hr: xpPerHr,
      gold_total: sumCurrency(state),
      gold_per_hr: guardFinite(gainedThisHour, 'gold_per_hr'),
      dps,
      ttk_avg,
      drops_rare,
      drops_epic,
      craft_items: craft_items + mapsCompleted, // cycles + maps as productivity
      upgrade_costs_spent: guardFinite(spentThisHour, 'spent_per_hr'),
      prestige_count: 0,
    })
  }

  return KPIs
}

// Convenience: compute a single consolidated snapshot for "last N hours"
export function computeKpisSummary(state: GameState, hours: number, now: Date = new Date()) {
  const rows = computeKpisLastHours(state, hours, now)
  const xp_per_hr = rows.reduce((s, r) => s + r.xp_per_hr, 0)
  const gold_per_hr = rows.reduce((s, r) => s + r.gold_per_hr, 0)
  const spent_per_hr = rows.reduce((s, r) => s + r.upgrade_costs_spent, 0)
  const cycles = rows.reduce((s, r) => s + r.craft_items, 0)
  return {
    hours,
    xp_per_hr,
    gold_per_hr,
    spent_per_hr,
    craft_items: cycles,
    xpm_now: calculateXpPerMinute(state),
    ttk_seconds_now: (() => {
      const lvl = state.character.level || 0
      const xp = state.character.xp || 0
      const toNext = Math.max(0, calculateXPForNextLevel(lvl) - xp)
      const xpm = calculateXpPerMinute(state)
      return xpm > 0 ? +(toNext / xpm * 60).toFixed(2) : 0
    })()
  }
}

