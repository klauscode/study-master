import { useGameState } from '../../context/GameStateContext'
import affixDescriptions from '../../constants/affixDescriptions.json'

export default function SettingsView(){
  const { state, dispatch } = useGameState()
  const setPreset = (study: number, rest: number) => {
    dispatch({ type:'SET_CYCLE_LENGTH', seconds: study })
    dispatch({ type:'SET_REST_LENGTH', seconds: rest })
  }
  return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:12, background:'var(--card-bg)' }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Session</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={()=>setPreset(3000,600)}>Preset 50/10</button>
          <button onClick={()=>setPreset(1500,300)}>Preset 25/5</button>
          <div style={{ marginLeft:12 }}>Current: {state.session.cycleLengthSeconds}s / {state.session.restLengthSeconds}s</div>
        </div>
      </div>
      <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:12, background:'var(--card-bg)' }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Behavior</div>
        <label style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input type='checkbox' checked={state.settings?.soundEnabled ?? true} onChange={e=>dispatch({ type:'SET_SOUND', enabled: e.target.checked })} />
          Sound enabled
        </label>
      </div>
      <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:12, background:'var(--card-bg)' }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Character Image</div>
        <input
          value={state.settings?.characterImageUrl || ''}
          onChange={e=>dispatch({ type:'SET_CHARACTER_IMAGE_URL', url: e.target.value })}
          placeholder='https://.../my-character.png'
          style={{ width:'100%', background:'var(--bg)', color:'var(--fg)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 8px' }}
        />
      </div>

      {/* Map Affixes (RNG info) */}
      <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:12, background:'var(--card-bg)' }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>Map Affixes (RNG)</div>
        <div style={{ fontSize:12, opacity:0.8, marginBottom:8 }}>All map affixes roll randomly; this section documents what each affix does.</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
          {Object.entries(affixDescriptions as Record<string,string>).map(([id, desc]) => (
            <div key={id} style={{ border:'1px solid var(--border)', borderRadius:8, padding:10 }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>{id}</div>
              <div style={{ fontSize:12, opacity:0.9 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Exam Configuration */}
      <div style={{ border:'2px solid #ef4444', borderRadius:8, padding:16, background:'var(--card-bg)' }}>
        <div style={{ fontWeight:700, marginBottom:12, color:'#ef4444', fontSize:16 }}>🎯 Exam Configuration</div>

        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontWeight:600, marginBottom:4, fontSize:14 }}>Exam Name</label>
          <input
            value={state.settings?.examName || ''}
            onChange={e=>dispatch({ type:'SET_EXAM_NAME', name: e.target.value })}
            placeholder='e.g., Unicamp Entrance Exam'
            style={{
              width:'100%',
              background:'var(--bg)',
              color:'var(--fg)',
              border:'2px solid var(--border)',
              borderRadius:8,
              padding:'8px 12px',
              fontSize:14,
              fontWeight:600
            }}
          />
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontWeight:600, marginBottom:4, fontSize:14 }}>Exam Date</label>
          <input
            type='datetime-local'
            value={state.settings?.examDate ? new Date(state.settings.examDate).toISOString().slice(0, 16) : ''}
            onChange={e=> {
              if (e.target.value) {
                dispatch({ type:'SET_EXAM_DATE', date: new Date(e.target.value).toISOString() });
              }
            }}
            style={{
              width:'100%',
              background:'var(--bg)',
              color:'var(--fg)',
              border:'2px solid #ef4444',
              borderRadius:8,
              padding:'8px 12px',
              fontSize:14,
              fontWeight:600
            }}
          />
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontWeight:600, marginBottom:4, fontSize:14 }}>Target Score (%)</label>
          <input
            type='number'
            value={state.settings?.targetScore || 80}
            onChange={e=> {
              const score = Math.max(0, Math.min(100, parseInt(e.target.value) || 80));
              dispatch({ type:'SET_TARGET_SCORE', score });
            }}
            min="0"
            max="100"
            style={{
              width:'100%',
              background:'var(--bg)',
              color:'var(--fg)',
              border:'2px solid #f59e0b',
              borderRadius:8,
              padding:'8px 12px',
              fontSize:14,
              fontWeight:600
            }}
          />
          <div style={{
            fontSize:11,
            opacity:0.8,
            marginTop:4,
            color:'#f59e0b'
          }}>
            Your target exam score percentage
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontWeight:600, marginBottom:8, fontSize:12, opacity:0.8 }}>Quick Presets:</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button
              onClick={() => {
                const date = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
                dispatch({ type:'SET_EXAM_DATE', date: date.toISOString() });
              }}
              style={{
                background:'#ef4444',
                color:'white',
                border:'none',
                borderRadius:6,
                padding:'4px 8px',
                fontSize:11,
                fontWeight:600,
                cursor:'pointer'
              }}
            >
              40 Days
            </button>
            <button
              onClick={() => {
                const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                dispatch({ type:'SET_EXAM_DATE', date: date.toISOString() });
              }}
              style={{
                background:'#f59e0b',
                color:'white',
                border:'none',
                borderRadius:6,
                padding:'4px 8px',
                fontSize:11,
                fontWeight:600,
                cursor:'pointer'
              }}
            >
              30 Days
            </button>
            <button
              onClick={() => {
                const date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
                dispatch({ type:'SET_EXAM_DATE', date: date.toISOString() });
              }}
              style={{
                background:'#dc2626',
                color:'white',
                border:'none',
                borderRadius:6,
                padding:'4px 8px',
                fontSize:11,
                fontWeight:600,
                cursor:'pointer'
              }}
            >
              14 Days
            </button>
          </div>
        </div>

        {/* Time Remaining Display */}
        {state.settings?.examDate && (
          <div style={{
            padding:12,
            background:'rgba(239, 68, 68, 0.1)',
            border:'1px solid rgba(239, 68, 68, 0.3)',
            borderRadius:8,
            fontSize:12,
            fontWeight:600,
            color:'#ef4444'
          }}>
            ⏰ Time remaining: {Math.max(0, Math.ceil((new Date(state.settings.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
          </div>
        )}
      </div>

      {/* Game Reset Section */}
      <div style={{
        border:'2px solid #dc2626',
        borderRadius:16,
        padding:20,
        background:'rgba(220, 38, 38, 0.05)',
        marginTop:20
      }}>
        <div style={{
          fontSize:16,
          fontWeight:700,
          marginBottom:8,
          color:'#dc2626'
        }}>
          ⚠️ Danger Zone
        </div>
        <div style={{
          fontSize:13,
          opacity:0.8,
          marginBottom:16,
          lineHeight:1.4
        }}>
          Reset all progress, statistics, and configuration. This action cannot be undone!
        </div>
        <button
          onClick={() => {
            if (window.confirm('Are you absolutely sure you want to reset ALL your progress? This will delete everything permanently and cannot be undone!')) {
              if (window.confirm('Last chance! This will permanently delete all your study data, character progress, and achievements. Are you sure?')) {
                // Use the existing reset function that's already exposed to window
                (window as any).resetGame?.();
              }
            }
          }}
          style={{
            background:'#dc2626',
            color:'white',
            border:'none',
            borderRadius:8,
            padding:'12px 20px',
            fontSize:14,
            fontWeight:700,
            cursor:'pointer',
            transition:'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#b91c1c';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#dc2626';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          💀 RESET GAME
        </button>
      </div>
    </div>
  )
}
