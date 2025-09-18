import React from 'react'
import { useGameState } from '../../context/GameStateContext'
import { craftMapFromGems, formatCraftedMapText, getAffixDisplayName } from '../../services/mapCraftService'
import type { GemTopic, CraftedMap, DifficultyTier } from '../../services/mapCraftService'
import { getRewardsByCategory } from '../../services/rewardService'
import { generateRandomItem } from '../../services/lootService'
import type { ActiveReward } from '../../types/gameTypes'

// Base map crafting cost
const BASE_CRAFT_COST = {
  "Map Fragment": 1,
  "Cartographer's Chisel": 1
}

// Get color for difficulty tier
const getDifficultyColor = (tier: DifficultyTier): string => {
  switch (tier) {
    case 'Bronze': return '#CD7F32'
    case 'Silver': return '#C0C0C0'
    case 'Gold': return '#FFD700'
    case 'Platinum': return '#E5E4E2'
    case 'Diamond': return '#B9F2FF'
    default: return '#CD7F32'
  }
}

// Get reward multiplier based on difficulty tier
const getDifficultyMultiplier = (tier: DifficultyTier): number => {
  switch (tier) {
    case 'Bronze': return 1.0
    case 'Silver': return 1.3
    case 'Gold': return 1.6
    case 'Platinum': return 2.0
    case 'Diamond': return 2.5
    default: return 1.0
  }
}

// Top-level stable modal component to avoid remounts on parent re-renders
type PreStudyPromptModalStableProps = {
  craftedMap: any
  onProceed: (answers: { concepts: string; formulas: string; examples: string }) => void
  onSkip: () => void
}

function PreStudyPromptModalStable({ craftedMap, onProceed, onSkip }: PreStudyPromptModalStableProps) {
  const [answers, setAnswers] = React.useState({ concepts: '', formulas: '', examples: '' })

  const usedGems = craftedMap?.lineup?.map((l: any) => ({
    name: l.gemId || 'Unknown',
    allocation: l.allocated || 0
  })) || []

  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '2px solid var(--accent)',
      borderRadius: 12,
      padding: 32,
      minWidth: 600,
      maxWidth: 800,
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
      <h2 style={{ marginBottom: 24, textAlign: 'center', color: 'var(--accent)' }}>
        🧠 Active Recall Check
      </h2>
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 14, opacity: 0.8 }}>
          Before you start, test your memory! This improves retention and identifies knowledge gaps.
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        📚 Topics in this map:
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {usedGems.map((gem: any, i: number) => (
            <div key={i} style={{
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              padding: '4px 12px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 600
            }}>
              Topic {i + 1} ({gem.allocation}q)
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
          📝 Key concepts you remember (without looking):
        </label>
        <textarea
          value={answers.concepts}
          onChange={e => setAnswers(prev => ({ ...prev, concepts: e.target.value }))}
          placeholder="List the main concepts, definitions, or ideas you recall from these topics..."
          style={{ width: '100%', height: 80, padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 14, resize: 'vertical' }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
          🧮 Formulas or methods you recall:
        </label>
        <textarea
          value={answers.formulas}
          onChange={e => setAnswers(prev => ({ ...prev, formulas: e.target.value }))}
          placeholder="Write down any formulas, equations, or step-by-step methods you remember..."
          style={{ width: '100%', height: 80, padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 14, resize: 'vertical' }}
        />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
          💡 Examples or applications you can think of:
        </label>
        <textarea
          value={answers.examples}
          onChange={e => setAnswers(prev => ({ ...prev, examples: e.target.value }))}
          placeholder="Can you think of specific examples, use cases, or practice problems?"
          style={{ width: '100%', height: 80, padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 14, resize: 'vertical' }}
        />
      </div>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, marginBottom: 20, fontSize: 13, opacity: 0.8 }}>
        <strong>Why this helps:</strong> Active recall before studying strengthens memory pathways and helps you identify what you already know vs. what needs more attention!
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onSkip} style={{ flex: 1, padding: '12px 24px', background: 'var(--bg)', color: 'var(--fg-muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
          Skip & Start
        </button>
        <button onClick={() => onProceed(answers)} style={{ flex: 2, padding: '12px 24px', background: 'var(--accent)', color: 'var(--accent-fg)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
          Done - Start Map Session
        </button>
      </div>
    </div>
  )
}

// Stable Score Input Modal (prevents remount refresh)
type ScoreInputModalStableProps = {
  craftedMap: CraftedMap | null
  studyTimeMinutes: number
  onNext: (session: { correct: number; total: number; timeSpent: number }) => void
}

function ScoreInputModalStable({ craftedMap, studyTimeMinutes, onNext }: ScoreInputModalStableProps) {
  const { state, dispatch } = useGameState()
  const [score, setScore] = React.useState('')
  const [timeSpent, setTimeSpent] = React.useState(studyTimeMinutes.toString())
  const [notes, setNotes] = React.useState('')
  const [confidence, setConfidence] = React.useState(3)
  const [difficulty, setDifficulty] = React.useState(3)
  const [topicCorrect, setTopicCorrect] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    try {
      const counters = (window as any).__sf_runCounters || {}
      if (craftedMap?.lineup && Object.keys(counters).length > 0) {
        const pre: Record<string, number> = {}
        craftedMap.lineup.forEach((l:any)=>{ pre[l.gemId] = Math.min(l.allocated||0, counters[l.gemId]?.correct || 0) })
        setTopicCorrect(pre)
        const total = Object.values(pre).reduce((s,v)=>s+v,0)
        if (!score) setScore(String(total))
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitScore = () => {
    // Build per-topic results
    let perTopic: Array<{ gemId: string; name: string; allocated: number; correct: number }> = []
    if (craftedMap?.lineup?.length) {
      perTopic = craftedMap.lineup.map(l => ({
        gemId: l.gemId,
        name: l.name,
        allocated: l.allocated || 0,
        correct: Math.max(0, Math.min(l.allocated || 0, Number.isFinite(topicCorrect[l.gemId] as any) ? (topicCorrect[l.gemId] || 0) : 0))
      }))
    }
    const sumPer = perTopic.reduce((s, r) => s + (r.correct || 0), 0)
    const correctAnswers = sumPer > 0 ? sumPer : (parseInt(score) || 0)
    const actualTimeSpent = parseInt(timeSpent) || studyTimeMinutes

    // XP and currency
    const accuracy = correctAnswers / (craftedMap?.questionCount || 1)
    const timeBonus = actualTimeSpent <= studyTimeMinutes ? 1.2 : 1.0
    const confidenceBonus = confidence >= 4 && accuracy >= 0.8 ? 1.15 : 1.0
    const difficultyBonus = difficulty >= 4 ? 1.1 : 1.0
    const baseXP = 10 * correctAnswers
    const finalXP = Math.round(baseXP * timeBonus * confidenceBonus * difficultyBonus)
    if (craftedMap && craftedMap.lineup && craftedMap.questionCount > 0) {
      const total = craftedMap.questionCount
      craftedMap.lineup.forEach(l => {
        const share = Math.max(0, Math.min(1, (l.allocated || 0) / total))
        const amt = Math.round(finalXP * share)
        if (amt > 0) dispatch({ type: 'GAIN_XP', gemId: l.gemId, amount: amt })
      })
    }
    if (accuracy >= 0.5) {
      let baseCurrency = 75
      switch (craftedMap?.difficultyTier) {
        case 'Silver': baseCurrency = 100; break
        case 'Gold': baseCurrency = 150; break
        case 'Platinum': baseCurrency = 225; break
        case 'Diamond': baseCurrency = 350; break
      }
      let performanceMultiplier = 1.0
      if (accuracy >= 0.9) performanceMultiplier = 3.0
      else if (accuracy >= 0.85) performanceMultiplier = 2.5
      else if (accuracy >= 0.7) performanceMultiplier = 2.0
      else if (accuracy >= 0.6) performanceMultiplier = 1.5
      const timeB = actualTimeSpent <= studyTimeMinutes ? 1.25 : 1.0
      let finalCurrency = Math.round(baseCurrency * performanceMultiplier * timeB)
      // Apply triple_loot (maps mode) if present
      const hasMapTriple = (state.activeRewards || []).some(r => r.type==='triple_loot' && (r.remainingMaps||0) > 0)
      if (hasMapTriple) finalCurrency *= 3
      dispatch({ type: 'EARN_CURRENCY', currency: 'Transmute', count: finalCurrency, source: 'loot', description: `Map completion bonus (${(accuracy * 100).toFixed(1)}% accuracy)` })
      if (hasMapTriple) dispatch({ type: 'CONSUME_REWARD_CHARGE', rewardType: 'triple_loot', mode: 'maps' })
    }

    // SRS + tasks + analytics
    try {
      const lineup = craftedMap?.lineup || []
      for (const l of lineup) {
        const alloc = l.allocated || 0
        const corr = (perTopic.find(r => r.gemId === l.gemId)?.correct || 0)
        const acc = alloc > 0 ? (corr / alloc) : 0
        let q: 0|1|2|3|4|5 = acc >= 0.9 ? 5 : acc >= 0.8 ? 4 : acc >= 0.7 ? 3 : acc >= 0.6 ? 2 : acc >= 0.4 ? 1 : 0
        if (confidence >= 4 && q < 5) q = (q + 1) as any
        if (difficulty >= 4 && q > 0) q = (q - 1) as any
        dispatch({ type: 'SRS_REVIEW', gemId: l.gemId, quality: q })
      }
      const endedAtISO = new Date().toISOString()
      const analyticsLineup = (craftedMap?.lineup || []).map((l:any) => ({ gemId: l.gemId, name: l.name, allocated: l.allocated }))
      dispatch({ type: 'ADD_MAP_RESULT', result: {
        endedAtISO,
        questionCount: craftedMap?.questionCount || correctAnswers,
        correctAnswers,
        accuracy: (craftedMap?.questionCount || 0) > 0 ? correctAnswers / (craftedMap?.questionCount || 1) : 0,
        timeSpentMinutes: actualTimeSpent,
        difficultyTier: craftedMap?.difficultyTier || 'Bronze',
        affixes: craftedMap?.affixes || [],
        lineup: analyticsLineup
      } } as any)
    } catch {}

    onNext({ correct: correctAnswers, total: craftedMap?.questionCount || 1, timeSpent: actualTimeSpent })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100 }}>
      <div style={{ background:'var(--card-bg)', border:'2px solid var(--accent)', borderRadius:12, padding:24, width:'min(600px, 96%)' }}>
        <h2 style={{ marginTop:0, color:'var(--accent)', textAlign:'center' }}>Study Session Complete!</h2>
        <div style={{ fontSize:14, opacity:0.8, marginBottom:16 }}>
          <strong>Map Details:</strong> Questions: {craftedMap?.questionCount} • Planned Time: {studyTimeMinutes}m
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display:'block', marginBottom:4, fontWeight:600 }}>How many questions did you get correct?</label>
          <input type="number" min={0} max={craftedMap?.questionCount || 10} value={score} onChange={e=>setScore(e.target.value)}
            style={{ width:'100%', padding:12, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, color:'var(--fg)' }} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          <div>
            <label style={{ display:'block', marginBottom:4, fontWeight:600 }}>Time spent (minutes)</label>
            <input type="number" min={1} max={999} value={timeSpent} onChange={e=>setTimeSpent(e.target.value)}
              style={{ width:'100%', padding:12, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, color:'var(--fg)' }} />
          </div>
          <div>
            <label style={{ display:'block', marginBottom:4, fontWeight:600 }}>Confidence (1–5)</label>
            <input type="number" min={1} max={5} value={confidence} onChange={e=>setConfidence(parseInt(e.target.value)||3)}
              style={{ width:'100%', padding:12, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, color:'var(--fg)' }} />
          </div>
        </div>
        {craftedMap?.lineup?.length ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight:600, marginBottom:4, color:'var(--accent)' }}>Per-topic Results (optional)</div>
            <div style={{ display:'grid', gap:8 }}>
              {craftedMap.lineup.map((l:any)=> (
                <div key={l.gemId} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ minWidth: 180 }}>{l.name} <span style={{ opacity:0.6, fontSize:12 }}>({l.allocated}q)</span></div>
                  <input type="number" min={0} max={l.allocated||0} value={Number(topicCorrect[l.gemId]||0)}
                    onChange={e=> setTopicCorrect(prev=> ({ ...prev, [l.gemId]: Math.max(0, Math.min(l.allocated||0, parseInt(e.target.value)||0)) }))}
                    style={{ width:80, background:'var(--bg)', color:'var(--fg)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 8px' }} />
                  <span style={{ opacity:0.7, fontSize:12 }}>correct</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display:'block', marginBottom:4, fontWeight:600 }}>Notes (optional)</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)}
            style={{ width:'100%', height:80, padding:12, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, color:'var(--fg)' }} />
        </div>
        <button onClick={submitScore} disabled={!score} style={{ width:'100%', padding:'12px 24px', background: score ? 'var(--accent)' : 'var(--bg)', color: score ? 'var(--accent-fg)' : 'var(--fg-muted)', border:'1px solid var(--border)', borderRadius:6, cursor: score ? 'pointer' : 'not-allowed', fontSize:16, fontWeight:600 }}>Submit Results</button>
      </div>
    </div>
  )
}

type RewardSelectionModalStableProps = {
  craftedMap: CraftedMap | null
  studyTimeMinutes: number
  sessionScore: { correct: number; total: number; timeSpent: number }
  onClose: () => void
}

function RewardSelectionModalStable({ craftedMap, studyTimeMinutes, sessionScore, onClose }: RewardSelectionModalStableProps) {
  const { state, dispatch } = useGameState()
  const [selectedRewards, setSelectedRewards] = React.useState<Record<string, string>>({})
  const accuracy = sessionScore.correct / (sessionScore.total || 1)
  const rewardTiers = getRewardsByCategory(accuracy)

  const selectReward = (category: string, rewardId: string) => setSelectedRewards(prev => ({ ...prev, [category]: rewardId }))

  const claimRewards = () => {
    const correctAnswers = sessionScore.correct
    const actualTimeSpent = sessionScore.timeSpent
    const timeBonus = actualTimeSpent <= studyTimeMinutes ? 1.2 : 1.0
    const difficultyMultiplier = getDifficultyMultiplier(craftedMap?.difficultyTier || 'Bronze')
    const baseXP = 10 * correctAnswers
    const finalXP = Math.round(baseXP * timeBonus * difficultyMultiplier)

    const usedGemIds = craftedMap?.lineup.map(l => l.gemId) || []
    usedGemIds.forEach(gemId => { dispatch({ type: 'GAIN_XP', gemId, amount: finalXP }) })

    Object.entries(selectedRewards).forEach(([_category, rewardId]) => {
      const rewardOption = Object.values(rewardTiers).flat().find(r => r.id === rewardId)
      if (!rewardOption) return
      if (rewardOption.type === 'equipment') {
        const avgGemLevel = (craftedMap?.lineup.reduce((sum, l) => {
          const g = state.gems.find(x => x.id === l.gemId)
          return sum + (g?.level || 1)
        }, 0) || 1) / (craftedMap?.lineup.length || 1)
        const seed = Date.now() + Math.floor(Math.random() * 1_000_000)
        const itemLevel = Math.max(1, Math.floor(avgGemLevel))
        const item = generateRandomItem(seed, itemLevel, 0)
        dispatch({ type: 'ADD_TO_INVENTORY', item })
      } else if (rewardOption.type === 'buff' && rewardOption.durationMinutes) {
        // Add reward as Usable(s)
        if (rewardOption.id.includes('focus')) {
          const usable = {
            id: `usable-${rewardOption.id}-${Date.now()}`,
            name: rewardOption.name,
            description: 'Use to activate Focus Freeze',
            kind: 'reward',
            payload: { rewardId: rewardOption.id },
            usesLeft: 1
          }
          dispatch({ type: 'ADD_USABLE', usable } as any)
        } else {
          const baseId = rewardOption.id
          const cyclesUsable = {
            id: `usable-${baseId}-cycles-${Date.now()}`,
            name: `${rewardOption.name} (cycles)`,
            description: 'Use to apply Loot Surge (cycles charges)',
            kind: 'reward',
            payload: { rewardId: `${baseId}-cycles` },
            usesLeft: 1
          }
          const mapsUsable = {
            id: `usable-${baseId}-maps-${Date.now()}`,
            name: `${rewardOption.name} (maps)`,
            description: 'Use to apply Loot Surge (map charges)',
            kind: 'reward',
            payload: { rewardId: `${baseId}-maps` },
            usesLeft: 1
          }
          dispatch({ type: 'ADD_USABLE', usable: cyclesUsable } as any)
          dispatch({ type: 'ADD_USABLE', usable: mapsUsable } as any)
        }
      }
    })

    alert(`Rewards claimed! Gained ${finalXP} XP. Reward items have been added to Usables (Inventory).`)
    dispatch({ type: 'END_MAP_SESSION' })
    onClose()
  }

  const canClaim = Object.keys(rewardTiers).every(category => rewardTiers[category].length === 0 || selectedRewards[category])

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100 }}>
      <div style={{ background:'var(--card-bg)', border:'2px solid var(--accent)', borderRadius:12, padding:24, width:'min(700px, 96%)' }}>
        <h2 style={{ marginTop:0, color:'var(--accent)', textAlign:'center' }}>Claim Your Rewards</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:12 }}>
          {Object.entries(rewardTiers).map(([category, rewards]) => (
            <div key={category} style={{ border:'1px solid var(--border)', borderRadius:8, padding:12 }}>
              <div style={{ fontWeight:700, marginBottom:8 }}>{category}</div>
              <div style={{ display:'grid', gap:8 }}>
                {rewards.length === 0 ? (
                  <div style={{ opacity:0.6, fontSize:12 }}>No rewards in this tier</div>
                ) : rewards.map(reward => (
                  <button key={reward.id} onClick={()=>selectReward(category, reward.id)}
                    style={{ border:'1px solid var(--border)', background:selectedRewards[category]===reward.id?'var(--accent-bg)':'var(--bg)', color:'var(--fg)', borderRadius:6, padding:'8px 10px', textAlign:'left' }}>
                    <div style={{ fontWeight:600 }}>{reward.name}</div>
                    <div style={{ fontSize:12, opacity:0.8 }}>{reward.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:16 }}>
          <button onClick={claimRewards} disabled={!canClaim}
            style={{ width:'100%', padding:'12px 16px', background: canClaim?'var(--accent)':'var(--bg)', color: canClaim?'var(--accent-fg)':'var(--fg-muted)', border:'1px solid var(--border)', borderRadius:6, fontWeight:700 }}>
            Claim Selected Rewards
          </button>
        </div>
      </div>
    </div>
  )
}
export default function MapCraftView() {
  const { state, dispatch } = useGameState()
  const lastIntentRef = React.useRef(state.ui?.mapIntent ?? null)
  const runCountersRef = React.useRef<Record<string, { correct: number; attempted: number }>>({})
  const topicCursorRef = React.useRef(0)
  const [hudTick, setHudTick] = React.useState(0) // force re-render of HUD when counters change
  const [selectedGems, setSelectedGems] = React.useState<Set<string>>(new Set())
  const [showScoreInput, setShowScoreInput] = React.useState(false)
  const [showRewardSelection, setShowRewardSelection] = React.useState(false)
  const [sessionScore, setSessionScore] = React.useState({ correct: 0, total: 0, timeSpent: 0 })
  const [showPreStudyPrompt, setShowPreStudyPrompt] = React.useState(false)
  const [preStudyAnswers, setPreStudyAnswers] = React.useState({ concepts: '', formulas: '', examples: '' })

  // Get current map session state from context
  const mapSession = state.mapSession
  const isRunning = mapSession?.isRunning || false
  const progress = mapSession?.progress || 0
  const craftedMap = mapSession?.craftedMap || null
  const studyTimeMinutes = mapSession?.studyTimeMinutes || 0

  const mapIntent = state.ui?.mapIntent
  const allGems = (state.gems || [])
  // Allow crafting with fresh Level 1 gems (no XP required)
  const gems = allGems
  const currency = state.currency || {}
  const craftingCost = BASE_CRAFT_COST

  // Restore running map session (only once per session start)
  React.useEffect(() => {
    if (!mapSession || !mapSession.isRunning) return
    const startTime = new Date(mapSession.startedAt).getTime()
    const totalFreezeMs = mapSession.studyTimeMinutes * 60 * 1000

    let rafId = 0
    const tick = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progressPercent = Math.min((elapsed / totalFreezeMs) * 100, 100)
      dispatch({ type: 'UPDATE_MAP_PROGRESS', progress: progressPercent })
      if (progressPercent < 100) {
        rafId = requestAnimationFrame(tick)
      }
      // Don't call setShowScoreInput here - let the second effect handle it
    }
    tick()
    return () => { if (rafId) cancelAnimationFrame(rafId) }
  }, [mapSession?.startedAt, mapSession?.studyTimeMinutes, mapSession?.isRunning, dispatch])

  // Show score input when session completes (only once)
  React.useEffect(() => {
    if (mapSession && !mapSession.isRunning && (mapSession.progress || 0) >= 100 && !showScoreInput && !showRewardSelection) {
      // Add small delay to ensure state is stable
      const timer = setTimeout(() => setShowScoreInput(true), 100)
      return () => clearTimeout(timer)
    }
  }, [mapSession?.isRunning, mapSession?.progress, showScoreInput, showRewardSelection])

  // Calculate study time based on questions and affixes
  const calculateStudyTime = (map: CraftedMap): number => {
    let baseMinutesPerQuestion = 3 // 3 minutes per question by default
    let totalQuestions = map.questionCount

    // Apply affix modifiers
    map.affixes.forEach(affix => {
      switch (affix) {
        case 'time_crunch':
          baseMinutesPerQuestion *= 0.7 // 30% less time
          break
        case 'auto_skip':
          baseMinutesPerQuestion = Math.min(baseMinutesPerQuestion, 2) // Max 2 minutes per question
          break
        case 'speed_run':
          baseMinutesPerQuestion *= 0.5 // Half time
          break
        case 'quick_fire':
          baseMinutesPerQuestion = Math.min(baseMinutesPerQuestion, 0.75) // 45 seconds max
          break
        case 'timed_pressure':
          baseMinutesPerQuestion *= 0.8 // 20% less time due to pressure
          break
        case 'marathon':
          totalQuestions *= 2 // Double the questions
          break
        case 'precision':
          baseMinutesPerQuestion *= 1.2 // 20% more time for accuracy
          break
      }
    })

    return Math.max(1, Math.round(totalQuestions * baseMinutesPerQuestion))
  }

  const toggleGem = (gemId: string) => {
    const newSelected = new Set(selectedGems)
    if (newSelected.has(gemId)) {
      newSelected.delete(gemId)
    } else {
      newSelected.add(gemId)
    }
    setSelectedGems(newSelected)
  }

  const craftMap = () => {
    const pickedGems = gems.filter(g => selectedGems.has(g.id))
    if (pickedGems.length === 0) return

    // Check if we have enough currency to craft
    const currency = state.currency || {}

    for (const [currencyType, amount] of Object.entries(craftingCost)) {
      if ((currency[currencyType] || 0) < amount) {
        alert(`Not enough ${currencyType}! Need ${amount}, have ${currency[currencyType] || 0}`)
        return
      }
    }

    // Consume currency
    for (const [currencyType, amount] of Object.entries(craftingCost)) {
      dispatch({ type: 'CONSUME_CURRENCY', currency: currencyType, count: amount })
    }

    // Convert SubjectGem to GemTopic format for map crafting
    const gemTopics: GemTopic[] = pickedGems.map(gem => ({
      id: gem.id,
      name: gem.name,
      tier: gem.tier || 1,
      weight: gem.weight || 1,
      cycles: gem.cycles || 1,
      tags: gem.tags || [],
      level: gem.level || 1
    }))

    const map = craftMapFromGems(gemTopics)

    // Prepare a ready (not running) map session; user starts it explicitly
    const studyMinutes = calculateStudyTime(map)
    const session = {
      craftedMap: map,
      studyTimeMinutes: studyMinutes,
      startedAt: undefined as any,
      isRunning: false,
      progress: 0
    }
    dispatch({ type: 'START_MAP_SESSION', mapSession: session as any })
  }

  const craftFromIntent = (mapIntent: any) => {
    lastIntentRef.current = mapIntent
    const byTopic = mapIntent.topic
      ? allGems.filter(g => g.name.toLowerCase() === String(mapIntent.topic).toLowerCase())
      : []
    const bySubject = mapIntent.subject
      ? allGems.filter(g => (g.tags || []).some(t => t.toLowerCase() === mapIntent.subject!.toLowerCase()))
      : []
    const byCategory = mapIntent.category
      ? allGems.filter(g => g.category === mapIntent.category)
      : []
    let chosen = byTopic.length > 0 ? byTopic : (bySubject.length > 0 ? bySubject : byCategory)
    chosen = chosen.slice(0, 4)
    if (chosen.length === 0) return false
    setSelectedGems(new Set<string>(chosen.map(g => g.id)))
    const gemTopics: GemTopic[] = chosen.map(gem => ({ id: gem.id, name: gem.name, tier: gem.tier || 1, weight: gem.weight || 1, cycles: gem.cycles || 1, tags: gem.tags || [], level: gem.level || 1 }))
    const map = craftMapFromGems(gemTopics)
    if (mapIntent.mapAffixes && mapIntent.mapAffixes.length > 0) {
      map.affixes = Array.from(new Set([...(map.affixes || []), ...mapIntent.mapAffixes]))
    }
    // Ensure crafting cost is covered (same as manual craft)
    const currency = state.currency || {}
    for (const [currencyType, amount] of Object.entries(BASE_CRAFT_COST)) {
      if ((currency as any)[currencyType] === undefined || (currency as any)[currencyType] < (amount as any)) {
        alert(`Not enough ${currencyType}! Need ${amount}, have ${(currency as any)[currencyType] || 0}`)
        return false
      }
    }
    // Consume currency
    for (const [currencyType, amount] of Object.entries(BASE_CRAFT_COST)) {
      dispatch({ type: 'CONSUME_CURRENCY', currency: currencyType, count: amount as number })
    }
    const studyMinutes = calculateStudyTime(map)
    const session = { craftedMap: map, studyTimeMinutes: studyMinutes, startedAt: undefined as any, isRunning: false, progress: 0 }
    dispatch({ type: 'START_MAP_SESSION', mapSession: session as any })
    return true
  }

  // Auto-preselect gems and craft map based on intent (one-shot)
  React.useEffect(() => {
    const mapIntent = state.ui?.mapIntent
    if (!mapIntent || craftedMap || isRunning) return
    const ok = craftFromIntent(mapIntent)
    if (ok) dispatch({ type: 'CLEAR_MAP_INTENT' })
  }, [state.ui?.mapIntent, craftedMap, isRunning])

  // Initialize in-run counters and keyboard handlers
  React.useEffect(() => {
    if (!isRunning || !craftedMap?.lineup?.length) return
    // init counters
    const counters: Record<string, { correct: number; attempted: number }> = {}
    craftedMap.lineup.forEach((l:any)=>{ counters[l.gemId] = { correct:0, attempted:0 }})
    runCountersRef.current = counters
    topicCursorRef.current = 0

    const advanceCursor = () => {
      const lineup = craftedMap.lineup
      let cur = topicCursorRef.current
      // if current filled, move to next with remaining
      for (let i=0;i<lineup.length;i++){
        const idx = (cur + i) % lineup.length
        const l = lineup[idx]
        const c = runCountersRef.current[l.gemId]
        if ((c.attempted || 0) < (l.allocated || 0)) { topicCursorRef.current = idx; return }
      }
    }

    const log = (isCorrect: boolean) => {
      const lineup = craftedMap.lineup
      const curIdx = topicCursorRef.current
      const l = lineup[curIdx]
      const c = runCountersRef.current[l.gemId]
      if (c.attempted >= (l.allocated || 0)) { advanceCursor(); return }
      c.attempted += 1
      if (isCorrect) c.correct += 1
      // auto-advance if this topic is filled
      if (c.attempted >= (l.allocated || 0)) {
        topicCursorRef.current = (curIdx + 1) % lineup.length
        advanceCursor()
      }
      setHudTick(t => t + 1)
    }

    const undo = () => {
      const lineup = craftedMap.lineup
      // go backwards to last with attempted>0
      for (let i=0;i<lineup.length;i++){
        const idx = (topicCursorRef.current - i + lineup.length) % lineup.length
        const l = lineup[idx]
        const c = runCountersRef.current[l.gemId]
        if (c.attempted > 0){
          // assume last was unknown correctness; decrement attempted and correct if needed heuristically
          if (c.correct > 0) c.correct -= 1
          c.attempted -= 1
          topicCursorRef.current = idx
          setHudTick(t => t + 1)
          break
        }
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return
      if (!isRunning) return
      const key = (e.key || '').toLowerCase()
      const code = (e.code || '').toLowerCase()
      const isSpace = key === ' ' || key === 'space' || key === 'spacebar' || code === 'space'
      if (isSpace) { e.preventDefault(); log(true); return }
      if (key === 'x') { e.preventDefault(); log(false); return }
      if (key === 'z') { e.preventDefault(); undo(); return }
      if (key === 'tab') { e.preventDefault(); topicCursorRef.current = (topicCursorRef.current + 1) % craftedMap.lineup.length; setHudTick(t=>t+1); return }
      // bump HUD to reflect latest counters
      setHudTick(t => t + 1)
    }
    document.addEventListener('keydown', onKey, { capture: true })
    return () => { document.removeEventListener('keydown', onKey, { capture: true } as any) }
  }, [isRunning, craftedMap?.lineup])

  // Freeze screen (scroll + interactions) while map is running
  React.useEffect(() => {
    if (!isRunning) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [isRunning])

  // Auto-preselect gems and craft map based on intent
  React.useEffect(() => {
    if (!mapIntent || craftedMap || isRunning) return
    // Preselect matching gems by topic/subject/category
    const byTopic = mapIntent.topic
      ? allGems.filter(g => g.name.toLowerCase() === String(mapIntent.topic).toLowerCase())
      : []
    const bySubject = mapIntent.subject
      ? allGems.filter(g => (g.tags || []).some(t => t.toLowerCase() === mapIntent.subject!.toLowerCase()))
      : []
    const byCategory = mapIntent.category
      ? allGems.filter(g => g.category === mapIntent.category)
      : []
    let chosen = byTopic.length > 0 ? byTopic : (bySubject.length > 0 ? bySubject : byCategory)
    // Limit to 4 to keep map manageable
    chosen = chosen.slice(0, 4)
    if (chosen.length === 0) return
    const newSel = new Set<string>(chosen.map(g => g.id))
    setSelectedGems(newSel)
    // Auto-craft immediately
    const pickedGems = chosen
    const gemTopics: GemTopic[] = pickedGems.map(gem => ({
      id: gem.id,
      name: gem.name,
      tier: gem.tier || 1,
      weight: gem.weight || 1,
      cycles: gem.cycles || 1,
      tags: gem.tags || [],
      level: gem.level || 1
    }))
    const map = craftMapFromGems(gemTopics)
    // Apply suggested affixes if provided
    if (mapIntent.mapAffixes && mapIntent.mapAffixes.length > 0) {
      map.affixes = Array.from(new Set([...(map.affixes || []), ...mapIntent.mapAffixes]))
    }
    const studyMinutes = calculateStudyTime(map)
    const session = {
      craftedMap: map,
      studyTimeMinutes: studyMinutes,
      startedAt: undefined as any,
      isRunning: false,
      progress: 0
    }
    dispatch({ type: 'START_MAP_SESSION', mapSession: session as any })
    // Clear intent so it doesn't recraft
    dispatch({ type: 'CLEAR_MAP_INTENT' })
  }, [mapIntent, craftedMap, isRunning])

  const startMapSession = (map: CraftedMap) => {
    // Show pre-study prompts first
    setShowPreStudyPrompt(true)
  }

  const proceedWithMapSession = (map: CraftedMap) => {
    const studyMinutes = calculateStudyTime(map)

    // Create map session and start it (progress updates handled by the effect below)
    const mapSession = {
      craftedMap: map,
      studyTimeMinutes: studyMinutes,
      startedAt: new Date().toISOString(),
      isRunning: true,
      progress: 0
    }

    setShowPreStudyPrompt(false)
    dispatch({ type: 'START_MAP_SESSION', mapSession })
  }

  const ScoreInputPage = () => {
    const [score, setScore] = React.useState('')
    const [timeSpent, setTimeSpent] = React.useState(studyTimeMinutes.toString())
    const [notes, setNotes] = React.useState('')
    const [confidence, setConfidence] = React.useState(3) // 1-5 scale
    const [difficulty, setDifficulty] = React.useState(3) // 1-5 scale
    const [topicCorrect, setTopicCorrect] = React.useState<Record<string, number>>({})
    // Prefill per-topic results from in-run counters if available
    React.useEffect(() => {
      try {
        const counters = runCountersRef.current || {}
        if (craftedMap?.lineup && Object.keys(counters).length > 0) {
          const pre: Record<string, number> = {}
          craftedMap.lineup.forEach((l:any)=>{ pre[l.gemId] = Math.min(l.allocated||0, counters[l.gemId]?.correct || 0) })
          setTopicCorrect(pre)
          // Also prefill total score if empty
          const total = Object.values(pre).reduce((s,v)=>s+v,0)
          if (!score) setScore(String(total))
        }
      } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const [recallQuality, setRecallQuality] = React.useState(3) // 1-5 scale

    // Prevent auto-scroll issues
    React.useEffect(() => {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }, [])

    const submitScore = () => {
      // Prefer per-topic inputs when provided; fallback to total score
      let perTopic: Array<{ gemId: string; name: string; allocated: number; correct: number }> = []
      if (craftedMap?.lineup?.length) {
        perTopic = craftedMap.lineup.map(l => ({
          gemId: l.gemId,
          name: l.name,
          allocated: l.allocated || 0,
          correct: Math.max(0, Math.min(l.allocated || 0, Number.isFinite(topicCorrect[l.gemId] as any) ? (topicCorrect[l.gemId] || 0) : 0))
        }))
      }
      const sumPer = perTopic.reduce((s, r) => s + (r.correct || 0), 0)
      const correctAnswers = sumPer > 0 ? sumPer : (parseInt(score) || 0)
      const actualTimeSpent = parseInt(timeSpent) || studyTimeMinutes

      // Calculate XP and rewards based on performance
      const accuracy = correctAnswers / (craftedMap?.questionCount || 1)
      const timeBonus = actualTimeSpent <= studyTimeMinutes ? 1.2 : 1.0

      // Self-assessment bonuses for metacognitive awareness
      const confidenceBonus = confidence >= 4 && accuracy >= 0.8 ? 1.15 : 1.0 // High confidence + high performance
      const difficultyBonus = difficulty >= 4 ? 1.1 : 1.0 // Tackling hard material
      const recallBonus = recallQuality >= 4 ? 1.1 : 1.0 // Good memory consolidation

      const baseXP = 10 * correctAnswers
      const finalXP = Math.round(baseXP * timeBonus * confidenceBonus * difficultyBonus * recallBonus)

      // Distribute XP across used gems proportionally to allocated questions
      if (craftedMap && craftedMap.lineup && craftedMap.questionCount > 0) {
        const total = craftedMap.questionCount
        craftedMap.lineup.forEach(l => {
          const share = Math.max(0, Math.min(1, (l.allocated || 0) / total))
          const amt = Math.round(finalXP * share)
          if (amt > 0) dispatch({ type: 'GAIN_XP', gemId: l.gemId, amount: amt })
        })
      }

      // MASSIVE MAP CURRENCY REWARDS! 💰
      const difficultyMultiplier = getDifficultyMultiplier(craftedMap?.difficultyTier || 'Bronze')

      // Big currency payouts from maps (main income source!)
      if (accuracy >= 0.5) {
        // Base currency reward based on difficulty tier
        let baseCurrency = 0
        switch (craftedMap?.difficultyTier) {
          case 'Bronze': baseCurrency = 75; break
          case 'Silver': baseCurrency = 100; break
          case 'Gold': baseCurrency = 150; break
          case 'Platinum': baseCurrency = 225; break
          case 'Diamond': baseCurrency = 350; break
          default: baseCurrency = 75
        }

        // Performance bonuses
        let performanceMultiplier = 1.0
        if (accuracy >= 0.9) performanceMultiplier = 3.0      // Perfect/near-perfect: 3x
        else if (accuracy >= 0.85) performanceMultiplier = 2.5 // Excellent: 2.5x
        else if (accuracy >= 0.7) performanceMultiplier = 2.0  // Good: 2x
        else if (accuracy >= 0.6) performanceMultiplier = 1.5  // Decent: 1.5x

        // Time bonus
        const timeBonus = actualTimeSpent <= studyTimeMinutes ? 1.25 : 1.0

        // Calculate final currency reward
        const finalCurrency = Math.round(baseCurrency * performanceMultiplier * timeBonus)

        // Give the BIG PAYOUT as Transmute orbs (main currency)
        dispatch({
          type: 'EARN_CURRENCY',
          currency: 'Transmute',
          count: finalCurrency,
          source: 'loot',
          description: `Map completion bonus (${(accuracy * 100).toFixed(1)}% accuracy)`
        })

        // Additional smaller orb drops
        const bonusDrops = Math.floor(accuracy * 3) + 1
        for (let i = 0; i < bonusDrops; i++) {
          const currencies = ['Map Fragment', 'Cartographer\'s Chisel', 'Alchemy', 'Chaos', 'Regal']
          const randomCurrency = currencies[Math.floor(Math.random() * currencies.length)]
          dispatch({
            type: 'EARN_CURRENCY',
            currency: randomCurrency,
            count: 1,
            source: 'loot',
            description: 'Map bonus drop'
          })
        }
      }

      // Equipment drops for high difficulty and performance
      if (accuracy >= 0.7 && (craftedMap?.difficultyTier === 'Gold' || craftedMap?.difficultyTier === 'Platinum' || craftedMap?.difficultyTier === 'Diamond')) {
        const itemLevel = Math.floor((correctAnswers / (craftedMap?.questionCount || 1)) * 10) + Math.floor(difficultyMultiplier * 3)
        const item = generateRandomItem(Date.now() + Math.random() * 1000, itemLevel, difficultyMultiplier - 1)
        dispatch({ type: 'ADD_TO_INVENTORY', item })
      }

      // Knowledge consolidation bonus for completing maps with good performance
      if (accuracy >= 0.7) {
        // Award bonus XP to all gems proportional to accuracy for consolidation
        const consolidationBonus = Math.round(finalXP * 0.3 * accuracy) // Up to 30% bonus
        if (craftedMap && craftedMap.lineup) {
          craftedMap.lineup.forEach(l => {
            dispatch({
              type: 'GAIN_XP',
              gemId: l.gemId,
              amount: Math.round(consolidationBonus / craftedMap.lineup.length)
            })
          })
        }
      }

      // Store session data for reward selection (including pre-study answers for reflection)
      setSessionScore({
        correct: correctAnswers,
        total: craftedMap?.questionCount || 1,
        timeSpent: actualTimeSpent
      })

      // Move to reward selection
      setShowScoreInput(false)
      setShowRewardSelection(true)

      // Update Roadmap tasks progress/completion and SRS per topic
      try {
        const intent: any = lastIntentRef.current
        const tasks: any[] = state.tasks || []
        // Per-topic SRS: compute per-topic quality based on per-topic accuracy (fallback to overall)
        const lineup = craftedMap?.lineup || []
        for (const l of lineup) {
          const alloc = l.allocated || 0
          const corr = (perTopic.find(r => r.gemId === l.gemId)?.correct || 0)
          const acc = alloc > 0 ? (corr / alloc) : 0
          let q: 0|1|2|3|4|5 = 0
          if (acc >= 0.9) q = 5
          else if (acc >= 0.8) q = 4
          else if (acc >= 0.7) q = 3
          else if (acc >= 0.6) q = 2
          else if (acc >= 0.4) q = 1
          else q = 0
          // Confidence/difficulty adjust
          const conf = typeof confidence === 'number' ? confidence : 3
          const diffi = typeof difficulty === 'number' ? difficulty : 3
          if (conf >= 4 && q < 5) q = (q + 1) as any
          if (diffi >= 4 && q > 0) q = (q - 1) as any
          dispatch({ type: 'SRS_REVIEW', gemId: l.gemId, quality: q })
        }
        // Update tasks: intent-bound
        if (intent?.taskId) {
          const t = tasks.find(x => x.id === intent.taskId)
          const totalQ = craftedMap?.questionCount || 1
          const accuracy = correctAnswers / totalQ
          if (t) {
            if (t.kind === 'map_objective') {
              const targetPct = t.targetPercent ?? 75
              if (accuracy * 100 >= targetPct) dispatch({ type: 'COMPLETE_TASK', id: t.id })
            } else if (t.kind === 'topic_accuracy' || t.kind === 'topic_coverage') {
              const targetPct = t.targetPercent
              if (!targetPct || (accuracy * 100) >= targetPct) {
                dispatch({ type: 'ADD_TASK_PROGRESS', id: t.id, amount: correctAnswers })
              }
            }
          }
        }

        // Update tasks: per-topic matching
        for (const r of perTopic) {
          const accPct = r.allocated > 0 ? (r.correct / r.allocated) * 100 : 0
          const candidates = tasks.filter(x => x.status === 'active' && (x.kind === 'topic_accuracy' || x.kind === 'topic_coverage') && String((x as any).topic || '').toLowerCase() === r.name.toLowerCase())
          for (const t of candidates) {
            const targetPct = t.targetPercent
            if (!targetPct || accPct >= targetPct) {
              dispatch({ type: 'ADD_TASK_PROGRESS', id: t.id, amount: r.correct })
            }
          }
        }
      } catch {}

      // Log map result for analytics
      try {
        const lineup = (craftedMap?.lineup || []).map((l:any) => ({ gemId: l.gemId, name: l.name, allocated: l.allocated }))
        const endedAtISO = new Date().toISOString()
        const result = {
          endedAtISO,
          questionCount: craftedMap?.questionCount || correctAnswers,
          correctAnswers,
          accuracy: (craftedMap?.questionCount || 0) > 0 ? correctAnswers / (craftedMap?.questionCount || 1) : 0,
          timeSpentMinutes: actualTimeSpent,
          difficultyTier: craftedMap?.difficultyTier || 'Bronze',
          affixes: craftedMap?.affixes || [],
          lineup
        }
        dispatch({ type: 'ADD_MAP_RESULT', result } as any)
      } catch {}
    }

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid var(--accent)',
          borderRadius: 12,
          padding: 32,
          minWidth: 400,
          maxWidth: 600
        }}>
          <h2 style={{ marginBottom: 24, textAlign: 'center', color: 'var(--accent)' }}>
            Study Session Complete!
          </h2>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>
              <strong>Map Details:</strong><br/>
              Questions: {craftedMap?.questionCount}<br/>
              Planned Time: {studyTimeMinutes} minutes<br/>
              Affixes: {craftedMap?.affixes.map(getAffixDisplayName).join(', ') || 'none'}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
              How many questions did you get correct?
            </label>
            <input
              type="number"
              min="0"
              max={craftedMap?.questionCount || 10}
              value={score}
              onChange={e => setScore(e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: 12,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--fg)',
                fontSize: 16
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
              Actual time spent (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={timeSpent}
              onChange={e => setTimeSpent(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--fg)',
                fontSize: 16
              }}
            />
          </div>

          {/* Self-Assessment Section */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16
          }}>
            <h4 style={{ marginBottom: 16, color: 'var(--accent)' }}>📊 Self-Assessment</h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                  Confidence (1-5)
                </label>
                <select
                  value={confidence}
                  onChange={e => setConfidence(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: 8,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--fg)'
                  }}
                >
                  <option value={1}>1 - Very unsure</option>
                  <option value={2}>2 - Unsure</option>
                  <option value={3}>3 - Neutral</option>
                  <option value={4}>4 - Confident</option>
                  <option value={5}>5 - Very confident</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                  Difficulty (1-5)
                </label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: 8,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--fg)'
                  }}
                >
                  <option value={1}>1 - Very easy</option>
                  <option value={2}>2 - Easy</option>
                  <option value={3}>3 - Moderate</option>
                  <option value={4}>4 - Hard</option>
                  <option value={5}>5 - Very hard</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                  Recall Quality (1-5)
                </label>
                <select
                  value={recallQuality}
                  onChange={e => setRecallQuality(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: 8,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--fg)'
                  }}
                >
                  <option value={1}>1 - Poor recall</option>
                  <option value={2}>2 - Weak recall</option>
                  <option value={3}>3 - Average recall</option>
                  <option value={4}>4 - Good recall</option>
                  <option value={5}>5 - Excellent recall</option>
                </select>
              </div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.7, fontStyle: 'italic' }}>
              💡 Self-assessment bonuses: High confidence + performance, tackling hard material, and good recall quality provide XP bonuses!
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How did it go? Any insights?"
              style={{
                width: '100%',
                height: 80,
                padding: 12,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--fg)',
                fontSize: 14,
                resize: 'vertical'
              }}
            />
          </div>

          {/* Per-topic results (optional, improves SRS and task accuracy) */}
          {craftedMap?.lineup?.length ? (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: 8 }}>Per-topic Results (optional)</h4>
              <div style={{ display:'grid', gap:8 }}>
                {craftedMap!.lineup.map((l:any) => (
                  <div key={l.gemId} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ minWidth: 180 }}>{l.name} <span style={{ opacity:0.6, fontSize:12 }}>({l.allocated}q)</span></div>
                    <input type="number" min={0} max={l.allocated||0} value={Number(topicCorrect[l.gemId]||0)}
                      onChange={e=> setTopicCorrect(prev=> ({ ...prev, [l.gemId]: Math.max(0, Math.min(l.allocated||0, parseInt(e.target.value)||0)) }))}
                      style={{ width:80, background:'var(--bg)', color:'var(--fg)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 8px' }} />
                    <span style={{ opacity:0.7, fontSize:12 }}>correct</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <button
            onClick={submitScore}
            disabled={!score}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: score ? 'var(--accent)' : 'var(--bg)',
              color: score ? 'var(--accent-fg)' : 'var(--fg-muted)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              cursor: score ? 'pointer' : 'not-allowed',
              fontSize: 16,
              fontWeight: 600
            }}
          >
            Submit Results
          </button>
        </div>
      </div>
    )
  }

  const RewardSelectionPage = () => {
    const [selectedRewards, setSelectedRewards] = React.useState<Record<string, string>>({})
    const accuracy = sessionScore.correct / sessionScore.total
    const rewardTiers = getRewardsByCategory(accuracy)

    const selectReward = (category: string, rewardId: string) => {
      setSelectedRewards(prev => ({ ...prev, [category]: rewardId }))
    }

    const claimRewards = () => {
      const correctAnswers = sessionScore.correct
      const actualTimeSpent = sessionScore.timeSpent
      const timeBonus = actualTimeSpent <= studyTimeMinutes ? 1.2 : 1.0
      const difficultyMultiplier = getDifficultyMultiplier(craftedMap?.difficultyTier || 'Bronze')
      const baseXP = 10 * correctAnswers
      const finalXP = Math.round(baseXP * timeBonus * difficultyMultiplier)

      // Award XP to used gems
      const usedGemIds = craftedMap?.lineup.map(l => l.gemId) || []
      usedGemIds.forEach(gemId => {
        dispatch({ type: 'GAIN_XP', gemId, amount: finalXP })
      })

      // Process each selected reward
      Object.entries(selectedRewards).forEach(([_category, rewardId]) => {
        const rewardOption = Object.values(rewardTiers).flat().find(r => r.id === rewardId)
        if (!rewardOption) return

        if (rewardOption.type === 'equipment') {
          // Generate random equipment based on gem levels
          const avgGemLevel = (craftedMap?.lineup.reduce((sum, l) => {
            const gem = state.gems.find(g => g.id === l.gemId)
            return sum + (gem?.level || 1)
          }, 0) || 1) / (craftedMap?.lineup.length || 1)

          const seed = Date.now() + Math.floor(Math.random() * 1_000_000)
          const itemLevel = Math.max(1, Math.floor(avgGemLevel))
          const item = generateRandomItem(seed, itemLevel, 0)
          dispatch({ type: 'ADD_TO_INVENTORY', item })
        } else if (rewardOption.type === 'buff' && rewardOption.durationMinutes) {
          // Map buff ids to active reward types and choose charge mode
          if (rewardOption.id.includes('focus')) {
            const activeReward: ActiveReward = {
              id: `${rewardOption.id}-${Date.now()}`,
              name: rewardOption.name,
              startedAt: new Date().toISOString(),
              durationMinutes: rewardOption.durationMinutes,
              type: 'focus_freeze',
              mode: 'time'
            }
            dispatch({ type: 'ACTIVATE_REWARD', reward: activeReward })
          } else {
            // Loot surge: use cycle-based charges instead of time
            const charges = rewardOption.durationMinutes >= 30 ? 4 : 2
            const activeReward: ActiveReward = {
              id: `${rewardOption.id}-${Date.now()}`,
              name: rewardOption.name,
              startedAt: new Date().toISOString(),
              durationMinutes: 0,
              type: 'triple_loot',
              mode: 'cycles',
              remainingCycles: charges
            }
            dispatch({ type: 'ACTIVATE_REWARD', reward: activeReward })
          }
        }
      })

      alert(`Rewards claimed! Gained ${finalXP} XP and your selected rewards are now active!`)

      // End map session and reset
      dispatch({ type: 'END_MAP_SESSION' })
      setShowRewardSelection(false)
      setSelectedGems(new Set())
      setSelectedRewards({})
      setSessionScore({ correct: 0, total: 0, timeSpent: 0 })
    }

    const canClaim = Object.keys(rewardTiers).every(category =>
      rewardTiers[category].length === 0 || selectedRewards[category]
    )

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        overflow: 'auto'
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid var(--accent)',
          borderRadius: 12,
          padding: 32,
          minWidth: 600,
          maxWidth: 900,
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <h2 style={{ marginBottom: 24, textAlign: 'center', color: 'var(--accent)' }}>
            🎉 Choose Your Rewards! 🎉
          </h2>

          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>
              <strong>Performance:</strong> {sessionScore.correct}/{sessionScore.total} ({(accuracy * 100).toFixed(1)}%)
            </div>
            <div style={{
              fontSize: 14,
              marginBottom: 8,
              padding: '8px 16px',
              background: getDifficultyColor(craftedMap?.difficultyTier || 'Bronze'),
              color: 'black',
              borderRadius: 6,
              fontWeight: 600,
              display: 'inline-block'
            }}>
              {craftedMap?.difficultyTier || 'Bronze'} Difficulty ({getDifficultyMultiplier(craftedMap?.difficultyTier || 'Bronze')}Ã— rewards)
            </div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              Time: {sessionScore.timeSpent}min | XP Earned: {Math.round(10 * sessionScore.correct * (sessionScore.timeSpent <= studyTimeMinutes ? 1.2 : 1.0) * getDifficultyMultiplier(craftedMap?.difficultyTier || 'Bronze'))}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
              🎁 Automatic rewards already granted: Currency orbs{accuracy >= 0.7 && (craftedMap?.difficultyTier === 'Gold' || craftedMap?.difficultyTier === 'Platinum' || craftedMap?.difficultyTier === 'Diamond') ? ' + Equipment' : ''}
            </div>
          </div>

          {Object.entries(rewardTiers).map(([category, rewards]) => {
            if (rewards.length === 0) return null

            return (
              <div key={category} style={{
                marginBottom: 24,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 16
              }}>
                <h3 style={{
                  marginBottom: 16,
                  color: category === 'base' ? 'var(--fg)' :
                        category === '50%' ? '#4CAF50' :
                        category === '70%' ? '#FF9800' : '#9C27B0'
                }}>
                  {category === 'base' ? 'Base Rewards' :
                   category === '50%' ? '50%+ Performance' :
                   category === '70%' ? '70%+ Performance' : '85%+ Performance'}
                  <span style={{ fontSize: 14, opacity: 0.7 }}> (choose one)</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                  {rewards.map(reward => (
                    <div
                      key={reward.id}
                      onClick={() => selectReward(category, reward.id)}
                      style={{
                        background: selectedRewards[category] === reward.id ? 'var(--accent-bg)' : 'var(--card-bg)',
                        border: `2px solid ${selectedRewards[category] === reward.id ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 6,
                        padding: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {reward.name}
                        {reward.durationMinutes && (
                          <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 8 }}>
                            ({reward.durationMinutes}min)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
                        {reward.description}
                      </div>
                      {reward.durationMinutes && (
                        <div style={{ fontSize: 11, marginTop: 4, color: 'var(--accent)', fontStyle: 'italic' }}>
                          â±ï¸ Freezes focus depletion while active
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <button
            onClick={claimRewards}
            disabled={!canClaim}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: canClaim ? 'var(--accent)' : 'var(--bg)',
              color: canClaim ? 'var(--accent-fg)' : 'var(--fg-muted)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              cursor: canClaim ? 'pointer' : 'not-allowed',
              fontSize: 16,
              fontWeight: 600,
              marginTop: 16
            }}
          >
            Claim Selected Rewards
          </button>
        </div>
      </div>
    )
  }

  const PreStudyPromptPage = React.memo(() => {
    const [answers, setAnswers] = React.useState({ concepts: '', formulas: '', examples: '' })

    const usedGems = React.useMemo(() =>
      craftedMap?.lineup.map(l => {
        const gem = state.gems.find(g => g.id === l.gemId)
        return gem ? { ...gem, allocation: l.allocated } : null
      }).filter(Boolean) || []
    , [craftedMap])

    const handleProceed = React.useCallback(() => {
      if (!craftedMap) return
      setPreStudyAnswers(answers)
      proceedWithMapSession(craftedMap)
    }, [craftedMap, answers])

    const handleSkip = React.useCallback(() => {
      setShowPreStudyPrompt(false)
      if (craftedMap) proceedWithMapSession(craftedMap)
    }, [craftedMap])

    React.useEffect(() => {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }, [])

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid var(--accent)',
          borderRadius: 12,
          padding: 32,
          minWidth: 600,
          maxWidth: 800,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <h2 style={{ marginBottom: 24, textAlign: 'center', color: 'var(--accent)' }}>
        🧠 Active Recall Check
          </h2>

          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              Before you start, test your memory! This improves retention and identifies knowledge gaps.
            </div>
          </div>

          

          <div style={{ marginBottom: 20 }}>
        📚 Topics in this map:
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {usedGems.map(gem => (
                <div key={gem?.id} style={{
                  background: 'var(--accent-bg)',
                  color: 'var(--accent)',
                  padding: '4px 12px',
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  {gem?.name} ({gem?.allocation || 0}q)
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
          📝 Key concepts you remember (without looking):
            </label>
            <textarea
              value={answers.concepts}
              onChange={e => setAnswers(prev => ({ ...prev, concepts: e.target.value }))}
              placeholder="List the main concepts, definitions, or ideas you recall from these topics..."
              style={{
                width: '100%',
                height: 80,
                padding: 12,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--fg)',
                fontSize: 14,
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
          🧮 Formulas or methods you recall:
            </label>
            <textarea
              value={answers.formulas}
              onChange={e => setAnswers(prev => ({ ...prev, formulas: e.target.value }))}
              placeholder="Write down any formulas, equations, or step-by-step methods you remember..."
              style={{
                width: '100%',
                height: 80,
                padding: 12,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--fg)',
                fontSize: 14,
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
          💡 Examples or applications you can think of:
            </label>
            <textarea
              value={answers.examples}
              onChange={e => setAnswers(prev => ({ ...prev, examples: e.target.value }))}
              placeholder="Can you think of specific examples, use cases, or practice problems?"
              style={{
                width: '100%',
                height: 80,
                padding: 12,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--fg)',
                fontSize: 14,
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: 12,
            marginBottom: 20,
            fontSize: 13,
            opacity: 0.8
          }}>
            <strong>Why this helps:</strong> Active recall before studying strengthens memory pathways and helps you identify what you already know vs. what needs more attention. After the session, you can compare your pre-study recall with your performance!
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleSkip}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: 'var(--bg)',
                color: 'var(--fg-muted)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 600
              }}
            >
              Skip & Start
            </button>
            <button
              onClick={handleProceed}
              style={{
                flex: 2,
                padding: '12px 24px',
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 600
              }}
            >
              Done - Start Map Session
            </button>
          </div>
        </div>
      </div>
    )
  })

  // Completely isolated modal component - no context, no external state
  function PreStudyPromptModal({ craftedMap, onProceed, onSkip }: {
    craftedMap: any
    onProceed: (answers: any) => void
    onSkip: () => void
  }) {
    const [answers, setAnswers] = React.useState({ concepts: '', formulas: '', examples: '' })

    const usedGems = craftedMap?.lineup?.map((l: any) => ({
      name: l.gemId || 'Unknown',
      allocation: l.allocated || 0
    })) || []

    React.useEffect(() => {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }, [])

    return (
      <div style={{
        background: 'var(--card-bg)',
        border: '2px solid var(--accent)',
        borderRadius: 12,
        padding: 32,
        minWidth: 600,
        maxWidth: 800,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ marginBottom: 24, textAlign: 'center', color: 'var(--accent)' }}>
        🧠 Active Recall Check
        </h2>

        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.8 }}>
            Before you start, test your memory! This improves retention and identifies knowledge gaps.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
        📚 Topics in this map:
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {usedGems.map((gem: any, i: number) => (
              <div key={i} style={{
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                padding: '4px 12px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 600
              }}>
                Topic {i + 1} ({gem.allocation}q)
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
          📝 Key concepts you remember (without looking):
          </label>
          <textarea
            value={answers.concepts}
            onChange={e => setAnswers(prev => ({ ...prev, concepts: e.target.value }))}
            placeholder="List the main concepts, definitions, or ideas you recall from these topics..."
            style={{
              width: '100%',
              height: 80,
              padding: 12,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--fg)',
              fontSize: 14,
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
          🧮 Formulas or methods you recall:
          </label>
          <textarea
            value={answers.formulas}
            onChange={e => setAnswers(prev => ({ ...prev, formulas: e.target.value }))}
            placeholder="Write down any formulas, equations, or step-by-step methods you remember..."
            style={{
              width: '100%',
              height: 80,
              padding: 12,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--fg)',
              fontSize: 14,
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
          💡 Examples or applications you can think of:
          </label>
          <textarea
            value={answers.examples}
            onChange={e => setAnswers(prev => ({ ...prev, examples: e.target.value }))}
            placeholder="Can you think of specific examples, use cases, or practice problems?"
            style={{
              width: '100%',
              height: 80,
              padding: 12,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--fg)',
              fontSize: 14,
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: 12,
          marginBottom: 20,
          fontSize: 13,
          opacity: 0.8
        }}>
          <strong>Why this helps:</strong> Active recall before studying strengthens memory pathways and helps you identify what you already know vs. what needs more attention!
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onSkip}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: 'var(--bg)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600
            }}
          >
            Skip & Start
          </button>
          <button
            onClick={() => onProceed(answers)}
            style={{
              flex: 2,
              padding: '12px 24px',
              background: 'var(--accent)',
              color: 'var(--accent-fg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600
            }}
          >
            Done - Start Map Session
          </button>
        </div>
      </div>
    )
  }

  if (showPreStudyPrompt) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <PreStudyPromptModalStable
          craftedMap={craftedMap}
          onProceed={(answers) => {
            setPreStudyAnswers(answers)
            setShowPreStudyPrompt(false)
            if (craftedMap) proceedWithMapSession(craftedMap)
          }}
          onSkip={() => {
            setShowPreStudyPrompt(false)
            if (craftedMap) proceedWithMapSession(craftedMap)
          }}
        />
      </div>
    )
  }

  if (showScoreInput) {
    ;(window as any).__sf_runCounters = runCountersRef.current
    return (
      <ScoreInputModalStable
        craftedMap={craftedMap}
        studyTimeMinutes={studyTimeMinutes}
        onNext={(session)=>{ setSessionScore(session); setShowScoreInput(false); setShowRewardSelection(true) }}
      />
    )
  }

  if (showRewardSelection) {
    return (
      <RewardSelectionModalStable
        craftedMap={craftedMap}
        studyTimeMinutes={studyTimeMinutes}
        sessionScore={sessionScore}
        onClose={()=>{ setShowRewardSelection(false); setSelectedGems(new Set()); setSessionScore({ correct:0, total:0, timeSpent:0 }) }}
      />
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Full-screen freeze overlay while running */}
      {isRunning && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', color:'var(--fg)', zIndex: 1200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ width:'min(900px, 96%)', background:'var(--card-bg)', border:'2px solid var(--border)', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <h3 style={{ margin:0 }}>Study Session Running</h3>
              <button onClick={() => dispatch({ type:'UPDATE_MAP_PROGRESS', progress: 100 })} style={{ background:'var(--bg)', color:'var(--fg)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 10px' }}>Finish Now</button>
            </div>
            <div style={{ width:'100%', height:8, background:'var(--bg)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width: `${progress}%`, height:'100%', background:'var(--accent)', transition:'width 0.1s ease' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:13 }}>
              <div>{progress.toFixed(1)}% • Time: {studyTimeMinutes}m</div>
              <div>
                {(() => {
                  try {
                    const counters = runCountersRef.current || {}
                    const attempted = Object.values(counters).reduce((s: number, c: any) => s + (c.attempted || 0), 0)
                    return `Questions: ${attempted} / ${craftedMap?.questionCount || 0}`
                  } catch { return '' }
                })()}
              </div>
            </div>
            <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>Hotkeys: Space=Correct • X=Incorrect • Z=Undo • Tab=Next Topic</div>
            {craftedMap?.lineup?.length ? (
              <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:8 }}>
                {craftedMap.lineup.map((l:any, idx:number) => {
                  const c = runCountersRef.current[l.gemId] || { correct:0, attempted:0 }
                  const remaining = Math.max(0, (l.allocated||0) - c.attempted)
                  const isCur = idx === topicCursorRef.current
                  return (
                    <div key={l.gemId} style={{ border:'1px solid var(--border)', borderRadius:8, padding:8, background: isCur ? 'rgba(34,197,94,0.08)' : 'var(--bg)' }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{l.name} <span style={{ opacity:0.7 }}>({l.allocated}q)</span></div>
                      <div style={{ fontSize:12, opacity:0.8 }}>Correct: {c.correct} • Attempted: {c.attempted} • Left: {remaining}</div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}
      <h2>Map Crafting</h2>

      {/* Affix Guide moved to Settings */}
      {false && (
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16
      }}>
        <h3>Map Affixes Guide</h3>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Affix guide moved to Settings.
        </div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>
          💡 Maps are now fully RNG! Question count and affixes are determined by your gem levels.
        </div>
      </div>
      )}

      {/* Gem Selection */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16
      }}>
        <h3>Select Gems ({selectedGems.size} selected)</h3>
        {gems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            opacity: 0.6,
            fontSize: 14
          }}>
            No topics found. Create or load topics in Gems, or use Roadmap to get a suggested map.
            <br />
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              You can craft maps with fresh Level 1 topics; XP is not required.
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {gems.map(gem => (
            <div
              key={gem.id}
              onClick={() => toggleGem(gem.id)}
              style={{
                background: selectedGems.has(gem.id) ? 'var(--accent-bg)' : 'var(--bg)',
                border: `1px solid ${selectedGems.has(gem.id) ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 6,
                padding: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: 600 }}>{gem.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Tier {gem.tier || 1} • Weight {gem.weight || 1} • Cycles {gem.cycles || 1}
              </div>
              {gem.tags && gem.tags.length > 0 && (
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                  {gem.tags.join(', ')}
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Crafting Cost Display */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16
      }}>
        <h3>Crafting Cost (Fixed)</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(craftingCost).map(([currencyType, amount]) => {
            const hasEnough = (currency[currencyType] || 0) >= amount
            return (
              <div
                key={currencyType}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  border: `1px solid ${hasEnough ? 'var(--success)' : 'var(--error)'}`,
                  borderRadius: 6,
                  color: hasEnough ? 'var(--success)' : 'var(--error)'
                }}
              >
                <span>{currencyType}: {amount}</span>
                <span style={{ opacity: 0.7 }}>({currency[currencyType] || 0} owned)</span>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>
          All maps now cost the same to craft - difficulty is determined by your gem levels!
        </div>
      </div>

      {/* Craft Button */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={craftMap}
          disabled={selectedGems.size === 0
            || Object.entries(craftingCost).some(([type, amount]) => (currency[type] || 0) < amount)
            || isRunning
            || !!craftedMap}
          style={{
            padding: '12px 24px',
            background: (!isRunning && !craftedMap && selectedGems.size > 0 && Object.entries(craftingCost).every(([type, amount]) => (currency[type] || 0) >= amount)) ? 'var(--accent)' : 'var(--bg)',
            color: (!isRunning && !craftedMap && selectedGems.size > 0 && Object.entries(craftingCost).every(([type, amount]) => (currency[type] || 0) >= amount)) ? 'var(--accent-fg)' : 'var(--fg-muted)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            cursor: (!isRunning && !craftedMap && selectedGems.size > 0 && Object.entries(craftingCost).every(([type, amount]) => (currency[type] || 0) >= amount)) ? 'pointer' : 'not-allowed',
            fontSize: 16,
            fontWeight: 600
          }}
        >
          {isRunning ? 'Session Running...' : (craftedMap ? 'Map Ready' : 'Craft Map')}
        </button>
      </div>

      {/* Crafted Map Display */}
      {craftedMap && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Current Map Session</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                padding: '8px 16px',
                background: getDifficultyColor(craftedMap.difficultyTier),
                color: 'black',
                border: '2px solid var(--border)',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 14,
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
              }}>
                {craftedMap.difficultyTier}
              </div>
              <div style={{
                padding: '8px 16px',
                background: isRunning ? 'var(--success)' : 'var(--bg)',
                color: isRunning ? 'white' : 'var(--fg-muted)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 14
              }}>
                {isRunning ? 'Running' : 'Ready'}
              </div>
            </div>
          </div>

          {!isRunning && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: 12 }}>
              <button
                onClick={() => {
                  if (!craftedMap) return;
                  const mins = studyTimeMinutes;
                  const ok = window.confirm(`Start map session for ${mins} minute(s)? Your screen will be frozen for focus.`);
                  if (ok) startMapSession(craftedMap)
                }}
                style={{ background:'var(--accent)', color:'var(--accent-fg)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 16px', fontWeight:700 }}
              >
                Start Map Session
              </button>
              {!craftedMap && (lastIntentRef.current) && (
                <button
                  onClick={() => {
                    const ok = craftFromIntent(lastIntentRef.current)
                    if (!ok) alert('No matching gems for last suggestion.')
                  }}
                  style={{ marginLeft: 8, background:'var(--bg)', color:'var(--fg)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 16px', fontWeight:700 }}
                >
                  Craft Suggested
                </button>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isRunning && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                width: '100%',
                height: 8,
                background: 'var(--bg)',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 0.1s ease'
                }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 8, fontSize: 14 }}>
                <div>
                  {progress.toFixed(1)}% - Study time: {studyTimeMinutes} minutes
                </div>
                {/* Total questions attempted indicator */}
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  {(() => {
                    try {
                      const counters = runCountersRef.current || {}
                      const attempted = Object.values(counters).reduce((s: number, c: any) => s + (c.attempted || 0), 0)
                      return `Questions: ${attempted} / ${craftedMap?.questionCount || 0}`
                    } catch { return '' }
                  })()}
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.7 }}>
                Screen frozen during study session - solve questions on paper!
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                <button
                  onClick={() => dispatch({ type:'UPDATE_MAP_PROGRESS', progress: 100 })}
                  style={{ background:'var(--bg)', color:'var(--fg)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 10px', fontSize:12 }}
                >
                  Finish Now
                </button>
              </div>
              {/* In-run HUD for paper tracking */}
              {craftedMap?.lineup?.length ? (
                <div style={{ marginTop: 12, border:'1px dashed var(--border)', borderRadius:8, padding:8 }}>
                  <div style={{ fontSize:12, opacity:0.8, marginBottom:6 }}>Hotkeys: Space=Correct Â· X=Incorrect Â· Z=Undo Â· Tab=Next Topic</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:8 }}>
                    {craftedMap.lineup.map((l:any, idx:number) => {
                      const c = runCountersRef.current[l.gemId] || { correct:0, attempted:0 }
                      const remaining = Math.max(0, (l.allocated||0) - c.attempted)
                      const isCur = idx === topicCursorRef.current
                      return (
                        <div key={l.gemId} style={{ border:'1px solid var(--border)', borderRadius:6, padding:8, background: isCur ? 'rgba(34,197,94,0.08)' : 'var(--bg)' }}>
                          <div style={{ fontWeight:700, fontSize:13 }}>{l.name} <span style={{ opacity:0.7 }}>({l.allocated}q)</span></div>
                          <div style={{ fontSize:12, opacity:0.8 }}>Correct: {c.correct} Â· Attempted: {c.attempted} Â· Left: {remaining}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <pre style={{
            background: 'var(--bg)',
            padding: 12,
            borderRadius: 4,
            fontSize: 13,
            lineHeight: 1.4,
            margin: 0,
            whiteSpace: 'pre-wrap'
          }}>
            {formatCraftedMapText(craftedMap)}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        opacity: 0.8
      }}>
        <h4>🎯 Enhanced Study Workflow:</h4>
        <ol>
          <li>Select gems (study topics) to include in the map</li>
          <li>Click "Craft Map" to create your practice session</li>
          <li>Click "Start Map Session" to begin with <strong>active recall prompts</strong></li>
          <li>🧠  <strong>Pre-study memory test:</strong> Write down what you remember without looking</li>
          <li>📖 Study session begins - screen freezes, solve questions on paper!</li>
          <li>Follow affix rules (time limits, difficulty filters, etc.)</li>
          <li>📊 <strong>Self-assessment:</strong> Rate confidence, difficulty, and recall quality</li>
          <li>🎁 Get XP + currency rewards with <strong>metacognitive bonuses</strong></li>
          <li>💡 <strong>Knowledge consolidation:</strong> Extra XP for good performance (70%+)</li>
          <li><strong>Sessions are saved!</strong> Refresh-safe progress tracking</li>
        </ol>
        <div style={{ marginTop: 12, padding: 12, background: 'var(--accent-bg)', borderRadius: 6, fontSize: 13 }}>
          <strong>🧪 Learning Science Features:</strong> Active recall testing, metacognitive self-assessment, spaced repetition integration, and knowledge consolidation bonuses based on pedagogical research!
        </div>
      </div>

      {/* Focus mode overlay and indicator */}
      {isRunning && (
        <>
          {/* Subtle overlay to discourage clicking but allow scrolling */}
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 500,
            pointerEvents: 'none' // Allow scrolling and other interactions
          }} />

          {/* Focus indicator */}
          <div style={{
            position: 'fixed',
            top: 20,
            right: 20,
            background: 'rgba(0,0,0,0.95)',
            color: '#fff',
            padding: 20,
            borderRadius: 12,
            zIndex: 1000,
            minWidth: 250,
            border: '2px solid var(--accent)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>
              🎯 Focus Mode Active
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
              Study session in progress - solve on paper!
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{
                height: 6,
                background: '#1f2937',
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid #334155'
              }}>
                <div style={{
                  width: `${progress.toFixed(1)}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 0.2s linear'
                }} />
              </div>
            </div>
            <div style={{
              fontSize: 12,
              opacity: 0.8,
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{progress.toFixed(1)}%</span>
              <span>{studyTimeMinutes} min</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
