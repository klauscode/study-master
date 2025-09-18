import React from 'react'
import { useGameState } from '../../context/GameStateContext'
import { getActiveConsumables } from '../../services/consumableService'
import consumablesData from '../../constants/consumables.json'

const CONSUMABLES = consumablesData as any[]

interface BuffIconProps {
  icon: string
  name: string
  timeLeft: number // in seconds
  color: string
  isConsumable?: boolean
}

function BuffIcon({ icon, name, timeLeft, color, isConsumable }: BuffIconProps) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div
      style={{
        position: 'relative',
        width: 44, // Slightly larger for better touch targets
        height: 44,
        background: `linear-gradient(135deg, ${color}25, ${color}45)`,
        border: `2px solid ${color}`,
        borderRadius: 10, // More rounded for modern look
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20, // Larger emoji
        cursor: 'pointer',
        boxShadow: `0 3px 10px ${color}40`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smoother animation
        backdropFilter: 'blur(8px)', // Subtle blur effect
        WebkitBackdropFilter: 'blur(8px)'
      }}
      title={`${name}\n${minutes}:${seconds.toString().padStart(2, '0')} remaining`}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 6px 16px ${color}60`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)'
        e.currentTarget.style.boxShadow = `0 3px 10px ${color}40`
      }}
    >
      <span>{icon}</span>

      {/* Timer overlay */}
      <div style={{
        position: 'absolute',
        bottom: -3,
        right: -3,
        background: color,
        color: 'white',
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 4px',
        borderRadius: 4,
        lineHeight: 1,
        fontFamily: 'monospace',
        border: '2px solid white',
        minWidth: 22,
        textAlign: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
      }}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>

      {/* Progress ring around icon */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
        viewBox="0 0 44 44"
      >
        <circle
          cx="22"
          cy="22"
          r="20"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 20}`}
          strokeDashoffset={`${2 * Math.PI * 20 * (1 - (timeLeft / (isConsumable ? 1800 : 3600)))}`}
          transform="rotate(-90 22 22)"
          opacity={0.8}
        />
      </svg>
    </div>
  )
}

export default function BuffIconBar() {
  const { state } = useGameState()
  const [currentTime, setCurrentTime] = React.useState(Date.now())

  // Update current time every second for countdown
  React.useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Get active rewards (legacy system)
  const activeRewards = (state.activeRewards || []).filter(reward => {
    const startTime = new Date(reward.startedAt).getTime()
    const endTime = startTime + (reward.durationMinutes * 60 * 1000)
    return currentTime < endTime
  })

  // Get active consumables
  const activeConsumables = getActiveConsumables(state.activeConsumables)

  const getRewardIcon = (type: string): string => {
    switch (type) {
      case 'focus_freeze': return '🧊'
      case 'triple_loot': return '💎'
      default: return '🎁'
    }
  }

  const getRewardColor = (type: string): string => {
    switch (type) {
      case 'focus_freeze': return '#4FC3F7'
      case 'triple_loot': return '#9C27B0'
      default: return 'var(--accent)'
    }
  }

  const getConsumableIcon = (consumableId: string): string => {
    const consumable = CONSUMABLES.find(c => c.id === consumableId)
    return consumable?.icon || '🧪'
  }

  const getConsumableColor = (consumableId: string): string => {
    const consumable = CONSUMABLES.find(c => c.id === consumableId)
    switch (consumable?.tier) {
      case 'micro': return '#4CAF50'
      case 'medium': return '#FF9800'
      case 'premium': return '#9C27B0'
      default: return '#666'
    }
  }

  const allBuffs = [
    // Legacy rewards
    ...activeRewards.map(reward => {
      const startTime = new Date(reward.startedAt).getTime()
      const endTime = startTime + (reward.durationMinutes * 60 * 1000)
      const timeLeft = Math.max(0, Math.floor((endTime - currentTime) / 1000))

      return {
        id: reward.id,
        icon: getRewardIcon(reward.type),
        name: reward.name,
        timeLeft,
        color: getRewardColor(reward.type),
        isConsumable: false
      }
    }),
    // Consumables
    ...activeConsumables.map(consumable => {
      const endTime = new Date(consumable.endsAt).getTime()
      const timeLeft = Math.max(0, Math.floor((endTime - currentTime) / 1000))

      return {
        id: consumable.id,
        icon: getConsumableIcon(consumable.consumableId),
        name: consumable.name,
        timeLeft,
        color: getConsumableColor(consumable.consumableId),
        isConsumable: true
      }
    })
  ]

  if (allBuffs.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 80, // Below header
      right: 16,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      maxWidth: 'calc(100vw - 32px)', // Responsive width
      pointerEvents: 'none' // Allow clicks through container
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        pointerEvents: 'auto' // Re-enable for icons
      }}>
        {allBuffs.map(buff => (
          <BuffIcon
            key={buff.id}
            icon={buff.icon}
            name={buff.name}
            timeLeft={buff.timeLeft}
            color={buff.color}
            isConsumable={buff.isConsumable}
          />
        ))}
      </div>
    </div>
  )
}
