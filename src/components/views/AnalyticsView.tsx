import { useMemo } from 'react'
import { useGameState } from '../../context/GameStateContext'
import ProgressDebtTracker from '../ui/ProgressDebtTracker'
import PerformanceRealityCheck from '../ui/PerformanceRealityCheck'
import PersonalCompetitionTracker from '../ui/PersonalCompetitionTracker'
import UnicampBenchmarkDisplay from '../ui/UnicampBenchmarkDisplay'
import StudyDebtCalculator from '../ui/StudyDebtCalculator'
import { getAffixDisplayName } from '../../services/mapCraftService'

type DayBin = { date: string; studySeconds: number; cycles: number; xp: number }

export default function AnalyticsView() {
  const { state, dispatch } = useGameState()
  const cycles = state.analytics.cycles

  const last7 = useMemo(() => aggregateDays(cycles, 7), [cycles])
  const catTotals = useMemo(() => aggregateCategories(cycles, 7), [cycles])
  const totalStudy = cycles.reduce((s, r) => s + r.studySeconds, 0)
  const totalCycles = cycles.length
  const avgFocus = cycles.length ? cycles.reduce((s, r) => s + r.avgFocus, 0) / cycles.length : 0
  const totalXp = cycles.reduce((s, r) => s + r.xpGained, 0)
  const downloadCsv = () => {
    const headers = ['startedAtISO','endedAtISO','studySeconds','avgFocus','xpGained','lootCount','gemId','category']
    const rows = cycles.map(r => [r.startedAtISO, r.endedAtISO, r.studySeconds, r.avgFocus, r.xpGained, r.lootCount, r.gemId ?? '', r.category ?? ''])
    const csv = [headers.join(','), ...rows.map(cols => cols.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `studyfall-cycles-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
      maxWidth: '100%',
      width: '100%',
      margin: '0',
      padding: '0'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        padding: '24px 0',
        borderBottom: '2px solid var(--border)',
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(16, 185, 129, 0.05))',
        borderRadius: '16px 16px 0 0'
      }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 800,
          marginBottom: 12,
          background: 'linear-gradient(45deg, #22c55e, #10b981)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          📊 Analytics Dashboard
        </h1>
        <p style={{ fontSize: 16, opacity: 0.8, margin: 0, fontWeight: 500 }}>
          Track your progress • Analyze patterns • Optimize performance
        </p>
      </div>

      {/* Daily Plan Strip */}
      <DailyPlanStrip />
      {/* Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 24
      }}>
        <StatCard
          icon="⏱️"
          label="Total Study Time"
          value={`${Math.round(totalStudy/60)} min`}
          color="#3b82f6"
        />
        <StatCard
          icon="🔄"
          label="Study Cycles"
          value={`${totalCycles}`}
          color="#8b5cf6"
        />
        <StatCard
          icon="🎯"
          label="Average Focus"
          value={avgFocus.toFixed(2)}
          color="#f59e0b"
        />
        <StatCard
          icon="⭐"
          label="Total XP"
          value={`${Math.round(totalXp).toLocaleString()}`}
          color="#22c55e"
        />
      </div>

      {/* SRS Overview */}
      <SrsOverview />

      {/* Map Outcomes */}
      <MapOutcomes />

      {/* Export Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 8
      }}>
        <button
          onClick={downloadCsv}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.3)';
          }}
        >
          📥 Download CSV Report
        </button>
      </div>
      {/* Chart Section */}
      <div style={{
        border: '2px solid var(--border)',
        borderRadius: 20,
        padding: 32,
        background: 'var(--card-bg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 24,
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          📈 Last 7 Days Activity
        </div>
        <BarRow bins={last7} />
      </div>
      {/* Category Balance */}
      <div style={{
        border: '2px solid var(--border)',
        borderRadius: 20,
        padding: 32,
        background: 'var(--card-bg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 24,
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          🎨 Category Balance (Last 7 Days)
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20
        }}>
          {(['Math','Science','Language','Humanities'] as const).map((cat, index) => {
            const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e'];
            const icons = ['🔢', '🔬', '📚', '🎨'];
            const minutes = Math.round((catTotals[cat]||0)/60);
            const percentage = Math.min(100, (catTotals[cat]||0) / Math.max(1,totalStudy/4) * 100);

            return (
              <div key={cat} style={{
                border: `2px solid ${colors[index]}30`,
                borderRadius: 16,
                padding: '20px 24px',
                background: `${colors[index]}10`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12
                }}>
                  <span style={{ fontSize: 20 }}>{icons[index]}</span>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors[index]
                  }}>
                    {cat}
                  </span>
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: colors[index],
                  marginBottom: 12
                }}>
                  {minutes} min
                </div>
                <div style={{
                  height: 8,
                  background: 'var(--border)',
                  borderRadius: 6,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${colors[index]}, ${colors[index]}80)`,
                    borderRadius: 6,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{
                  fontSize: 11,
                  opacity: 0.7,
                  marginTop: 6,
                  fontWeight: 600
                }}>
                  {percentage.toFixed(1)}% of target
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Recent Cycles */}
      <div style={{
        border: '2px solid var(--border)',
        borderRadius: 20,
        padding: 32,
        background: 'var(--card-bg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 24,
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          🕰️ Recent Study Sessions
        </div>
        {cycles.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            opacity: 0.6
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              No study sessions yet
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Complete your first study cycle to see analytics here
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: 16,
            maxHeight: '400px',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '4px 8px 4px 4px'
          }}>
            {cycles.slice(-20).reverse().map((r, i) => {
              const categoryColors: Record<string, string> = {
                'Math': '#3b82f6',
                'Science': '#8b5cf6',
                'Language': '#f59e0b',
                'Humanities': '#22c55e'
              };
              const categoryColor = categoryColors[r.category || ''] || '#94a3b8';

              return (
                <div key={i} style={{
                  border: '2px solid var(--border)',
                  borderRadius: 16,
                  padding: '20px 24px',
                  background: 'var(--bg)',
                  transition: 'all 0.2s ease',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 20,
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 8
                    }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--fg)'
                      }}>
                        {new Date(r.startedAtISO).toLocaleDateString()} at {new Date(r.startedAtISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {r.category && (
                        <div style={{
                          background: `${categoryColor}20`,
                          color: categoryColor,
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700
                        }}>
                          {r.category}
                        </div>
                      )}
                    </div>
                    {r.topic && (
                      <div style={{
                        fontSize: 12,
                        opacity: 0.8,
                        fontWeight: 600,
                        marginBottom: 8,
                        fontStyle: 'italic'
                      }}>
                        "📝 {r.topic}"
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      gap: 16,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        padding: '4px 8px',
                        borderRadius: 6
                      }}>
                        ⏱️ {Math.round(r.studySeconds/60)} min
                      </div>
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        color: '#f59e0b',
                        padding: '4px 8px',
                        borderRadius: 6
                      }}>
                        🎯 {r.avgFocus.toFixed(2)} focus
                      </div>
                      <div style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        padding: '4px 8px',
                        borderRadius: 6
                      }}>
                        ⭐ {Math.round(r.xpGained)} XP
                      </div>
                      <div style={{
                        background: 'rgba(139, 92, 246, 0.1)',
                        color: '#8b5cf6',
                        padding: '4px 8px',
                        borderRadius: 6
                      }}>
                        🎁 {r.lootCount} loot
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Personal Competition Tracker */}
      <PersonalCompetitionTracker
        cycles={cycles}
        mockExams={state.mockExams || []}
      />

      {/* Performance Reality Check */}
      {state.settings?.examDate && state.settings?.targetScore && (
        <PerformanceRealityCheck
          mockExams={state.mockExams || []}
          examDate={state.settings.examDate}
          targetScore={state.settings.targetScore}
          cycles={cycles}
          onAddMockExam={(exam) => dispatch({ type: 'ADD_MOCK_EXAM', exam })}
          onDeleteMockExam={(examId) => dispatch({ type: 'DELETE_MOCK_EXAM', examId })}
        />
      )}

      {/* Progress Debt Tracker */}
      {state.settings?.examDate && (
        <ProgressDebtTracker
          cycles={cycles}
          examDate={state.settings.examDate}
        />
      )}

      {/* Unicamp Benchmark Display */}
      {state.settings?.examDate && (
        <UnicampBenchmarkDisplay
          cycles={cycles}
          mockExams={state.mockExams || []}
          examDate={state.settings.examDate}
        />
      )}

      {/* Study Debt Calculator */}
      {state.settings?.examDate && (
        <StudyDebtCalculator
          cycles={cycles}
          examDate={state.settings.examDate}
        />
      )}
    </div>
  )
}

function DailyPlanStrip(){
  const { state, dispatch } = useGameState()
  const mapResults = state.analytics.mapResults || []
  const now = new Date()
  // Use Sao Paulo TZ boundary (approx via local day for simplicity)
  const today = now.toDateString()
  const mapsToday = mapResults.filter(r => new Date(r.endedAtISO).toDateString() === today).length
  const srs = state.srs || {}
  const reviewDone = Object.values(srs).some(it => new Date(it.lastReviewISO || 0).toDateString() === today)
  const targetMaps = 3
  const itemStyle = { display:'flex', alignItems:'center', gap:8, border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', background:'var(--card-bg)' } as const
  const check = (done:boolean) => <span style={{ fontWeight:700, color: done ? '#10b981' : 'var(--fg-muted)' }}>{done ? '✔' : '○'}</span>
  const openMock = () => {
    // Seed a mock_section_target task via generation and route to tasks
    dispatch({ type:'GENERATE_SMART_TASKS', force:true })
    window.location.hash = 'tasks'
  }
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12 }}>
      <div style={itemStyle}>
        {check(mapsToday >= 1)} <div>Map 1</div>
      </div>
      <div style={itemStyle}>
        {check(mapsToday >= 2)} <div>Map 2</div>
      </div>
      <div style={itemStyle}>
        {check(mapsToday >= 3)} <div>Map 3</div>
      </div>
      <div style={itemStyle}>
        {check(reviewDone)} <div>Review</div>
      </div>
      <div style={itemStyle}>
        {check(false)} <button onClick={openMock} style={{ background:'var(--bg)', color:'var(--fg)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 10px' }}>Mock/Reading</button>
      </div>
    </div>
  )
}

function MapOutcomes(){
  const { state } = useGameState()
  const results = state.analytics.mapResults || []
  const now = Date.now()
  const since = now - 7*24*3600*1000
  const last7 = results.filter(r => new Date(r.endedAtISO).getTime() >= since)

  // Accuracy by Tier
  type TierKey = 'Bronze'|'Silver'|'Gold'|'Platinum'|'Diamond'
  const tiers: TierKey[] = ['Bronze','Silver','Gold','Platinum','Diamond']
  const tierStats: Record<TierKey, {count:number; sum:number}> = {
    Bronze:{count:0,sum:0}, Silver:{count:0,sum:0}, Gold:{count:0,sum:0}, Platinum:{count:0,sum:0}, Diamond:{count:0,sum:0}
  }
  for (const r of last7) {
    const t = (r.difficultyTier || 'Bronze') as TierKey
    if (!tierStats[t]) continue
    tierStats[t].count += 1
    tierStats[t].sum += r.accuracy || 0
  }

  // Affix effectiveness
  const affixMap: Record<string, {count:number; sum:number}> = {}
  for (const r of last7) {
    for (const a of (r.affixes||[])) {
      if (!affixMap[a]) affixMap[a] = {count:0, sum:0}
      affixMap[a].count += 1
      affixMap[a].sum += r.accuracy || 0
    }
  }
  const affixList = Object.entries(affixMap)
    .map(([id, s]) => ({ id, count: s.count, avg: s.count ? (s.sum/s.count) : 0 }))
    .sort((a,b)=> b.count - a.count)
    .slice(0,8)

  // Time vs Accuracy buckets
  const buckets = [
    { label: '≤10m', min:0, max:10 },
    { label: '11–20m', min:11, max:20 },
    { label: '21–30m', min:21, max:30 },
    { label: '31–45m', min:31, max:45 },
    { label: '46m+', min:46, max:1e9 }
  ]
  const bucketStats = buckets.map(b => ({ ...b, count:0, sum:0 }))
  for (const r of last7) {
    const t = Math.round(r.timeSpentMinutes || 0)
    const idx = bucketStats.findIndex(b => t >= b.min && t <= b.max)
    if (idx >= 0){ bucketStats[idx].count += 1; bucketStats[idx].sum += r.accuracy || 0 }
  }

  const cardStyle = { background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:8, padding:16 } as const
  const chip = (text:string, sub?:string) => (
    <span style={{ border:'1px solid var(--border)', borderRadius:999, padding:'2px 8px', fontSize:12 }}>
      {text}{sub ? <span style={{ opacity:0.7 }}> · {sub}</span> : null}
    </span>
  )

  return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={cardStyle}>
        <h3 style={{ marginTop:0, marginBottom:8 }}>Map Outcomes (7d)</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12 }}>
          {/* Accuracy by Tier */}
          <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:12 }}>
            <div style={{ fontWeight:700, marginBottom:8 }}>Accuracy by Tier</div>
            <div style={{ display:'grid', gap:6 }}>
              {tiers.map(t => {
                const s = tierStats[t]
                const avg = s.count ? (s.sum/s.count) : 0
                return (
                  <div key={t} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span>{t}</span>
                    <span>{(avg*100).toFixed(1)}% ({s.count})</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Affix Effectiveness */}
          <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:12 }}>
            <div style={{ fontWeight:700, marginBottom:8 }}>Affix Effectiveness</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {affixList.length === 0 ? (
                <span style={{ opacity:0.7, fontSize:12 }}>No data</span>
              ) : (
                affixList.map(a => (
                  <span key={a.id}>{chip(getAffixDisplayName(a.id), `${(a.avg*100).toFixed(0)}% · ${a.count}`)}</span>
                ))
              )}
            </div>
          </div>

          {/* Time vs Accuracy */}
          <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:12 }}>
            <div style={{ fontWeight:700, marginBottom:8 }}>Time vs Accuracy</div>
            <div style={{ display:'grid', gap:6 }}>
              {bucketStats.map(b => {
                const avg = b.count ? (b.sum/b.count) : 0
                return (
                  <div key={b.label} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span>{b.label}</span>
                    <span>{(avg*100).toFixed(1)}% ({b.count})</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SrsOverview(){
  const { state, dispatch } = useGameState()
  const srs = state.srs || {}
  const gems = state.gems || []
  const now = Date.now()
  const items = Object.values(srs)
  const total = items.length
  const due = items.filter(it => new Date(it.dueISO).getTime() <= now)
  const overdue = due.filter(it => new Date(it.dueISO).getTime() + 24*3600*1000 < now)
  const soon = items.filter(it => {
    const t = new Date(it.dueISO).getTime()
    return t > now && (t - now) <= 48*3600*1000
  })
  const topList = [...due].sort((a,b)=> new Date(a.dueISO).getTime() - new Date(b.dueISO).getTime()).slice(0,5)
  const goPractice = (gemId:string) => {
    const g = gems.find(x=>x.id===gemId)
    if (!g) return
    const subj = g.tags?.find(t => !/^high$|^medium$/i.test(t))
    dispatch({ type:'SET_MAP_INTENT', intent: { category: g.category, topic: g.name, subject: subj, mapAffixes:['precision'], targetPercent:80 } })
    window.location.hash = 'maps'
  }
  return (
    <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:8, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <h3 style={{ margin:0 }}>SRS Overview</h3>
        <div style={{ display:'flex', gap:8, fontSize:12 }}>
          <span>Total: {total}</span>
          <span>Due: {due.length}</span>
          <span>Overdue: {overdue.length}</span>
          <span>Soon: {soon.length}</span>
        </div>
      </div>
      {topList.length > 0 ? (
        <div style={{ display:'grid', gap:6 }}>
          {topList.map(it => {
            const g = gems.find(x=>x.id===it.id)
            return (
              <div key={it.id} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto auto', gap:8, alignItems:'center' }}>
                <div>
                  <strong>{g?.name || it.id}</strong>
                  {g?.tags && g.tags.length>0 && (
                    <span style={{ marginLeft:6, fontSize:12, opacity:0.7 }}>{g.tags[0]}</span>
                  )}
                </div>
                <div style={{ fontSize:12, opacity:0.8 }}>EF {it.ef.toFixed(2)}</div>
                <div style={{ fontSize:12, opacity:0.8 }}>Reps {it.reps}</div>
                <div style={{ fontSize:12, opacity:0.8 }}>Int {it.interval}d</div>
                <button onClick={()=>goPractice(it.id)} style={{ fontSize:12, padding:'4px 8px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg)', color:'var(--fg)' }}>
                  Practice
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ fontSize:12, opacity:0.7 }}>No due items. 🎉</div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{
      border: `2px solid ${color}30`,
      borderRadius: 20,
      padding: '24px 28px',
      background: `${color}10`,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: 24,
        marginBottom: 8
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        opacity: 0.8,
        marginBottom: 8,
        color: color
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: 900,
        color: color
      }}>
        {value}
      </div>
    </div>
  )
}

function aggregateDays(cycles: { startedAtISO: string; studySeconds: number; xpGained: number }[], days: number): DayBin[] {
  const now = new Date()
  const bins: Record<string, DayBin> = {}

  // Start from today and go back to create the last 7 days including today
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    bins[key] = { date: key, studySeconds: 0, cycles: 0, xp: 0 }
  }
  for (const r of cycles){
    const k = new Date(r.startedAtISO); k.setHours(0,0,0,0)
    const key = k.toISOString().slice(0,10)
    if (bins[key]){
      bins[key].studySeconds += r.studySeconds
      bins[key].cycles += 1
      bins[key].xp += r.xpGained
    }
  }
  // return in chronological order oldest -> newest
  return Object.values(bins).sort((a,b)=>a.date.localeCompare(b.date))
}

function BarRow({ bins }: { bins: DayBin[] }){
  const max = Math.max(1, ...bins.map(b => b.studySeconds))
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      justifyContent: 'center',
      alignItems: 'flex-end',
      padding: '20px 0'
    }}>
      {bins.map(b => {
        const isToday = b.date === today;
        const height = Math.max(8, (b.studySeconds / max) * 120);

        return (
          <div
            key={b.date}
            title={`${b.date} • ${Math.round(b.studySeconds/60)} min • ${b.cycles} cycles`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              opacity: 0.8,
              color: isToday ? '#22c55e' : 'var(--fg)'
            }}>
              {Math.round(b.studySeconds/60)}m
            </div>
            <div style={{
              width: 32,
              height: 120,
              background: 'var(--border)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              overflow: 'hidden',
              border: isToday ? '2px solid #22c55e' : '2px solid transparent',
              boxShadow: isToday ? '0 4px 16px rgba(34, 197, 94, 0.3)' : 'none'
            }}>
              <div style={{
                width: '100%',
                height: `${height}px`,
                background: isToday
                  ? 'linear-gradient(180deg, #22c55e, #10b981)'
                  : 'linear-gradient(180deg, #3b82f6, #1d4ed8)',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.3s ease'
              }} />
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              opacity: isToday ? 1 : 0.7,
              color: isToday ? '#22c55e' : 'var(--fg)'
            }}>
              {new Date(b.date).toLocaleDateString(undefined, { weekday: 'short' })}
              {isToday && ' (Today)'}
            </div>
          </div>
        );
      })}
    </div>
  )
}

function aggregateCategories(cycles: { endedAtISO: string; studySeconds: number; category?: 'Math'|'Science'|'Language'|'Humanities' }[], days: number){
  const now = new Date();
  const since = now.getTime() - days*24*60*60*1000;
  const totals: Record<'Math'|'Science'|'Language'|'Humanities', number> = { Math:0, Science:0, Language:0, Humanities:0 };
  for (const r of cycles){
    const t = new Date(r.endedAtISO).getTime();
    if (t < since) continue;
    if (r.category) totals[r.category] += r.studySeconds;
  }
  return totals;
}
