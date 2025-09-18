import { useGameState } from '../../context/GameStateContext'

const taskIcons: Record<string, string> = {
  study_minutes: '📘',
  cycles: '⏱️',
  category_minutes: '📚',
  topic_accuracy: '🎯',
  topic_coverage: '🧩',
  map_objective: '🗺️',
  mock_section_target: '📝',
  error_repair: '♻️'
}

const taskColors: Record<string, string> = {
  active: '#3b82f6',
  completed: '#10b981',
  claimed: '#6b7280'
}

export default function DailyTasksView() {
  const { state, dispatch } = useGameState()
  const tasks = state.tasks ?? []
  const claim = (id: string) => dispatch({ type: 'TASK_CLAIM', id })
  const generateMoreTasks = () => dispatch({ type: 'GENERATE_SMART_TASKS', force: true })

  // SRS Due badge
  const srs = state.srs || {}
  const gems = state.gems || []
  const now = Date.now()
  const dueItems = Object.values(srs).filter(it => new Date(it.dueISO).getTime() <= now)
  const overdueSorted = [...dueItems].sort((a,b)=> new Date(a.dueISO).getTime() - new Date(b.dueISO).getTime())
  const topDue = overdueSorted[0]
  const topGem = topDue ? gems.find(g=> g.id === topDue.id) : undefined
  const topSubject = topGem?.tags?.find(t => !/^high$|^medium$/i.test(t))
  const openTopDue = () => {
    if (!topGem) return
    dispatch({ type: 'SET_MAP_INTENT', intent: { category: topGem.category, topic: topGem.name, subject: topSubject, mapAffixes: ['precision'], targetPercent: 80 }})
    window.location.hash = 'maps'
  }

  const activeTasks = tasks.filter(t => t.status === 'active')
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const claimedTasks = tasks.filter(t => t.status === 'claimed')

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ display:'flex', alignItems:'center', gap:8 }}>
            Roadmap
            {dueItems.length > 0 && (
              <button onClick={openTopDue} title={`Due: ${topGem?.name || ''}`}
                style={{ fontSize: 12, padding:'2px 8px', borderRadius: 999, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--fg)' }}>
                Due Now: {dueItems.length}
              </button>
            )}
          </h2>
          <p style={{ opacity: 0.8, margin: 0 }}>Próximo passo recomendado rumo à UNICAMP</p>
        </div>
        <button onClick={generateMoreTasks} style={{ background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Gerar Mais
        </button>
      </div>

      {activeTasks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: 'var(--accent)', marginBottom: 12 }}>Do Now + Alternativas</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {activeTasks.map(t => (
              <TaskCard key={t.id} task={t} onClaim={claim} />
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#10b981', marginBottom: 12 }}>Prontos para resgatar</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {completedTasks.map(t => (
              <TaskCard key={t.id} task={t} onClaim={claim} />
            ))}
          </div>
        </div>
      )}

      {claimedTasks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#6b7280', marginBottom: 12 }}>Resgatados recentemente</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {claimedTasks.slice(-3).map(t => (
              <TaskCard key={t.id} task={t} onClaim={claim} />
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, opacity: 0.8 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧭</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Preparando recomendações…</div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>As tarefas aparecem com base no seu progresso e na prova UNICAMP.</div>
          <button onClick={generateMoreTasks} style={{ background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 16 }}>
            Gerar Tarefas Iniciais
          </button>
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, onClaim }: { task: any, onClaim: (id: string) => void }) {
  const { dispatch } = useGameState()
  const progressRatio = task.target > 0 ? Math.min(1, task.progress / task.target) : 0
  const isCompleted = task.status === 'completed'
  const isClaimed = task.status === 'claimed'

  return (
    <div style={{ background: 'var(--card-bg)', border: `2px solid ${isCompleted ? '#10b981' : isClaimed ? '#6b7280' : 'var(--border)'}`, borderRadius: 8, padding: 16, position: 'relative', transition: 'all 0.2s ease' }}>
      <div style={{ position: 'absolute', top: 12, right: 12, background: isCompleted ? '#10b981' : isClaimed ? '#6b7280' : 'var(--accent)', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>
        {isCompleted ? 'Pronto' : isClaimed ? 'Resgatado' : 'Ativo'}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 20 }}>{taskIcons[task.kind] || '🎯'}</div>
        <div style={{ flex: 1, paddingRight: 60 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: isCompleted ? '#10b981' : isClaimed ? '#6b7280' : 'var(--fg)' }}>
            {task.title}
            {task.category && (
              <span style={{ fontSize: 12, opacity: 0.7, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>
                {task.category}
              </span>
            )}
            {task.topic && (
              <span style={{ fontSize: 12, opacity: 0.7, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg-muted)', padding: '2px 6px', borderRadius: 4, marginLeft: 6 }}>
                {task.subject ? `${task.subject}: ` : ''}{task.topic}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>
            {formatProgress(task.progress, task.target, task.kind, task.targetPercent)}
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ width: `${progressRatio * 100}%`, height: '100%', background: isCompleted ? '#10b981' : isClaimed ? '#6b7280' : 'var(--accent)', transition: 'width 0.3s ease' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ background: 'var(--bg)', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
          🎁 {task.reward.amount} {task.reward.currency}
        </div>

        {/* Action CTA: route to Maps with intent for roadmap tasks */}
        {!isCompleted && !isClaimed && (
          <TaskCTA task={task} dispatch={dispatch} />
        )}

        {isCompleted && (
          <button onClick={() => onClaim(task.id)} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'transform 0.1s ease' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Resgatar
          </button>
        )}

        {isClaimed && (
          <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 600 }}>Resgatado</div>
        )}
      </div>
    </div>
  )
}

function TaskCTA({ task, dispatch }: { task: any, dispatch: any }){
  const goMaps = (intent: any) => {
    dispatch({ type: 'SET_MAP_INTENT', intent })
    window.location.hash = 'maps'
  }
  if (task.kind === 'map_objective') {
    return (
      <button onClick={() => goMaps({ taskId: task.id, category: task.category, subject: task.subject, topic: task.topic, tags: task.tags, mapAffixes: task.mapAffixes, targetPercent: task.targetPercent })}
        style={{ background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Abrir no Mapa
      </button>
    )
  }
  if (task.kind === 'topic_accuracy' || task.kind === 'topic_coverage') {
    return (
      <button onClick={() => goMaps({ taskId: task.id, category: task.category, subject: task.subject, topic: task.topic, tags: task.tags, mapAffixes: ['precision'], targetPercent: task.targetPercent ?? (task.kind==='topic_accuracy'?80:70) })}
        style={{ background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Praticar no Mapa
      </button>
    )
  }
  return null
}

function formatProgress(p: number, t: number, kind: string, targetPercent?: number) {
  if (kind === 'cycles') return `${Math.floor(p)} / ${t} ciclos`
  if (kind === 'study_minutes' || kind === 'category_minutes') return `${Math.floor(p)} / ${t} minutos`
  if (kind === 'map_objective') return `${Math.floor(p)} / ${t} mapas${targetPercent ? ` • alvo ≥${targetPercent}%` : ''}`
  return `${Math.floor(p)} / ${t} questões${targetPercent ? ` • alvo ≥${targetPercent}%` : ''}`
}
