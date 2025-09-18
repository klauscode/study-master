import type { SubjectGem } from '../../types/gameTypes';
import { calculateKnowledgeDecay } from '../../services/knowledgeDecayService';
import { calculateXPForNextLevel } from '../../services/experienceService';

interface GemDecayIndicatorProps {
  gem: SubjectGem;
  showDetails?: boolean;
}

export default function GemDecayIndicator({ gem, showDetails = false }: GemDecayIndicatorProps) {
  const decay = calculateKnowledgeDecay(gem, new Date().toISOString());

  if (decay.decayPercent === 0) {
    return showDetails ? (
      <div style={{
        fontSize: 11,
        color: '#22c55e',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}>
        ✨ Fresh Knowledge
      </div>
    ) : null;
  }

  const getDecayColor = (percent: number) => {
    if (percent < 5) return '#f59e0b'; // yellow warning
    if (percent < 15) return '#ef4444'; // red danger
    return '#7c2d12'; // dark red critical
  };

  const getDecayIcon = (percent: number) => {
    if (percent < 5) return '⚠️';
    if (percent < 15) return '🔥';
    return '💀';
  };

  const decayColor = getDecayColor(decay.decayPercent);
  const decayIcon = getDecayIcon(decay.decayPercent);

  return (
    <div style={{
      fontSize: showDetails ? 12 : 10,
      color: decayColor,
      fontWeight: 600,
      display: 'flex',
      alignItems: showDetails ? 'flex-start' : 'center',
      gap: 4,
      flexDirection: showDetails ? 'column' : 'row'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{decayIcon}</span>
        <span>-{decay.decayPercent.toFixed(1)}% decayed</span>
      </div>

      {showDetails && (
        <div style={{
          fontSize: 10,
          opacity: 0.8,
          marginTop: 4
        }}>
          {decay.hoursSinceStudy >= 24
            ? `${Math.floor(decay.hoursSinceStudy / 24)}d ${Math.floor(decay.hoursSinceStudy % 24)}h ago`
            : `${Math.floor(decay.hoursSinceStudy)}h ago`
          }
          {decay.recoveryStudyHours > 0 && (
            <div style={{ marginTop: 2 }}>
              📚 ~{decay.recoveryStudyHours}h to recover
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component for the XP bar with decay visualization
export function GemXPBarWithDecay({ gem }: { gem: SubjectGem }) {
  const decay = calculateKnowledgeDecay(gem, new Date().toISOString());
  const nextLevelXP = calculateXPForNextLevel(gem.level);
  const effectiveXP = decay.currentEffectiveXP;
  const totalXP = gem.xp;

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        width: '100%',
        height: 8,
        background: 'var(--border)',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Total XP bar (faded if decayed) */}
        <div
          style={{
            width: `${Math.min(100, (totalXP / nextLevelXP) * 100)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #6b7280, #9ca3af)',
            opacity: decay.decayPercent > 0 ? 0.4 : 0,
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />

        {/* Effective XP bar */}
        <div
          style={{
            width: `${Math.min(100, (effectiveXP / nextLevelXP) * 100)}%`,
            height: '100%',
            background: decay.isInDangerZone
              ? 'linear-gradient(90deg, #ef4444, #f87171)'
              : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            position: 'absolute',
            top: 0,
            left: 0,
            transition: 'all 0.5s ease'
          }}
        />

        {/* Decay indicator overlay */}
        {decay.decayPercent > 0 && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              height: '100%',
              width: `${(decay.decayedAmount / totalXP) * 100}%`,
              background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(239, 68, 68, 0.3) 2px, rgba(239, 68, 68, 0.3) 4px)',
              borderLeft: '1px solid #ef4444'
            }}
          />
        )}
      </div>

      <div style={{
        fontSize: 10,
        marginTop: 4,
        display: 'flex',
        justifyContent: 'space-between',
        opacity: 0.7
      }}>
        <span>{Math.round(effectiveXP)}/{nextLevelXP} XP</span>
        {decay.decayPercent > 0 && (
          <span style={{ color: '#ef4444' }}>
            (-{Math.round(decay.decayedAmount)})
          </span>
        )}
      </div>
    </div>
  );
}
