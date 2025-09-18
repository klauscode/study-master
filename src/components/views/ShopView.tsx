import { useGameState } from '../../context/GameStateContext'
import type { ConsumableItem } from '../../types/gameTypes'
import consumablesData from '../../constants/consumables.json'
import { getActiveConsumables, isConsumableActive, createActiveConsumable, consumeCurrency } from '../../services/consumableService'

const CONSUMABLES = consumablesData as ConsumableItem[]


export default function ShopView() {
  const { state, dispatch } = useGameState()

  const currency = state.currency || {}
  const totalCurrency = Object.values(currency).reduce((sum, val) => sum + val, 0)

  const buyConsumable = (consumable: ConsumableItem) => {
    if (totalCurrency < consumable.cost) {
      alert(`Not enough currency! Need ${consumable.cost}, have ${totalCurrency}`)
      return
    }

    // Consume currency using centralized logic
    if (!consumeCurrency(currency, consumable.cost, dispatch)) {
      alert('Failed to consume currency')
      return
    }

    // Add as a Usable (one use)
    const usable = {
      id: `usable-${consumable.id}-${Date.now()}`,
      name: consumable.name,
      description: 'Consumable item (use to activate effects)',
      kind: 'consumable',
      payload: { consumableId: consumable.id },
      usesLeft: 1
    }
    dispatch({ type: 'ADD_USABLE', usable } as any)
    alert('Consumable added to Usables!')
  }


  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'micro': return '#4CAF50'
      case 'medium': return '#FF9800'
      case 'premium': return '#9C27B0'
      default: return '#666'
    }
  }

  const activeConsumables = getActiveConsumables(state.activeConsumables)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h2>🛒 Consumables Shop</h2>

      {/* Active Buffs Display */}
      {activeConsumables.length > 0 && (
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid var(--accent)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16
        }}>
          <h3 style={{ color: 'var(--accent)', marginBottom: 12 }}>🔥 Active Buffs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
            {activeConsumables.map(consumable => {
              const timeLeft = Math.max(0, new Date(consumable.endsAt).getTime() - Date.now())
              const minutesLeft = Math.ceil(timeLeft / (1000 * 60))

              return (
                <div key={consumable.id} style={{
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent)',
                  borderRadius: 6,
                  padding: 12
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {CONSUMABLES.find(c => c.id === consumable.consumableId)?.icon} {consumable.name}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    ⏰ {minutesLeft} minutes left
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    {consumable.effects.map((effect, i) => (
                      <div key={i}>
                        {effect.type === 'xp_multiplier' && `+${((effect.value - 1) * 100).toFixed(0)}% XP`}
                        {effect.type === 'focus_multiplier' && `+${((effect.value - 1) * 100).toFixed(0)}% Focus`}
                        {effect.type === 'loot_quantity' && `+${((effect.value - 1) * 100).toFixed(0)}% Loot Qty`}
                        {effect.type === 'loot_rarity' && `+${((effect.value - 1) * 100).toFixed(0)}% Rarity`}
                        {effect.type === 'currency_gain' && `+${((effect.value - 1) * 100).toFixed(0)}% Currency`}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Currency Display */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16
      }}>
        <h3>Your Currency</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(currency).map(([type, amount]) => (
            <div key={type} style={{
              background: 'var(--bg)',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)'
            }}>
              <strong>{type}:</strong> {amount}
            </div>
          ))}
          <div style={{
            background: 'var(--accent-bg)',
            padding: '8px 12px',
            borderRadius: 6,
            border: '2px solid var(--accent)',
            fontWeight: 600
          }}>
            Total: {totalCurrency}
          </div>
        </div>
      </div>

      {/* Usables inventory */}
      {Boolean(state.usables && state.usables.length>0) && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16
        }}>
          <h3>Usables</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {state.usables!.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{u.description || (u.kind==='consumable'?'Consumable':'Reward')}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>x{u.usesLeft}</span>
                  <button onClick={() => dispatch({ type: 'USE_USABLE', usableId: u.id })}
                    style={{ background: 'var(--accent)', color: 'var(--accent-fg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>Use</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
          {/* Consumables by tier */}
          {['micro', 'medium', 'premium'].map(tier => (
            <div key={tier} style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16
            }}>
              <h3 style={{
                color: getTierColor(tier),
                textTransform: 'capitalize',
                marginBottom: 16
              }}>
                {tier} Consumables
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {CONSUMABLES.filter(c => c.tier === tier).map(consumable => (
                  <div
                    key={consumable.id}
                    style={{
                      background: 'var(--bg)',
                      border: `2px solid ${getTierColor(tier)}`,
                      borderRadius: 8,
                      padding: 16,
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>{consumable.icon}</span>
                      <div>
                        <h4 style={{ margin: 0, color: getTierColor(tier) }}>{consumable.name}</h4>
                        <div style={{ fontSize: 14, opacity: 0.8 }}>{consumable.description}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 12, fontSize: 12 }}>
                      {consumable.effects.map((effect, i) => (
                        <div key={i} style={{ opacity: 0.7 }}>
                          • {effect.duration} minutes duration
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: totalCurrency >= consumable.cost ? 'var(--success)' : 'var(--error)'
                      }}>
                        {consumable.cost} currency
                      </div>
                      <button
                        onClick={() => buyConsumable(consumable)}
                        disabled={totalCurrency < consumable.cost}
                        style={{
                          padding: '8px 16px',
                          background: totalCurrency >= consumable.cost ? getTierColor(tier) : 'var(--bg)',
                          color: totalCurrency >= consumable.cost ? 'white' : 'var(--fg-muted)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          cursor: totalCurrency >= consumable.cost ? 'pointer' : 'not-allowed',
                          fontWeight: 600
                        }}
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
    </div>
  )
}
