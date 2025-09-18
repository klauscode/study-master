import React from 'react'
import { useGameState } from '../../context/GameStateContext'
import { calculateXpPerMinute, computeCategoryNudge } from '../../services/experienceService'
import { calculateKnowledgeDecay } from '../../services/knowledgeDecayService'
import { calculateTotalStatBonus } from '../../services/characterService'
import CoachRail from '../ui/CoachRail'
import StudyClock from '../ui/StudyClock'
import type { ConsumableItem } from '../../types/gameTypes'
import consumablesData from '../../constants/consumables.json'
import { getActiveConsumables, isConsumableActive, createActiveConsumable, consumeCurrency, getActiveMultiplier } from '../../services/consumableService'

const CONSUMABLES = consumablesData as ConsumableItem[]

export default function StudySessionView(){
  const { state, dispatch } = useGameState()
  const xpPerMin = calculateXpPerMinute(state)
  const nudge = computeCategoryNudge(state)
  const activeGem = state.gems.find(g => g.id === state.activeGemId)
  const inStudy = state.session.mode === 'study'
  const canStart = !!activeGem && document.visibilityState === 'visible'

  const currency = state.currency || {}
  const totalCurrency = Object.values(currency).reduce((sum, val) => sum + val, 0)

  const [showConsumables, setShowConsumables] = React.useState(false)
  const [showSettings, setShowSettings] = React.useState(false)

  const useConsumable = (consumable: ConsumableItem) => {
    // Check if same consumable type is already active (using game state)
    if (isConsumableActive(state.activeConsumables || [], consumable.id)) {
      alert(`${consumable.name} is already active! Wait for it to expire before using another.`)
      return
    }

    if (totalCurrency < consumable.cost) {
      alert(`Not enough currency! Need ${consumable.cost}, have ${totalCurrency}`)
      return
    }

    // Consume currency using centralized logic
    if (!consumeCurrency(currency, consumable.cost, dispatch)) {
      alert('Failed to consume currency')
      return
    }

    // Activate the consumable using centralized logic
    const activeConsumable = createActiveConsumable(consumable)
    dispatch({ type: 'ACTIVATE_CONSUMABLE', consumable: activeConsumable })
  }

  // const activeConsumables = getActiveConsumables(state.activeConsumables)

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'micro': return '#4CAF50'
      case 'medium': return '#FF9800'
      case 'premium': return '#9C27B0'
      default: return '#666'
    }
  }

  // Calculate total active multipliers for display using centralized service
  const activeXpMultiplier = getActiveMultiplier(state.activeConsumables || [], 'xp_multiplier');
  const activeFocusMultiplier = getActiveMultiplier(state.activeConsumables || [], 'focus_multiplier');
  const activeLootQuantityMultiplier = getActiveMultiplier(state.activeConsumables || [], 'loot_quantity');
  
  // Estimate loot rate per cycle
  const equippedItems = Object.values(state.character.equipped).filter(Boolean) as any[]
  const qtyBonus = calculateTotalStatBonus(equippedItems as any, 'lootQuantityPercent') || 0
  const baseCount = 3 + Math.floor(state.focus.multiplier * 2)
  const momentumBonus = Math.min(2, Math.floor(((state.loot?.momentumSeconds || 0) as number) / 900))
  const lootPerCycle = Math.max(3, Math.round((baseCount + momentumBonus) * (1 + qtyBonus / 100) * activeLootQuantityMultiplier))

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 16,
      height: 'calc(100vh - 120px)',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Main Study Panel */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}>
        {/* Compact Header */}
        <div style={{
          textAlign: 'center',
          padding: 16,
          background: inStudy
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))'
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
          borderRadius: 16,
          border: `2px solid ${inStudy ? 'rgba(34, 197, 94, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
        }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            background: inStudy
              ? 'linear-gradient(45deg, #22c55e, #10b981)'
              : 'linear-gradient(45deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {inStudy ? '📚 Study Session' : '☕ Rest Break'}
          </h1>
        </div>

        {/* Main Timer + HUD */}
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid var(--border)',
          borderRadius: 20,
          padding: 24,
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16
        }}>
          {/* Progress ring timer */}
          <div style={{ position:'relative' }}>
            <StudyClock
              seconds={inStudy ? state.session.elapsedSeconds : state.session.restElapsedSeconds}
              totalSeconds={inStudy ? state.session.cycleLengthSeconds : state.session.restLengthSeconds}
              isStudyMode={inStudy}
              isActive={state.isStudying}
            />
            {/* Active buffs around timer: simple row under timer for now */}
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:12 }}>
              {getActiveConsumables(state.activeConsumables).map(b => {
                const end = new Date(b.endsAt).getTime();
                const left = Math.max(0, Math.floor((end - Date.now())/1000));
                const minutes = Math.floor(left/60);
                const seconds = left%60;
                const primary = b.effects[0]?.type || 'xp_multiplier';
                const icon = primary === 'xp_multiplier' ? '⚡'
                  : primary === 'focus_multiplier' ? '🎯'
                  : primary === 'loot_quantity' ? '📦'
                  : primary === 'loot_rarity' ? '💎'
                  : primary === 'currency_gain' ? '💰'
                  : primary === 'stamina_protection' ? '🛡️'
                  : '✨';
                return (
                  <div key={b.id} title={b.name}
                    style={{ display:'flex', alignItems:'center', gap:6, border:'1px solid var(--border)', borderRadius:8, padding:'6px 8px', background:'var(--bg)' }}>
                    <span style={{ fontSize:16 }}>{icon}</span>
                    <span style={{ fontSize:12, opacity:0.8 }}>{minutes}:{seconds.toString().padStart(2,'0')}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Performance HUD */}
          <div style={{ display:'flex', gap:16, alignItems:'center', justifyContent:'center' }}>
            <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px' }}>Focus × {state.focus.multiplier.toFixed(2)}</div>
            <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px' }}>XP/min {Math.round(xpPerMin)}</div>
            <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px' }}>Loot � {lootPerCycle}/cycle</div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 24
          }}>
            <button
              disabled={!inStudy || !canStart}
              onClick={() => dispatch({ type:'TOGGLE_STUDY', studying: !state.isStudying })}
              style={{
                background: (inStudy && canStart)
                  ? (state.isStudying ? '#ef4444' : '#22c55e')
                  : 'var(--border)',
                color: (inStudy && canStart) ? 'white' : 'var(--fg)',
                border: 'none',
                borderRadius: 16,
                padding: '16px 32px',
                fontSize: 18,
                fontWeight: 700,
                cursor: (inStudy && canStart) ? 'pointer' : 'not-allowed',
                opacity: (inStudy && canStart) ? 1 : 0.6,
                transition: 'all 0.2s ease',
                minWidth: 140
              }}
            >
              {state.isStudying ? '⏸️ Pause' : '▶️ Start'}
            </button>
            {!inStudy && (
              <button
                onClick={() => dispatch({ type:'START_STUDY' })}
                style={{
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: 16,
                  padding: '16px 32px',
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: 140
                }}
              >
                ⏭️ Skip Rest
              </button>
            )}
          </div>

          {/* Current Study Topic */}
          {activeGem && (
            <div style={{
              marginTop: 24,
              padding: 16,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600
            }}>
              📚 Studying: <span style={{ color: '#22c55e' }}>{activeGem.name}</span>
              {state.session.topic && <span style={{ opacity: 0.7 }}> • {state.session.topic}</span>}
            </div>
          )}

          {!activeGem && (
            <div style={{
              marginTop: 24,
              padding: 16,
              background: 'rgba(245, 158, 11, 0.1)',
              border: '2px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              color: '#f59e0b'
            }}>
              ⚠️ Select a subject gem to start studying
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setShowConsumables(!showConsumables)}
            style={{
              background: showConsumables ? 'var(--accent)' : 'var(--card-bg)',
              color: showConsumables ? 'white' : 'var(--fg)',
              border: '2px solid var(--accent)',
              borderRadius: 12,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🧪 Quick Consumables {totalCurrency > 0 && `(${totalCurrency})`}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: showSettings ? 'var(--accent)' : 'var(--card-bg)',
              color: showSettings ? 'white' : 'var(--fg)',
              border: '2px solid var(--accent)',
              borderRadius: 12,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Collapsible Consumables */}
        {showConsumables && (
          <div style={{
            background: 'var(--card-bg)',
            border: '2px solid var(--accent)',
            borderRadius: 12,
            padding: 16
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--accent)' }}>🧪 Quick Use Consumables</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {CONSUMABLES.filter(c => c.tier === 'micro' || c.tier === 'medium').map(consumable => (
                <div
                  key={consumable.id}
                  style={{
                    background: 'var(--bg)',
                    border: `1px solid ${getTierColor(consumable.tier)}`,
                    borderRadius: 8,
                    padding: 12,
                    opacity: totalCurrency >= consumable.cost ? 1 : 0.5
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{consumable.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: getTierColor(consumable.tier) }}>
                        {consumable.name}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>
                        {consumable.cost} currency
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => useConsumable(consumable)}
                    disabled={totalCurrency < consumable.cost}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      background: totalCurrency >= consumable.cost ? getTierColor(consumable.tier) : 'var(--bg)',
                      color: totalCurrency >= consumable.cost ? 'white' : 'var(--fg-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      cursor: totalCurrency >= consumable.cost ? 'pointer' : 'not-allowed',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    Use Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Settings */}
        {showSettings && (
          <div style={{
            background: 'var(--card-bg)',
            border: '2px solid var(--accent)',
            borderRadius: 12,
            padding: 16
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--accent)' }}>⚙️ Session Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, display: 'block', marginBottom: 8 }}>
                  📚 Study (sec)
                </label>
                <input
                  type='number'
                  min={300}
                  step={60}
                  value={state.session.cycleLengthSeconds}
                  onChange={e => dispatch({ type:'SET_CYCLE_LENGTH', seconds: Math.max(60, Number(e.target.value||0)) })}
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    border: '2px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, display: 'block', marginBottom: 8 }}>
                  ☕ Rest (sec)
                </label>
                <input
                  type='number'
                  min={60}
                  step={60}
                  value={state.session.restLengthSeconds}
                  onChange={e => dispatch({ type:'SET_REST_LENGTH', seconds: Math.max(30, Number(e.target.value||0)) })}
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    border: '2px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, display: 'block', marginBottom: 8 }}>
                  📚 Topic
                </label>
                <input
                  value={state.session.topic ?? ''}
                  onChange={e => dispatch({ type:'SET_SESSION_TOPIC', topic: e.target.value })}
                  placeholder='e.g., Math - Linear Equations'
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    border: '2px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 14
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sessions (compact) */}
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>Recent Study Sessions</div>
        <div style={{ display:'grid', gap:6 }}>
          {(state.analytics.cycles.slice(-3) as any[]).reverse().map((r,i)=> (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, borderBottom:'1px solid var(--border)', paddingBottom:6 }}>
              <span>{new Date(r.startedAtISO).toLocaleTimeString()} · {Math.round((r.studySeconds||0)/60)}m</span>
              <span style={{ color:'#22c55e' }}>+{r.xpGained} XP</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{
        display: 'none'
      }}>
        {/* Subject Selection */}
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid var(--border)',
          borderRadius: 12,
          padding: 16
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>💎 Active Subject</h3>
          <select
            value={state.activeGemId ?? ''}
            onChange={e => dispatch({ type:'SET_ACTIVE_GEM', id: e.target.value })}
            style={{
              width: '100%',
              background: 'var(--bg)',
              color: 'var(--fg)',
              border: activeGem ? '2px solid #22c55e' : '2px solid var(--border)',
              borderRadius: 8,
              padding: '12px',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            <option value='' disabled>Select a subject</option>
            {state.gems.map(g => {
              const decay = calculateKnowledgeDecay(g, new Date().toISOString());
              const decayWarning = decay.isInDangerZone ? ' ⚠️' : '';
              return (
                <option key={g.id} value={g.id}>
                  {g.name} · Lv{g.level}{decayWarning}
                </option>
              );
            })}
          </select>
        </div>

        {/* Performance Stats */}
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid var(--border)',
          borderRadius: 12,
          padding: 16
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>📊 Performance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              background: activeXpMultiplier > 1 ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg)',
              border: activeXpMultiplier > 1 ? '2px solid #22c55e' : '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600
            }}>
              📈 {xpPerMin.toFixed(1)} XP/min {activeXpMultiplier > 1 && `🔥`}
            </div>
            <div style={{
              background: activeFocusMultiplier > 1 ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg)',
              border: activeFocusMultiplier > 1 ? '2px solid #6366f1' : '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600
            }}>
              🎯 {state.focus.multiplier.toFixed(2)}x Focus {activeFocusMultiplier > 1 && `🔥`}
            </div>
            {nudge > 1 && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#f59e0b'
              }}>
                ✨ +{Math.round((nudge-1)*100)}% category bonus
              </div>
            )}
            {activeLootQuantityMultiplier > 1 && (
              <div style={{
                background: 'rgba(168, 85, 247, 0.2)',
                border: '2px solid #a855f7',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#a855f7'
              }}>
                🎁 {activeLootQuantityMultiplier.toFixed(1)}x Loot 🔥
              </div>
            )}
            {activeLootQuantityMultiplier > 1 && (
              <div style={{
                background: 'rgba(236, 72, 153, 0.2)',
                border: '2px solid #ec4899',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#ec4899'
              }}>
                💎 {activeLootQuantityMultiplier.toFixed(1)}x Rarity 🔥
              </div>
            )}
          </div>
        </div>

        {/* Coach Rail */}
        <CoachRail />
      </div>
    </div>
  )
}

// formatTime helper was unused in this view

