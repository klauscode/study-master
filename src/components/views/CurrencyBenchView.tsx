import React from 'react'
import { useGameState } from '../../context/GameStateContext'
import AffixDisplay from '../ui/AffixDisplay'
import CurrencyLedger from '../ui/CurrencyLedger'
import { getAllCraftingRequirements, getCraftingAction } from '../../services/craftingService'
import ORBS from '../../constants/orbs.json'
import AFFIX_STATS from '../../constants/affix_tiers.json'

import type { Item } from '../../types/gameTypes'

// Add animation styles
const animationStyles = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
`

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('crafting-animations')) {
  const style = document.createElement('style')
  style.id = 'crafting-animations'
  style.textContent = animationStyles
  document.head.appendChild(style)
}

const rarityColors: Record<string, string> = {
  Common: '#c0c0c0',
  Magic: '#6aa2ff',
  Rare: '#ffcc33',
  Epic: '#c280ff',
}

export default function CurrencyBenchView(){
  const { state, dispatch } = useGameState()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [history, setHistory] = React.useState<{ time:string; action:string; name:string; rarity:string; slot:string }[]>([])
  const [notification, setNotification] = React.useState<{ message: string; type: 'success' | 'error' | 'info'; timeout: number } | null>(null)
  const selected = state.inventory.find(i => i.id === selectedId) || null

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const timeout = Date.now() + 3000
    setNotification({ message, type, timeout })
    setTimeout(() => {
      setNotification(prev => prev?.timeout === timeout ? null : prev)
    }, 3000)
  }

  const craftItem = (orbType: string) => {
    if (!selected) {
      showNotification('Select an item first!', 'error')
      return
    }

    const currency = state.currency || {}
    const orbCount = currency[orbType] || 0

    if (orbCount < 1) {
      showNotification(`You need at least 1 ${orbType}!`, 'error')
      return
    }

    // Check if orb can be used on this item
    let canUse = true
    let reason = ''

    switch (orbType) {
      case 'Transmute':
        if (selected.rarity !== 'Common') {
          canUse = false
          reason = 'Can only transmute Common items'
        }
        break
      case 'Alchemy':
        if (selected.rarity !== 'Magic') {
          canUse = false
          reason = 'Can only use Alchemy on Magic items'
        }
        break
      case 'Chaos':
        if (selected.rarity !== 'Rare') {
          canUse = false
          reason = 'Can only use Chaos on Rare items'
        }
        break
      case 'Regal':
        if (selected.rarity !== 'Magic') {
          canUse = false
          reason = 'Can only use Regal on Magic items'
        }
        break
      case 'Augment':
        if (selected.affixes.length >= 4) {
          canUse = false
          reason = 'Item already has maximum affixes'
        }
        break
      case 'Exalted':
        if (selected.affixes.length >= 4) {
          canUse = false
          reason = 'Item already has maximum affixes'
        }
        break
    }

    if (!canUse) {
      showNotification(reason, 'error')
      return
    }

    // Apply the crafting
    let result: Item
    const oldRarity = selected.rarity

    try {
      switch (orbType) {
        case 'Transmute': result = transmute(selected); break
        case 'Alchemy': result = alchemy(selected); break
        case 'Scour': result = scour(selected); break
        case 'Chaos': result = chaos(selected); break
        case 'Regal': result = regal(selected); break
        case 'Augment': result = augment(selected); break
        case 'Exalted':
          // 25% fail chance for Exalted
          if (Math.random() > 0.75) {
            dispatch({ type: 'CONSUME_CURRENCY', currency: orbType, count: 1 })
            showNotification('😔 Exalted orb failed! (25% chance)', 'error')
            return
          }
          result = exalted(selected);
          break
        default:
          showNotification('Unknown orb type', 'error')
          return
      }

      // Success!
      dispatch({ type: 'CONSUME_CURRENCY', currency: orbType, count: 1 })
      dispatch({ type: 'REPLACE_INVENTORY_ITEM', id: selected.id!, item: result })

      setHistory([{
        time: new Date().toLocaleTimeString(),
        action: orbType,
        name: result.name,
        rarity: result.rarity,
        slot: result.slot
      }, ...history].slice(0, 10))

      let message = `✨ ${orbType} successful!`
      if (oldRarity !== result.rarity) {
        message += ` Upgraded to ${result.rarity}!`
      }
      showNotification(message, 'success')

    } catch {
      showNotification('Crafting failed', 'error')
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          background: notification.type === 'success' ? '#22c55e' : notification.type === 'error' ? '#ef4444' : '#3b82f6',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 14
        }}>
          {notification.message}
        </div>
      )}

      <h1 style={{ textAlign: 'center', marginBottom: 30, fontSize: 28 }}>🔨 Crafting Bench</h1>

      {/* Inventory Grid */}
      <div style={{ marginBottom: 30 }}>
        <h3>Select Item to Craft</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          maxHeight: 300,
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 16
        }}>
          {state.inventory.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.6, padding: 40 }}>
              No items in inventory
            </div>
          ) : (
            state.inventory.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                style={{
                  border: selectedId === item.id ? `2px solid ${rarityColors[item.rarity]}` : '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  background: selectedId === item.id ? `${rarityColors[item.rarity]}20` : 'var(--bg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  fontWeight: 600,
                  color: rarityColors[item.rarity],
                  marginBottom: 4
                }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {item.slot} • {item.rarity} • {item.affixes.length}/4 affixes
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Item Display */}
      {selected && (
        <div style={{
          border: `2px solid ${rarityColors[selected.rarity]}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
          background: `${rarityColors[selected.rarity]}10`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}>
            <h3 style={{ margin: 0, color: rarityColors[selected.rarity] }}>
              {selected.name}
            </h3>
            <span style={{
              background: rarityColors[selected.rarity],
              color: 'white',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600
            }}>
              {selected.rarity}
            </span>
          </div>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
            {selected.slot} • Item Level {selected.itemLevel} • {selected.affixes.length}/4 Affixes
          </div>
          {selected.affixes.length > 0 && (
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 12
            }}>
              <AffixDisplay affixes={selected.affixes} itemLevel={selected.itemLevel} />
            </div>
          )}
        </div>
      )}

      {/* Orb Crafting Area */}
      <div style={{
        border: '2px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        background: 'var(--card-bg)'
      }}>
        <h3 style={{ marginBottom: 20 }}>Currency Orbs</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 16
        }}>
          {ORBS.map((orb: any) => {
            const count = (state.currency || {})[orb.type] || 0
            const canAfford = count > 0

            return (
              <div
                key={orb.type}
                onClick={() => canAfford && selected ? craftItem(orb.type) : null}
                style={{
                  border: canAfford ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'center',
                  cursor: canAfford && selected ? 'pointer' : 'not-allowed',
                  opacity: canAfford && selected ? 1 : 0.5,
                  transition: 'all 0.2s ease',
                  background: canAfford ? 'var(--accent-bg)' : 'var(--bg)'
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                  {orb.type}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: canAfford ? '#22c55e' : '#ef4444' }}>
                  {count}
                </div>
              </div>
            )
          })}
        </div>

        {!selected && (
          <div style={{
            textAlign: 'center',
            padding: 20,
            opacity: 0.6,
            fontSize: 14,
            marginTop: 20
          }}>
            Select an item above to start crafting
          </div>
        )}
      </div>

      {/* Currency & History */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        marginTop: 20
      }}>
        {/* Recent Crafts */}
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 16,
          background: 'var(--card-bg)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <h4 style={{ margin: 0 }}>Recent Crafts</h4>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 10,
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.6, padding: 20 }}>
              No crafts yet
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {history.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 8,
                    fontSize: 12
                  }}
                >
                  <div style={{ fontWeight: 600, color: rarityColors[entry.rarity] }}>
                    {entry.action} → {entry.name}
                  </div>
                  <div style={{ opacity: 0.7 }}>
                    {entry.time} • {entry.rarity} {entry.slot}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Currency Ledger */}
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 16,
          background: 'var(--card-bg)'
        }}>
          <CurrencyLedger
            ledger={state.currencyLedger}
            currentCurrency={state.currency || {}}
          />
        </div>
      </div>
    </div>
  )
}



// Simple helpers for crafting
function rand(seedRef: {s:number}){ seedRef.s = (1664525 * seedRef.s + 1013904223) % 4294967296; return seedRef.s / 4294967296 }
function rollCount(min:number,max:number, r:()=>number){ return min===max?min: (Math.floor(r()*(max-min+1))+min) }
function tierProb(ilvl:number){ return ilvl>=40 ? [0.10,0.30,0.60] : ilvl>=20 ? [0.0,0.40,0.60] : [0,0,1] }
function pickTier(ilvl:number, r:()=>number){ const probs=tierProb(ilvl); const tiers=['T1','T2','T3']; let x=r(); for(let i=0;i<tiers.length;i++){ if((x-=probs[i])<=0) return tiers[i] } return 'T3' }
function rollAffix(ilvl:number, r:()=>number){ const pool = (AFFIX_STATS as any[]); const stat = pool[Math.floor(r()*pool.length)]; const tier = pickTier(ilvl,r); const t1 = stat.t1Base as number; const mult = tier==='T1'?1: tier==='T2'?0.66:0.33; const val = +(t1*mult + ilvl*(stat.scaling as number)).toFixed(2); return { id: `${Date.now()}-${Math.floor(r()*1e6)}`, name: `+% ${pretty(stat.stat)}`, stat: stat.stat, value: val } }
function pretty(k:string){ const m:any={xpGainPercent:'XP Gain',gemXpGainPercent:'Gem XP Gain',lootQuantityPercent:'Loot Quantity',lootRarityPercent:'Loot Rarity',focusGainRatePercent:'Focus Gain Rate'}; return m[k]||k }

function cloneItem(it:Item){ return JSON.parse(JSON.stringify(it)) }

function transmute(it:Item){ const s={s:Date.now()}; const r=()=>rand(s); const out=cloneItem(it); out.rarity='Magic'; out.affixes=[]; const cnt=rollCount(1,2,r); for(let i=0;i<cnt;i++) out.affixes.push(rollAffix(out.itemLevel,r)); return out }
function alchemy(it:Item){ const s={s:Date.now()}; const r=()=>rand(s); const out=cloneItem(it); out.rarity='Rare'; out.affixes=[]; const cnt=rollCount(2,4,r); for(let i=0;i<cnt;i++) out.affixes.push(rollAffix(out.itemLevel,r)); return out }
function scour(it:Item){ const out=cloneItem(it); out.rarity='Common'; out.affixes=[]; return out }
function chaos(it:Item){ const s={s:Date.now()}; const r=()=>rand(s); const out=cloneItem(it); const cnt=out.affixes.length || rollCount(2,4,r); out.affixes=[]; for(let i=0;i<cnt;i++) out.affixes.push(rollAffix(out.itemLevel,r)); return out }
function regal(it:Item){ const s={s:Date.now()}; const r=()=>rand(s); const out=cloneItem(it); out.rarity='Rare'; if(out.affixes.length<4) out.affixes.push(rollAffix(out.itemLevel,r)); return out }
function augment(it:Item){ const s={s:Date.now()}; const r=()=>rand(s); const out=cloneItem(it); if(out.affixes.length<4) out.affixes.push(rollAffix(out.itemLevel,r)); return out }
function exalted(it:Item){ const s={s:Date.now()}; const r=()=>rand(s); const out=cloneItem(it); if(out.affixes.length<4 && r()<0.75) out.affixes.push(rollAffix(out.itemLevel,r)); return out }

// New UI Components
function ItemSelectionPanel({ inventory, selectedId, onSelect }: {
  inventory: Item[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{
      border: '2px solid var(--border)',
      borderRadius: 20,
      padding: 24,
      background: 'var(--card-bg)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: 'var(--accent)' }}>📦 Select Item to Craft</div>

      {inventory.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 40,
          opacity: 0.6,
          fontSize: 14
        }}>
          No items in inventory. Complete study cycles to earn loot!
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
          maxHeight: 'calc(100vh - 500px)',
          minHeight: '300px',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '4px 8px 4px 4px'
        }}>
          {inventory.map(item => (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                border: selectedId === item.id ? `3px solid ${rarityColors[item.rarity]}` : '2px solid var(--border)',
                borderRadius: 16,
                padding: 16,
                background: selectedId === item.id ? `${rarityColors[item.rarity]}15` : 'var(--bg)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: selectedId === item.id ? 'scale(1.02)' : 'scale(1)',
                boxShadow: selectedId === item.id ? `0 6px 20px ${rarityColors[item.rarity]}30` : '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8
              }}>
                <div style={{
                  color: rarityColors[item.rarity],
                  fontWeight: 700,
                  fontSize: 14
                }}>
                  {item.name}
                </div>
                <div style={{
                  background: rarityColors[item.rarity],
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}>
                  {item.rarity}
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                {item.slot} • Item Level {item.itemLevel}
              </div>
              {item.affixes && item.affixes.length > 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11
                }}>
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontWeight: 600
                  }}>
                    {item.affixes.length} affix{item.affixes.length !== 1 ? 'es' : ''}
                  </div>
                </div>
              ) : (
                <div style={{
                  fontSize: 11,
                  color: '#94a3b8',
                  fontStyle: 'italic'
                }}>
                  No affixes
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CraftingActionsPanel({ item, currency, onCraft, onConsume, onNotification }: {
  item: Item | null;
  currency: Record<string, number>;
  onCraft: (action: string, newItem: Item) => void;
  onConsume: (type: string, count: number) => void;
  onNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const craftingActions = getAllCraftingRequirements(item, currency);

  const handleCraft = (actionId: string) => {
    if (!item) {
      onNotification('No item selected for crafting', 'error');
      return;
    }

    const action = getCraftingAction(actionId);
    if (!action) {
      onNotification('Invalid crafting action', 'error');
      return;
    }

    const requirement = action.requirements(item, currency);
    if (!requirement.canCraft) {
      onNotification(requirement.reason || 'Cannot craft with this item', 'error');
      return;
    }

    // Special handling for Exalted orb (75% chance)
    if (actionId === 'exalted' && Math.random() > 0.75) {
      onConsume(action.name, 1);
      onNotification('😔 Exalted orb failed! No affix was added (25% chance)', 'error');
      return;
    }

    // Show crafting start notification
    onNotification(`🔨 Applying ${action.name} to ${item.name}...`, 'info');

    // Execute the crafting action
    let newItem: Item;
    try {
      switch (actionId) {
        case 'transmute': newItem = transmute(item); break;
        case 'alchemy': newItem = alchemy(item); break;
        case 'scour': newItem = scour(item); break;
        case 'chaos': newItem = chaos(item); break;
        case 'regal': newItem = regal(item); break;
        case 'augment': newItem = augment(item); break;
        case 'exalted': newItem = exalted(item); break;
        default:
          onNotification('Unknown crafting action', 'error');
          return;
      }

      onConsume(action.name, 1);
      onCraft(action.name, newItem);
    } catch (error) {
      onNotification('Crafting failed due to an error', 'error');
    }
  };

  return (
    <div style={{
      border: '2px solid var(--border)',
      borderRadius: 20,
      padding: 24,
      background: 'var(--card-bg)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: 'var(--accent)' }}>⚡ Crafting Actions</div>

      {!item ? (
        <div style={{
          textAlign: 'center',
          padding: 40,
          opacity: 0.6,
          fontSize: 14
        }}>
          Select an item above to see available crafting options
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {craftingActions.map(({ id, name, description, icon, color, requirement }) => (
            <div
              key={id}
              style={{
                border: requirement.canCraft ? `2px solid ${color}` : '2px solid var(--border)',
                borderRadius: 16,
                padding: 20,
                background: requirement.canCraft ? `${color}15` : 'var(--bg)',
                opacity: requirement.canCraft ? 1 : 0.65,
                transition: 'all 0.3s ease',
                boxShadow: requirement.canCraft ? `0 4px 16px ${color}20` : '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <span style={{ fontWeight: 600, color: requirement.canCraft ? color : 'var(--fg)' }}>
                    {name}
                  </span>
                </div>
                <button
                  onClick={() => handleCraft(id)}
                  disabled={!requirement.canCraft}
                  onMouseEnter={(e) => {
                    if (requirement.canCraft) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = `0 6px 20px ${color}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (requirement.canCraft) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                  style={{
                    background: requirement.canCraft ? color : 'var(--border)',
                    color: requirement.canCraft ? 'white' : 'var(--fg)',
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: requirement.canCraft ? 'pointer' : 'not-allowed',
                    opacity: requirement.canCraft ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                    transform: requirement.canCraft ? 'scale(1)' : 'scale(0.95)',
                    textShadow: requirement.canCraft ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                  }}
                >
                  {requirement.canCraft ? '✨ Craft' : '❌ Craft'}
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                {description}
              </div>

              <div style={{
                fontSize: 11,
                color: requirement.canCraft ? '#22c55e' : '#ef4444',
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: 8,
                background: requirement.canCraft ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${requirement.canCraft ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                marginTop: 4
              }}>
                <span style={{ marginRight: 6 }}>
                  {requirement.canCraft ? '✓' : '⚠'}
                </span>
                {requirement.reason || requirement.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemDetailsPanel({ item }: { item: Item | null }) {
  return (
    <div style={{
      border: '2px solid var(--border)',
      borderRadius: 20,
      padding: 24,
      background: 'var(--card-bg)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: 'var(--accent)' }}>🔍 Item Details</div>

      {!item ? (
        <div style={{
          textAlign: 'center',
          padding: 20,
          opacity: 0.6,
          fontSize: 14
        }}>
          No item selected
        </div>
      ) : (
        <div style={{
          border: `2px solid ${rarityColors[item.rarity]}`,
          borderRadius: 16,
          padding: 20,
          background: `${rarityColors[item.rarity]}08`,
          marginBottom: 20
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <div style={{
              color: rarityColors[item.rarity],
              fontSize: 18,
              fontWeight: 800
            }}>
              {item.name}
            </div>
            <div style={{
              background: rarityColors[item.rarity],
              color: 'white',
              padding: '4px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>
              {item.rarity}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 16,
            fontSize: 12,
            opacity: 0.8
          }}>
            <div>
              <strong>Slot:</strong> {item.slot}
            </div>
            <div>
              <strong>Item Level:</strong> {item.itemLevel}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              🔮 Affixes
              <span style={{
                background: item.affixes?.length ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                color: item.affixes?.length ? '#22c55e' : '#94a3b8',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600
              }}>
                {item.affixes?.length || 0}/4
              </span>
            </div>
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 12,
              minHeight: 60
            }}>
              <AffixDisplay affixes={item.affixes || []} itemLevel={item.itemLevel} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CurrencyWalletPanel({ currency }: { currency: Record<string, number> }) {
  return (
    <div style={{
      border: '2px solid var(--border)',
      borderRadius: 20,
      padding: 24,
      background: 'var(--card-bg)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: 'var(--accent)' }}>💰 Currency Wallet</div>

      <div style={{ display: 'grid', gap: 12 }}>
        {(ORBS as any[]).map((orb: any) => {
          const count = currency[orb.type] || 0;
          return (
            <div
              key={orb.type}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: count > 0 ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg)',
                borderRadius: 12,
                border: count > 0 ? '2px solid rgba(34, 197, 94, 0.3)' : '2px solid var(--border)',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontWeight: 500 }}>{orb.type}</span>
              <span style={{
                fontWeight: 600,
                color: count > 0 ? '#22c55e' : 'var(--fg)',
                fontSize: 16
              }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CraftHistoryPanel({ history, onClearHistory }: {
  history: { time: string; action: string; name: string; rarity: string; slot: string }[];
  onClearHistory: () => void;
}) {
  return (
    <div style={{
      border: '2px solid var(--border)',
      borderRadius: 20,
      padding: 24,
      background: 'var(--card-bg)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>📜 Recent Crafts</div>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 40,
          opacity: 0.6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            fontSize: 32,
            opacity: 0.3
          }}>
            📜
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 500
          }}>
            No crafting history yet
          </div>
          <div style={{
            fontSize: 11,
            opacity: 0.7,
            maxWidth: 200,
            lineHeight: 1.4
          }}>
            Start crafting items to see your recent modifications here
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: 16,
          maxHeight: '280px',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '4px 8px 4px 4px'
        }}>
          {history.map((entry, i) => {
            const isRecent = i < 3;
            return (
              <div
                key={i}
                style={{
                  background: isRecent ? `${rarityColors[entry.rarity]}10` : 'var(--bg)',
                  border: `2px solid ${isRecent ? rarityColors[entry.rarity] : 'var(--border)'}`,
                  borderRadius: 16,
                  padding: '16px 20px',
                  fontSize: 12,
                  transition: 'all 0.2s ease',
                  boxShadow: isRecent ? `0 4px 16px ${rarityColors[entry.rarity]}20` : '0 2px 8px rgba(0, 0, 0, 0.05)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {isRecent && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: rarityColors[entry.rarity],
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: 6,
                    fontSize: 9,
                    fontWeight: 700,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    NEW
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8
                }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: `linear-gradient(45deg, ${rarityColors[entry.rarity]}, ${rarityColors[entry.rarity]}80)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700
                  }}>
                    ✨
                  </div>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontWeight: 700,
                      color: rarityColors[entry.rarity]
                    }}>
                      {entry.action}
                    </span>
                    <span style={{
                      fontSize: 10,
                      opacity: 0.6,
                      fontWeight: 500
                    }}>
                      {entry.time}
                    </span>
                  </div>
                </div>
                <div style={{
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span style={{
                    color: rarityColors[entry.rarity],
                    fontWeight: 700
                  }}>
                    {entry.name}
                  </span>
                  <span style={{
                    background: 'var(--bg)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 9,
                    opacity: 0.8
                  }}>
                    {entry.rarity} {entry.slot}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


