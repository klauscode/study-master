import React from 'react'
import { useGameState } from '../../context/GameStateContext'
import type { ActiveReward } from '../../types/gameTypes'

export default function ActiveRewardsPanel() {
  const { state } = useGameState()
  const [currentTime, setCurrentTime] = React.useState(Date.now())

  // Update current time every second for countdown
  React.useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const activeRewards = (state.activeRewards || []).filter(reward => {
    const startTime = new Date(reward.startedAt).getTime()
    const endTime = startTime + (reward.durationMinutes * 60 * 1000)
    return currentTime < endTime
  })

  if (activeRewards.length === 0) return null

  const formatTimeRemaining = (reward: ActiveReward): string => {
    const startTime = new Date(reward.startedAt).getTime()
    const endTime = startTime + (reward.durationMinutes * 60 * 1000)
    const remaining = Math.max(0, endTime - currentTime)
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

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

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: 14, opacity: 0.9 }}>
        🎉 Active Rewards
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activeRewards.map(reward => (
          <div
            key={reward.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg)',
              border: `1px solid ${getRewardColor(reward.type)}`,
              borderRadius: 6,
              padding: 8,
              fontSize: 13
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{getRewardIcon(reward.type)}</span>
              <div>
                <div style={{ fontWeight: 600, color: getRewardColor(reward.type) }}>
                  {reward.name}
                </div>
                {reward.type === 'focus_freeze' && (
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    Focus decay is frozen
                  </div>
                )}
                {reward.type === 'triple_loot' && (
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    3x loot from study cycles
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: getRewardColor(reward.type),
              color: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'monospace'
            }}>
              {formatTimeRemaining(reward)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}