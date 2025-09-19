import React from 'react'
import './App.css'
import { GameStateProvider, useGameState } from './context/GameStateContext'
import InventoryGrid from './components/systems/InventoryGrid'
import CharacterPanel from './components/systems/CharacterPanel'
import AnalyticsView from './components/views/AnalyticsView'
import DailyTasksView from './components/views/DailyTasksView'
import StudyPage from './components/views/StudyPage'
import SettingsView from './components/views/SettingsView'
import CurrencyBenchView from './components/views/CurrencyBenchView'
import AnkiView from './components/views/AnkiView'
import MapCraftView from './components/views/MapCraftView'
import ShopView from './components/views/ShopView'
import { resetGameState } from './services/persistenceService'
import { calculateXPForNextLevel } from './services/experienceService'
import GemsView from './components/views/GemsView'

const TABS = ['study','character','inventory','shop','tasks','gems','analytics','settings','currency','anki','maps'] as const
type Tab = typeof TABS[number]

function Main() {
  const { state } = useGameState()
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const getInitialTab = (): Tab => {
    const h = (window.location.hash || '').replace('#','') as Tab
    return (TABS as readonly string[]).includes(h) ? (h as Tab) : 'study'
  }
  const [tab, setTabState] = React.useState<Tab>(getInitialTab())
  const setTab = (t: Tab) => { setTabState(t); window.location.hash = t }
  React.useEffect(() => {
    const onHash = () => setTabState(getInitialTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const curXP = state.character.xp || 0
  const curLevel = state.character.level || 1
  const nextReq = calculateXPForNextLevel(curLevel)
  const xpPct = Math.max(0, Math.min(1, curXP / Math.max(1, nextReq)))
  const activeGem = state.gems.find(g => g.id === state.activeGemId)
  return (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--fg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <header style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap:'wrap' }}>
        <h1 style={{ margin: 0, marginRight: 'auto' }}>Klaus Study</h1>
        <button onClick={() => setTab('study')} disabled={tab==='study'}>Study</button>
        <button onClick={() => setTab('character')} disabled={tab==='character'}>Character</button>
        <button onClick={() => setTab('tasks')} disabled={tab==='tasks'}>Tasks</button>
        <button onClick={() => setTab('shop')} disabled={tab==='shop'}>Shop</button>
        <div style={{ position:'relative' }}>
          <button onClick={() => setShowAdvanced(v=>!v)}>Advanced</button>
          {showAdvanced && (
            <div style={{ position:'absolute', top:'110%', left:0, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:8, padding:8, display:'grid', gap:6, zIndex:10 }}>
              <button onClick={()=>{ setTab('inventory'); setShowAdvanced(false) }} disabled={tab==='inventory'}>Inventory</button>
              <button onClick={()=>{ setTab('maps'); setShowAdvanced(false) }} disabled={tab==='maps'}>Maps</button>
              <button onClick={()=>{ setTab('currency'); setShowAdvanced(false) }} disabled={tab==='currency'}>Crafting</button>
              <button onClick={()=>{ setTab('anki'); setShowAdvanced(false) }} disabled={tab==='anki'}>Anki</button>
              <button onClick={()=>{ setTab('analytics'); setShowAdvanced(false) }} disabled={tab==='analytics'}>Analytics</button>
              <button onClick={()=>{ setTab('gems'); setShowAdvanced(false) }} disabled={tab==='gems'}>Gems</button>
              <button onClick={()=>{ setTab('settings'); setShowAdvanced(false) }} disabled={tab==='settings'}>Settings</button>
            </div>
          )}
        </div>
      </header>
      {/* Floating XP bar */}
      <div style={{ padding:'6px 12px', borderBottom:'1px solid var(--border)', background:'var(--card-bg)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ fontSize:18 }}>⭐</div>
        <div style={{ flex:1, height:10, background:'var(--bg)', borderRadius:6, overflow:'hidden', border:'1px solid #1f2937' }}>
          <div style={{ width: `${(xpPct*100).toFixed(1)}%`, height:'100%', background:'#22c55e' }} />
        </div>
        <div style={{ fontSize:12, minWidth:100, textAlign:'right' }}>Lv {curLevel} • {(xpPct*100).toFixed(0)}%</div>
        {activeGem && (
          <div style={{ fontSize:12, border:'1px solid var(--border)', borderRadius:6, padding:'2px 6px' }}>{activeGem.name} {activeGem.level}</div>
        )}
      </div>
      <main style={{
        padding: 16,
        flex: 1,
        overflow: 'auto',
        height: 'calc(100vh - 80px)'
      }}>
        {tab === 'study' ? <StudyPage />
          : tab === 'character' ? <CharacterPanel />
          : tab === 'gems' ? <GemsView />
          : tab === 'inventory' ? <InventoryGrid />
          : tab === 'shop' ? <ShopView />
          : tab === 'analytics' ? <AnalyticsView />
          : tab === 'tasks' ? <DailyTasksView />
          : tab === 'currency' ? <CurrencyBenchView />
          : tab === 'anki' ? <AnkiView />
          : tab === 'maps' ? <MapCraftView />
          : <SettingsView />}
      </main>
    </div>
  )
}

function ResetFunctionExposer() {
  const { dispatch } = useGameState();
  (window as any).resetGame = () => {
    if (window.confirm('Are you sure you want to reset your game? This will delete all your progress.')) {
      resetGameState();
      dispatch({ type: 'RESET_GAME' });
    }
  };
  return null;
}

export default function App() {
  return (
    <GameStateProvider>
      <Main />
      <CycleSummaryModal />
      <ResetFunctionExposer />
    </GameStateProvider>
  )
}

function CycleSummaryModal(){
  const { state, dispatch } = useGameState()
  const summary = state.ui?.lastCycleSummary
  const [visible, setVisible] = React.useState(true)
  React.useEffect(()=>{ setVisible(true) }, [summary?.record.endedAtISO])
  if (!summary || !visible) return null
  const r = summary.record
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width: 560, maxWidth:'92%', background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:10, padding:16, color:'var(--fg)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontWeight:700 }}>Cycle Complete</div>
          <button onClick={()=>{ setVisible(false); dispatch({ type:'CLEAR_CYCLE_SUMMARY' }) }}>Close</button>
        </div>
        <div style={{ fontSize:13, opacity:0.8, marginBottom:8 }}>
          {new Date(r.startedAtISO).toLocaleTimeString()} → {new Date(r.endedAtISO).toLocaleTimeString()} • {Math.round(r.studySeconds/60)} min{r.topic ? ` • ${r.topic}` : ''}
        </div>
        <div style={{ display:'flex', gap:16, marginBottom:12 }}>
          <SummaryStat label="Avg Focus" value={r.avgFocus.toFixed(2)} />
          <SummaryStat label="XP" value={String(Math.round(r.xpGained))} />
          <SummaryStat label="Loot" value={String(r.lootCount)} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
          {summary.items.map(it => (
            <div key={it.id} style={{ border:'1px solid var(--border)', borderRadius:8, padding:10, background:'var(--bg)' }}>
              <div style={{ fontWeight:600 }}>{it.name}</div>
              <div style={{ fontSize:12, opacity:0.8 }}>{it.rarity} • {it.slot}</div>
              {it.affixes.length>0 && (
                <ul style={{ margin:'8px 0 0 16px', padding:0 }}>
                  {it.affixes.map(a=> <li key={a.id} style={{ fontSize:12 }}>{a.name} {a.value}%</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
        {summary.orbs && summary.orbs.length>0 && (
          <div style={{ marginTop:12 }}>
            <div style={{ fontWeight:600, marginBottom:6 }}>Orbs</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {summary.orbs.map((o, i)=> (
                <span key={i} style={{ border:'1px solid var(--border)', borderRadius:6, padding:'6px 8px', background:'var(--bg)', fontSize:12 }}>{o.type} × {o.count}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryStat({label, value}:{label:string; value:string}){
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:10, minWidth:120, background:'var(--card-bg)' }}>
      <div style={{ fontSize:12, opacity:0.7 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700 }}>{value}</div>
    </div>
  )
}

