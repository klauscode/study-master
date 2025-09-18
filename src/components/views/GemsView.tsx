import React from 'react'
import { useGameState } from '../../context/GameStateContext'
import { calculateXPForNextLevel } from '../../services/experienceService'
import { calculateKnowledgeDecay, getOptimalReviewTime } from '../../services/knowledgeDecayService'

const categoryColors: Record<string, string> = {
  Math: '#3b82f6',
  Science: '#22c55e',
  Language: '#f59e0b',
  Humanities: '#ef4444'
}

const categoryEmojis: Record<string, string> = {
  Math: '📐',
  Science: '🔬',
  Language: '📚',
  Humanities: '🎭'
}

export default function GemsView(){
  const { state, dispatch } = useGameState()
  const [newGemName, setNewGemName] = React.useState('')
  const [newGemCategory, setNewGemCategory] = React.useState<'Math' | 'Science' | 'Language' | 'Humanities'>('Math')
  const [showCreateForm, setShowCreateForm] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<'urgency' | 'name' | 'level' | 'xp'>('urgency')

  const gems = state.gems || []
  const activeGem = gems.find(g => g.id === state.activeGemId)
  const nowISO = new Date().toISOString()

  // Calculate urgency for each gem and sort
  const gemsWithUrgency = React.useMemo(() => {
    return gems.map(gem => {
      const decay = calculateKnowledgeDecay(gem, nowISO)
      const review = getOptimalReviewTime(gem)
      const reviewTime = new Date(review.nextReviewISO).getTime()
      const now = new Date(nowISO).getTime()
      const hoursUntilReview = (reviewTime - now) / (1000 * 60 * 60)

      // Calculate urgency score (lower = more urgent)
      let urgencyScore = 0

      // Heavily weight knowledge decay
      if (decay.isInDangerZone) {
        urgencyScore -= 1000 // Very urgent if losing knowledge
        urgencyScore -= decay.decayPercent * 10 // More urgent with higher decay
      }

      // Factor in when review is due
      if (hoursUntilReview <= 0) {
        urgencyScore -= 500 // Past due for review
      } else if (hoursUntilReview <= 24) {
        urgencyScore -= (24 - hoursUntilReview) * 10 // More urgent as review approaches
      }

      // Factor in last studied time
      if (decay.hoursSinceStudy > 72) {
        urgencyScore -= 200 // Haven't studied in 3+ days
      }

      // Boost higher level gems slightly (more important to maintain)
      urgencyScore -= gem.level * 5

      return {
        ...gem,
        decay,
        review,
        hoursUntilReview,
        urgencyScore
      }
    })
  }, [gems, nowISO])

  // Sort gems based on selected criteria
  const sortedGems = React.useMemo(() => {
    const sorted = [...gemsWithUrgency]

    switch (sortBy) {
      case 'urgency':
        return sorted.sort((a, b) => a.urgencyScore - b.urgencyScore) // Lower score = more urgent
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'level':
        return sorted.sort((a, b) => b.level - a.level) // Higher level first
      case 'xp':
        return sorted.sort((a, b) => b.xp - a.xp) // Higher XP first
      default:
        return sorted
    }
  }, [gemsWithUrgency, sortBy])

  const createGem = () => {
    if (!newGemName.trim()) return

    dispatch({ type: 'CREATE_GEM', name: newGemName.trim(), category: newGemCategory })
    setNewGemName('')
    setShowCreateForm(false)
  }

  const deleteGem = (gemId: string) => {
    if (window.confirm('Are you sure you want to delete this gem?')) {
      dispatch({ type: 'DELETE_GEM', id: gemId })
    }
  }

  const renameGem = (gemId: string) => {
    const newName = window.prompt('Enter new name:')
    if (newName && newName.trim()) {
      dispatch({ type: 'RENAME_GEM', id: gemId, name: newName.trim() })
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30
      }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>💎 Subject Gems</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Sort Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--fg)',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              <option value="urgency">🚨 Urgency</option>
              <option value="name">📝 Name</option>
              <option value="level">⬆️ Level</option>
              <option value="xp">✨ XP</option>
            </select>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-fg)',
              border: 'none',
              borderRadius: 8,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Create New Gem
          </button>
        </div>
      </div>

      {/* Create Gem Form */}
      {showCreateForm && (
        <div style={{
          border: '2px solid var(--accent)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
          background: 'var(--card-bg)'
        }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Create New Gem</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Gem Name
              </label>
              <input
                type="text"
                value={newGemName}
                onChange={e => setNewGemName(e.target.value)}
                placeholder="e.g., Calculus, Biology, Spanish..."
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(['Math', 'Science', 'Language', 'Humanities'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setNewGemCategory(cat)}
                    style={{
                      border: newGemCategory === cat ? `2px solid ${categoryColors[cat]}` : '1px solid var(--border)',
                      borderRadius: 8,
                      padding: 12,
                      background: newGemCategory === cat ? `${categoryColors[cat]}20` : 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{categoryEmojis[cat]}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{cat}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={createGem}
                disabled={!newGemName.trim()}
                style={{
                  background: newGemName.trim() ? 'var(--accent)' : 'var(--bg)',
                  color: newGemName.trim() ? 'var(--accent-fg)' : 'var(--fg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: newGemName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Create Gem
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewGemName('')
                }}
                style={{
                  background: 'none',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Gem Display */}
      {activeGem && (
        <div style={{
          border: `2px solid ${categoryColors[activeGem.category]}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
          background: `${categoryColors[activeGem.category]}10`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>{categoryEmojis[activeGem.category]}</div>
              <div>
                <h3 style={{ margin: 0, color: categoryColors[activeGem.category] }}>
                  {activeGem.name}
                </h3>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {activeGem.category} • Level {activeGem.level}
                </div>
              </div>
            </div>
            <div style={{
              background: categoryColors[activeGem.category],
              color: 'white',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600
            }}>
              ACTIVE
            </div>
          </div>

          {/* XP Progress Bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6
            }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Progress to Level {activeGem.level + 1}</span>
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                {Math.round(activeGem.xp)} / {calculateXPForNextLevel(activeGem.level)} XP
              </span>
            </div>
            <div style={{
              height: 12,
              background: 'var(--bg)',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: `${Math.min(100, (activeGem.xp / calculateXPForNextLevel(activeGem.level)) * 100)}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${categoryColors[activeGem.category]}, ${categoryColors[activeGem.category]}80)`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 12,
            fontSize: 12
          }}>
            <div>
              <div style={{ opacity: 0.7 }}>Total XP</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{Math.round(activeGem.xp)}</div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>Peak XP</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{Math.round(activeGem.peakXP || activeGem.xp)}</div>
            </div>
            {activeGem.lastStudiedISO && (
              <div>
                <div style={{ opacity: 0.7 }}>Last Studied</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {new Date(activeGem.lastStudiedISO).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gems Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16
      }}>
        {sortedGems.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: 60,
            opacity: 0.6
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💎</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>No gems yet</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Create your first subject gem to start tracking study progress
            </div>
          </div>
        ) : (
          sortedGems.map((gem, index) => {
            const isActive = state.activeGemId === gem.id
            const xpProgress = gem.xp / calculateXPForNextLevel(gem.level)

            // Determine urgency level
            let urgencyLevel = 'low'
            let urgencyColor = '#22c55e'
            let urgencyIcon = '🟢'

            if (gem.decay.isInDangerZone || gem.hoursUntilReview <= 0) {
              urgencyLevel = 'critical'
              urgencyColor = '#ef4444'
              urgencyIcon = '🔴'
            } else if (gem.hoursUntilReview <= 24 || gem.decay.hoursSinceStudy > 48) {
              urgencyLevel = 'high'
              urgencyColor = '#f59e0b'
              urgencyIcon = '🟡'
            } else if (gem.hoursUntilReview <= 72 || gem.decay.hoursSinceStudy > 24) {
              urgencyLevel = 'medium'
              urgencyColor = '#3b82f6'
              urgencyIcon = '🔵'
            }

            return (
              <div
                key={gem.id}
                onClick={() => dispatch({ type: 'SET_ACTIVE_GEM', id: gem.id })}
                style={{
                  border: isActive ? `2px solid ${categoryColors[gem.category]}` : `1px solid ${urgencyLevel === 'critical' ? urgencyColor : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: 16,
                  background: isActive ? `${categoryColors[gem.category]}10` : urgencyLevel === 'critical' ? `${urgencyColor}08` : 'var(--card-bg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Urgency Indicator */}
                {sortBy === 'urgency' && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: urgencyColor,
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}>
                    {urgencyIcon} #{index + 1}
                  </div>
                )}

                {/* Gem Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  marginTop: sortBy === 'urgency' ? 16 : 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 20 }}>{categoryEmojis[gem.category]}</div>
                    <div>
                      <div style={{
                        fontWeight: 600,
                        color: categoryColors[gem.category],
                        fontSize: 14
                      }}>
                        {gem.name}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>
                        {gem.category} • Level {gem.level}
                      </div>
                    </div>
                  </div>

                  {/* Action Menu */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        renameGem(gem.id)
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '4px 6px',
                        fontSize: 10,
                        cursor: 'pointer'
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteGem(gem.id)
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid #ef4444',
                        borderRadius: 4,
                        padding: '4px 6px',
                        fontSize: 10,
                        cursor: 'pointer',
                        color: '#ef4444'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 600 }}>
                      Level {gem.level} Progress
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>
                      {Math.round(gem.xp)} / {calculateXPForNextLevel(gem.level)}
                    </span>
                  </div>
                  <div style={{
                    height: 8,
                    background: 'var(--bg)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{
                      width: `${Math.min(100, xpProgress * 100)}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${categoryColors[gem.category]}, ${categoryColors[gem.category]}80)`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{
                    fontSize: 10,
                    textAlign: 'center',
                    marginTop: 2,
                    opacity: 0.8
                  }}>
                    {(xpProgress * 100).toFixed(1)}%
                  </div>
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  fontSize: 10,
                  marginBottom: 8
                }}>
                  <div>
                    <div style={{ opacity: 0.7 }}>Total XP</div>
                    <div style={{ fontWeight: 600 }}>{Math.round(gem.xp)}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.7 }}>Peak XP</div>
                    <div style={{ fontWeight: 600 }}>{Math.round(gem.peakXP || gem.xp)}</div>
                  </div>
                </div>

                {/* Urgency Info */}
                {sortBy === 'urgency' && (
                  <div style={{
                    display: 'grid',
                    gap: 4,
                    fontSize: 9,
                    marginBottom: 8
                  }}>
                    {/* Review Status */}
                    <div style={{
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: gem.hoursUntilReview <= 0 ? 'rgba(239, 68, 68, 0.1)' : gem.hoursUntilReview <= 24 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      color: gem.hoursUntilReview <= 0 ? '#ef4444' : gem.hoursUntilReview <= 24 ? '#f59e0b' : '#22c55e',
                      border: `1px solid ${gem.hoursUntilReview <= 0 ? 'rgba(239, 68, 68, 0.3)' : gem.hoursUntilReview <= 24 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                    }}>
                      {gem.hoursUntilReview <= 0
                        ? `⏰ Review overdue by ${Math.abs(gem.hoursUntilReview).toFixed(1)}h`
                        : `⏰ Review due in ${gem.hoursUntilReview.toFixed(1)}h`
                      }
                    </div>

                    {/* Knowledge Status */}
                    {gem.decay.isInDangerZone && (
                      <div style={{
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}>
                        🧠 Losing {gem.decay.decayPercent.toFixed(1)}% knowledge
                      </div>
                    )}

                    {/* Last studied */}
                    <div style={{
                      opacity: 0.7,
                      fontSize: 8
                    }}>
                      Last studied: {gem.decay.hoursSinceStudy.toFixed(1)}h ago
                    </div>
                  </div>
                )}

                {/* Decay Warning */}
                {gem.decayedXP && gem.decayedXP > 0 && (
                  <div style={{
                    marginTop: 8,
                    padding: '4px 8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 4,
                    fontSize: 10,
                    color: '#ef4444'
                  }}>
                    ⚠️ -{Math.round(gem.decayedXP)} XP lost to forgetting
                  </div>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: categoryColors[gem.category],
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 600
                  }}>
                    ACTIVE
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
