import type { SubjectGem } from '../../types/gameTypes';
import { getOptimalReviewTime, calculateKnowledgeDecay, SPACED_REPETITION_INTERVALS } from '../../services/knowledgeDecayService';

interface SpacedRepetitionAlertsProps {
  gems: SubjectGem[];
  onGemSelect: (gemId: string) => void;
}

export default function SpacedRepetitionAlerts({ gems, onGemSelect }: SpacedRepetitionAlertsProps) {
  const now = new Date();
  const nowISO = now.toISOString();

  // Get gems that need review
  const reviewGems = gems
    .map(gem => {
      const optimal = getOptimalReviewTime(gem);
      const reviewTime = new Date(optimal.nextReviewISO);
      const decay = calculateKnowledgeDecay(gem, nowISO);
      const hoursUntilReview = (reviewTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isOverdue = hoursUntilReview <= 0;
      const isUpcoming = hoursUntilReview > 0 && hoursUntilReview <= 2; // 2 hour warning

      return {
        ...gem,
        optimal,
        decay,
        hoursUntilReview,
        isOverdue,
        isUpcoming,
        needsReview: isOverdue || isUpcoming
      };
    })
    .filter(gem => gem.needsReview)
    .sort((a, b) => a.hoursUntilReview - b.hoursUntilReview); // Most urgent first

  if (reviewGems.length === 0) {
    return null;
  }

  const urgentCount = reviewGems.filter(g => g.isOverdue).length;
  const upcomingCount = reviewGems.filter(g => g.isUpcoming).length;

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      width: 320,
      maxHeight: '80vh',
      overflowY: 'auto',
      background: 'var(--card-bg)',
      border: '2px solid #ef4444',
      borderRadius: 16,
      padding: 16,
      boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
      zIndex: 1000,
      animation: urgentCount > 0 ? 'pulse 2s infinite' : 'none'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        fontSize: 14,
        fontWeight: 700,
        color: '#ef4444'
      }}>
        <span style={{ fontSize: 16 }}>🧠</span>
        <span>Spaced Repetition Alert</span>
        {urgentCount > 0 && (
          <span style={{
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 900
          }}>
            {urgentCount}
          </span>
        )}
      </div>

      {/* Summary */}
      <div style={{
        fontSize: 12,
        marginBottom: 16,
        padding: 12,
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 8,
        border: '1px solid rgba(239, 68, 68, 0.2)'
      }}>
        {urgentCount > 0 && (
          <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>
            🚨 {urgentCount} subject{urgentCount > 1 ? 's' : ''} OVERDUE for review!
          </div>
        )}
        {upcomingCount > 0 && (
          <div style={{ color: '#f59e0b', fontWeight: 600 }}>
            ⏰ {upcomingCount} subject{upcomingCount > 1 ? 's' : ''} need review soon
          </div>
        )}
      </div>

      {/* Review Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reviewGems.map(gem => (
          <div
            key={gem.id}
            onClick={() => onGemSelect(gem.id)}
            style={{
              padding: 12,
              background: gem.isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `2px solid ${gem.isOverdue ? '#ef4444' : '#f59e0b'}`,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = `0 4px 16px ${gem.isOverdue ? '#ef4444' : '#f59e0b'}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Urgency Indicator */}
            {gem.isOverdue && (
              <div style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 900,
                animation: 'pulse 1s infinite'
              }}>
                !
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 8
            }}>
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: gem.isOverdue ? '#ef4444' : '#f59e0b',
                  marginBottom: 2
                }}>
                  {gem.name}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  {gem.category} • Level {gem.level}
                </div>
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: gem.isOverdue ? '#ef4444' : '#f59e0b'
              }}>
                {gem.isOverdue ? 'OVERDUE' : 'SOON'}
              </div>
            </div>

            {/* Timing Information */}
            <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 8 }}>
              {gem.isOverdue ? (
                <span style={{ color: '#ef4444' }}>
                  ⏰ {Math.abs(Math.round(gem.hoursUntilReview))}h overdue
                </span>
              ) : (
                <span style={{ color: '#f59e0b' }}>
                  ⏰ Review in {Math.round(gem.hoursUntilReview)}h
                </span>
              )}
            </div>

            {/* Interval Information */}
            <div style={{
              fontSize: 9,
              opacity: 0.6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>
                Interval #{gem.optimal.intervalIndex + 1}
                ({SPACED_REPETITION_INTERVALS[gem.optimal.intervalIndex]}h)
              </span>
              {gem.decay.decayPercent > 0 && (
                <span style={{ color: '#ef4444' }}>
                  -{gem.decay.decayPercent.toFixed(1)}% decayed
                </span>
              )}
            </div>

            {/* Call to Action */}
            <div style={{
              marginTop: 8,
              padding: 6,
              background: gem.isOverdue ? '#ef4444' : '#f59e0b',
              color: 'white',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              textAlign: 'center',
              textTransform: 'uppercase'
            }}>
              {gem.isOverdue ? '🚨 Study Now!' : '📚 Review Soon'}
            </div>
          </div>
        ))}
      </div>

      {/* Science Note */}
      <div style={{
        marginTop: 16,
        padding: 8,
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 6,
        fontSize: 9,
        opacity: 0.8,
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        💡 Spaced repetition optimizes long-term retention.
        Studying at these intervals maximizes memory consolidation.
      </div>
    </div>
  );
}

// Add the pulse animation via CSS-in-JS
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;
document.head.appendChild(style);