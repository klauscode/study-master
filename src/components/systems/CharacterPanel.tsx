import { useGameState } from '../../context/GameStateContext'
import characterImg from '../../assets/character.svg'
import { calculateTotalStatBonus } from '../../services/characterService'
import { calculateXPForNextLevel } from '../../services/experienceService'

export default function CharacterPanel() {
  const { state, dispatch } = useGameState()
  const imgUrl = state.settings?.characterImageUrl
  const equipped = state.character.equipped as any
  const slots: Array<{slot:string; item:any}> = [
    { slot:'Head', item: equipped.Head },
    { slot:'Chest', item: equipped.Chest },
    { slot:'Legs', item: equipped.Legs },
    { slot:'Feet', item: equipped.Feet },
    { slot:'Accessory', item: equipped.Accessory },
    { slot:'Weapon', item: equipped.Weapon },
  ]

  const items = Object.values(equipped).filter(Boolean) as any[]
  const stat = (k: any) => Math.round((calculateTotalStatBonus(items as any, k as any) || 0) * 100) / 100

  const level = state.character.level || 1
  const xp = state.character.xp || 0
  const next = Math.max(1, calculateXPForNextLevel(level))
  const xpPct = Math.max(0, Math.min(1, xp / next))

  return (
    <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:16, maxWidth:1200, margin:'0 auto' }}>
      {/* Character card */}
      <div style={{ border:'1px solid var(--border)', borderRadius:16, padding:16, textAlign:'center', background:'var(--card-bg)' }}>
        <div style={{ fontWeight:800, marginBottom:8 }}>Level {level}</div>
        <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', background:'var(--bg)' }}>
          <img src={imgUrl || characterImg} alt='Character' style={{ width:'100%', display:'block' }} onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = characterImg }} />
        </div>
        <div style={{ marginTop:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, opacity:0.85, marginBottom:6 }}>XP to next level</div>
          <div style={{ height:10, background:'var(--bg)', borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
            <div style={{ width:`${(xpPct*100).toFixed(1)}%`, height:'100%', background:'#22c55e' }} />
          </div>
          <div style={{ fontSize:12, opacity:0.7, marginTop:6 }}>{Math.round(xp)} / {next} ({Math.round(xpPct*100)}%)</div>
        </div>
        <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8 }}>
          <StatPill label='XP Gain' value={`+${stat('xpGainPercent')}%`} color='#22c55e' />
          <StatPill label='Gem XP' value={`+${stat('gemXpGainPercent')}%`} color='#16a34a' />
          <StatPill label='Loot Qty' value={`+${stat('lootQuantityPercent')}%`} color='#3b82f6' />
          <StatPill label='Loot Rarity' value={`+${stat('lootRarityPercent')}%`} color='#8b5cf6' />
          <StatPill label='Focus Rate' value={`+${stat('focusGainRatePercent')}%`} color='#f59e0b' />
        </div>
      </div>

      {/* Equipment grid */}
      <div style={{ border:'1px solid var(--border)', borderRadius:16, padding:16, background:'var(--card-bg)' }}>
        <div style={{ fontWeight:800, marginBottom:12 }}>Equipment</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
          {slots.map(({slot,item}) => (
            <div key={slot} style={{ border:'1px solid var(--border)', borderRadius:12, padding:12, background:'var(--bg)', display:'grid', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontSize:12, opacity:0.75 }}>{slot}</div>
                <div style={{ fontSize:11, opacity:0.6 }}>{item?.rarity || ''}</div>
              </div>
              <div style={{ fontWeight:700, marginBottom:6 }}>{item ? item.name : 'Empty'}</div>
              {item && (
                <div style={{ display:'grid', gap:4 }}>
                  <div style={{ fontSize:11, opacity:0.7 }}>ilvl {item.itemLevel}</div>
                  {Array.isArray(item.affixes) && item.affixes.length>0 && (
                    <ul style={{ margin:'6px 0 0 16px', padding:0 }}>
                      {item.affixes.map((a:any)=> (
                        <li key={a.id} style={{ fontSize:12 }}>{a.name} {a.value}%</li>
                      ))}
                    </ul>
                  )}
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <button
                      onClick={() => dispatch({ type:'UNEQUIP_SLOT', slot: slot as any })}
                      style={{ padding:'6px 10px', fontSize:12 }}
                    >
                      Unequip
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatPill({ label, value, color }:{ label:string; value:string; color:string }){
  return (
    <div style={{
      display:'flex',
      justifyContent:'space-between',
      alignItems:'center',
      padding:'8px 10px',
      border:'1px solid var(--border)',
      borderRadius:10,
      background:'var(--bg)'
    }}>
      <span style={{ fontSize:12, opacity:0.7 }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:700, color }}>{value}</span>
    </div>
  )
}


