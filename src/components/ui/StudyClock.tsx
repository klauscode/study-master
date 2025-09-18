
interface StudyClockProps {
  seconds: number
  totalSeconds: number
  isStudyMode: boolean
  isActive: boolean
}

export default function StudyClock({ seconds, totalSeconds, isStudyMode, isActive }: StudyClockProps) {
  // Round seconds to whole numbers to fix decimal display issue
  const cleanSeconds = Math.floor(seconds)
  const cleanTotalSeconds = Math.floor(totalSeconds)

  const progress = cleanTotalSeconds > 0 ? Math.min(1, cleanSeconds / cleanTotalSeconds) : 0
  const remainingSeconds = Math.max(0, cleanTotalSeconds - cleanSeconds)

  // Convert seconds to time display
  const formatTime = (secs: number): string => {
    const cleanSecs = Math.floor(secs) // Ensure we always use whole seconds
    const h = Math.floor(cleanSecs / 3600)
    const m = Math.floor((cleanSecs % 3600) / 60)
    const s = cleanSecs % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Calculate circle properties for progress ring
  const size = 260
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference - (progress * circumference)

  const primaryColor = isStudyMode ? '#22c55e' : '#6366f1'
  const secondaryColor = isStudyMode ? '#16a34a' : '#4f46e5'
  const glowColor = isStudyMode ? '34, 197, 94' : '99, 102, 241'

  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Outer glow effect */}
      <div style={{
        position: 'absolute',
        inset: -20,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${glowColor}, 0.1) 0%, transparent 70%)`,
        filter: isActive ? `blur(20px)` : 'none',
        opacity: isActive ? 1 : 0,
        transition: 'all 0.3s ease'
      }} />

      {/* Background circle */}
      <svg
        width={size}
        height={size}
        style={{
          position: 'absolute',
          transform: 'rotate(-90deg)',
          filter: `drop-shadow(0 0 20px rgba(${glowColor}, 0.3))`
        }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Progress track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${isStudyMode ? 'study' : 'rest'})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          style={{
            transition: 'stroke-dashoffset 0.3s ease',
            filter: `drop-shadow(0 0 10px rgba(${glowColor}, 0.6))`
          }}
        />

        {/* Gradient definitions */}
        <defs>
          <linearGradient id="gradient-study" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="gradient-rest" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
        </defs>
      </svg>

      {/* Inner content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        zIndex: 1
      }}>
        {/* Main time display */}
        <div style={{
          fontSize: 48,
          fontWeight: 900,
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontFamily: 'monospace',
          letterSpacing: '-2px',
          marginBottom: 8,
          textShadow: `0 0 20px rgba(${glowColor}, 0.5)`,
          filter: isActive ? `drop-shadow(0 0 10px rgba(${glowColor}, 0.8))` : 'none',
          transition: 'all 0.3s ease'
        }}>
          {formatTime(cleanSeconds)}
        </div>

        {/* Remaining time */}
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: primaryColor,
          opacity: 0.8,
          marginBottom: 12
        }}>
          {formatTime(remainingSeconds)} remaining
        </div>

        {/* Mode indicator */}
        <div style={{
          background: `rgba(${glowColor}, 0.1)`,
          border: `2px solid rgba(${glowColor}, 0.3)`,
          borderRadius: 20,
          padding: '6px 16px',
          fontSize: 12,
          fontWeight: 700,
          color: primaryColor,
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {isStudyMode ? '📚 Study Mode' : '☕ Rest Mode'}
        </div>

        {/* Progress percentage */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          fontSize: 11,
          fontWeight: 600,
          opacity: 0.6,
          color: primaryColor
        }}>
          {Math.round(progress * 100)}%
        </div>
      </div>

      {/* Floating particles effect */}
      {isActive && (
        <>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 4,
                height: 4,
                background: primaryColor,
                borderRadius: '50%',
                opacity: 0.6,
                animation: `float-${i} ${3 + i * 0.5}s ease-in-out infinite`,
                left: `${50 + Math.cos((i * Math.PI * 2) / 6) * 40}%`,
                top: `${50 + Math.sin((i * Math.PI * 2) / 6) * 40}%`,
                transform: 'translate(-50%, -50%)',
                filter: `blur(1px)`,
                boxShadow: `0 0 10px ${primaryColor}`
              }}
            />
          ))}
          <style>
            {`
              @keyframes float-0 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-10px); } }
              @keyframes float-1 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-8px); } }
              @keyframes float-2 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-12px); } }
              @keyframes float-3 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-6px); } }
              @keyframes float-4 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-14px); } }
              @keyframes float-5 { 0%, 100% { transform: translate(-50%, -50%) translateY(0px); } 50% { transform: translate(-50%, -50%) translateY(-9px); } }
            `}
          </style>
        </>
      )}

      {/* Pulse effect when active */}
      {isActive && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px solid rgba(${glowColor}, 0.3)`,
          animation: 'pulse 2s ease-in-out infinite'
        }} />
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(1.05); opacity: 0.1; }
          }
        `}
      </style>
    </div>
  )
}
