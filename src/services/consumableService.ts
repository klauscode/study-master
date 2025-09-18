import type { ActiveConsumable, ConsumableItem } from '../types/gameTypes'

// Single-source helpers for consumables: active filtering, stacking, creation, and spending.

// Return only non-expired consumables
export function getActiveConsumables(activeConsumables?: ActiveConsumable[]): ActiveConsumable[] {
  if (!activeConsumables) return []
  const now = Date.now()
  return activeConsumables.filter(c => new Date(c.endsAt).getTime() > now)
}

// Check if a consumable type is already active
export function isConsumableActive(activeConsumables: ActiveConsumable[], consumableId: string): boolean {
  const active = getActiveConsumables(activeConsumables)
  return active.some(c => c.consumableId === consumableId)
}

// Get total multiplier for a specific effect type (e.g., 'xp_multiplier')
export function getActiveMultiplier(activeConsumables: ActiveConsumable[], effectType: string): number {
  const active = getActiveConsumables(activeConsumables)
  let multiplier = 1.0
  for (const consumable of active) {
    const effect = consumable.effects.find(e => e.type === effectType)
    if (effect) multiplier *= effect.value
  }
  return multiplier
}

// Create an ActiveConsumable from a shop item definition
export function createActiveConsumable(consumable: ConsumableItem): ActiveConsumable {
  const now = new Date()
  const maxDuration = Math.max(...consumable.effects.map(e => e.duration))
  return {
    id: `${consumable.id}-${Date.now()}`,
    consumableId: consumable.id,
    name: consumable.name,
    effects: consumable.effects,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + (maxDuration * 60 * 1000)).toISOString()
  }
}

// Spend currency proportionally across available types; returns false if insufficient
export function consumeCurrency(
  currency: Record<string, number>,
  cost: number,
  dispatch: (action: any) => void
): boolean {
  const totalCurrency = Object.values(currency).reduce((sum, val) => sum + (val || 0), 0)
  if (totalCurrency < cost) return false

  let remaining = cost
  for (const [type, amount] of Object.entries(currency)) {
    if (remaining <= 0) break
    const available = amount || 0
    if (available <= 0) continue
    const toSpend = Math.min(available, remaining)
    if (toSpend > 0) {
      dispatch({ type: 'CONSUME_CURRENCY', currency: type, count: toSpend })
      remaining -= toSpend
    }
  }
  return true
}
