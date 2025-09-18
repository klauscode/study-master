import { useState, useMemo } from 'react';
import type { StudyCycleRecord } from '../../types/gameTypes';
import { calculateStudyDebt, generateDebtProjection, type StudyDebt } from '../../services/studyDebtCalculatorService';

interface StudyDebtCalculatorProps {
  cycles: StudyCycleRecord[];
  examDate: string;
  isCompact?: boolean;
}

export default function StudyDebtCalculator({
  cycles,
  examDate,
  isCompact = false
}: StudyDebtCalculatorProps) {
  const [targetDailyHours, setTargetDailyHours] = useState(8);

  // Memoize the debt calculation to ensure it updates when dependencies change
  const debt = useMemo(() => {
    return calculateStudyDebt(cycles, examDate, targetDailyHours);
  }, [cycles, examDate, targetDailyHours]);

  const projections = useMemo(() => {
    return generateDebtProjection(cycles, examDate, targetDailyHours, 14);
  }, [cycles, examDate, targetDailyHours]);

  if (isCompact) {
    return <CompactDebtDisplay debt={debt} />;
  }

  const getDebtColor = (level: string) => {
    switch (level) {
      case 'manageable': return '#22c55e';
      case 'concerning': return '#f59e0b';
      case 'critical': return '#dc2626';
      case 'catastrophic': return '#7c2d12';
      default: return '#6b7280';
    }
  };

  const getDebtIcon = (level: string) => {
    switch (level) {
      case 'manageable': return '✅';
      case 'concerning': return '⚠️';
      case 'critical': return '🚨';
      case 'catastrophic': return '💀';
      default: return '❓';
    }
  };

  return (
    <div style={{
      border: `2px solid ${getDebtColor(debt.debtLevel)}`,
      borderRadius: 16,
      padding: 20,
      background: 'var(--card-bg)',
      boxShadow: `0 8px 32px ${getDebtColor(debt.debtLevel)}30`
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 800,
          color: getDebtColor(debt.debtLevel),
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          💳 Study Debt Calculator
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Target Daily Hours:</label>
          <input
            type="number"
            min="1"
            max="16"
            step="0.5"
            value={targetDailyHours}
            onChange={(e) => setTargetDailyHours(Number(e.target.value))}
            style={{
              width: 60,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--fg)'
            }}
          />
        </div>
      </div>

      {/* Debt Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <DebtMetric
          label="Total Study Debt"
          value={`${debt.compoundedDebt.toFixed(1)}h`}
          subtitle={`${debt.totalDebtHours.toFixed(1)}h base + penalties`}
          color={getDebtColor(debt.debtLevel)}
          icon="💳"
        />
        <DebtMetric
          label="Debt Level"
          value={debt.debtLevel.toUpperCase()}
          subtitle={`${getDebtIcon(debt.debtLevel)} Current severity`}
          color={getDebtColor(debt.debtLevel)}
          icon={getDebtIcon(debt.debtLevel)}
        />
        <DebtMetric
          label="Recovery Time"
          value={debt.timeToZeroDebt === Infinity ? '∞' : `${Math.ceil(debt.timeToZeroDebt)} days`}
          subtitle="At current pace"
          color={debt.timeToZeroDebt > 30 ? '#dc2626' : '#22c55e'}
          icon="⏰"
        />
        <DebtMetric
          label="Required Daily"
          value={`${debt.recommendedDailyHours.toFixed(1)}h`}
          subtitle="To clear debt by exam"
          color={debt.recommendedDailyHours > 12 ? '#dc2626' : '#f59e0b'}
          icon="🎯"
        />
      </div>

      {/* Reality Check */}
      <div style={{
        background: `${getDebtColor(debt.debtLevel)}10`,
        border: `2px solid ${getDebtColor(debt.debtLevel)}30`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: getDebtColor(debt.debtLevel),
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          🔍 Reality Check
        </div>
        <div style={{
          fontSize: 13,
          lineHeight: 1.4
        }}>
          {debt.probabilityCalculation.realityCheckMessage}
        </div>
      </div>

      {/* Probability Scenarios */}
      <div style={{
        marginBottom: 20
      }}>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 16,
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          📊 Exam Probability Analysis
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12
        }}>
          <ProbabilityCard
            title="Current Trajectory"
            probability={debt.probabilityCalculation.currentTrajectory}
            isHighlighted={true}
          />
          <ProbabilityCard
            title="Minimum Effort"
            probability={debt.probabilityCalculation.withMinimumEffort}
          />
          <ProbabilityCard
            title="Recommended Effort"
            probability={debt.probabilityCalculation.withRecommendedEffort}
          />
          <ProbabilityCard
            title="Intensive Effort"
            probability={debt.probabilityCalculation.withIntenseEffort}
          />
        </div>
      </div>

      {/* Outcome Scenarios */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <OutcomeCard
          title="Most Likely"
          message={debt.probabilityCalculation.mostLikelyOutcome}
          color="#3b82f6"
          icon="📈"
        />
        <OutcomeCard
          title="Worst Case"
          message={debt.probabilityCalculation.worstCaseScenario}
          color="#dc2626"
          icon="💀"
        />
        <OutcomeCard
          title="Best Case"
          message={debt.probabilityCalculation.bestCaseScenario}
          color="#22c55e"
          icon="🏆"
        />
      </div>

      {/* Debt Projection Chart */}
      <div style={{
        background: 'var(--bg)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid var(--border)'
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
          color: 'var(--accent)'
        }}>
          📈 14-Day Debt Projection
        </div>
        <DebtProjectionChart projections={projections} />
      </div>
    </div>
  );
}

function DebtMetric({ label, value, subtitle, color, icon }: {
  label: string;
  value: string;
  subtitle: string;
  color: string;
  icon: string;
}) {
  return (
    <div style={{
      background: 'var(--bg)',
      borderRadius: 12,
      padding: 16,
      border: `2px solid ${color}30`,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{
        fontSize: 16,
        fontWeight: 800,
        color: color,
        marginBottom: 4
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11,
        opacity: 0.8,
        fontWeight: 600
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 10,
        opacity: 0.6,
        marginTop: 2
      }}>
        {subtitle}
      </div>
    </div>
  );
}

function ProbabilityCard({ title, probability, isHighlighted = false }: {
  title: string;
  probability: any;
  isHighlighted?: boolean;
}) {
  const getPassColor = (chance: number) => {
    if (chance < 30) return '#dc2626';
    if (chance < 50) return '#f59e0b';
    if (chance < 70) return '#3b82f6';
    return '#22c55e';
  };

  const passColor = getPassColor(probability.passChance);

  return (
    <div style={{
      background: isHighlighted ? `${passColor}10` : 'var(--bg)',
      border: `2px solid ${isHighlighted ? passColor : 'var(--border)'}`,
      borderRadius: 8,
      padding: 12
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 8,
        color: isHighlighted ? passColor : 'var(--fg)'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 800,
        color: passColor,
        marginBottom: 4
      }}>
        {probability.passChance.toFixed(0)}% pass
      </div>
      <div style={{
        fontSize: 11,
        opacity: 0.8,
        marginBottom: 6
      }}>
        Score: {probability.scoreRange.min}-{probability.scoreRange.max}%
      </div>
      <div style={{
        fontSize: 10,
        background: `${passColor}20`,
        color: passColor,
        padding: '2px 6px',
        borderRadius: 4,
        marginBottom: 4,
        fontWeight: 600
      }}>
        {probability.requiredDailyHours.toFixed(1)}h/day required
      </div>
      <div style={{
        fontSize: 9,
        opacity: 0.6
      }}>
        {probability.scenario}
      </div>
    </div>
  );
}

function OutcomeCard({ title, message, color, icon }: {
  title: string;
  message: string;
  color: string;
  icon: string;
}) {
  return (
    <div style={{
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: 8,
      padding: 12
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: color,
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        {icon} {title}
      </div>
      <div style={{
        fontSize: 11,
        lineHeight: 1.4
      }}>
        {message}
      </div>
    </div>
  );
}

function DebtProjectionChart({ projections }: { projections: any[] }) {
  const maxDebt = Math.max(...projections.map(p => p.cumulativeDeficit));

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      justifyContent: 'center',
      alignItems: 'flex-end',
      padding: '10px 0',
      minHeight: 80
    }}>
      {projections.map((proj, index) => {
        const height = Math.max(4, (proj.cumulativeDeficit / Math.max(1, maxDebt)) * 60);
        const isIncreasing = index === 0 || proj.cumulativeDeficit > projections[index - 1].cumulativeDeficit;

        return (
          <div
            key={proj.date}
            title={`${proj.date}\nDebt: ${proj.cumulativeDeficit.toFixed(1)}h\nDaily: ${proj.debtChangeRate.toFixed(1)}h`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4
            }}
          >
            <div style={{
              width: 12,
              height: `${height}px`,
              background: isIncreasing ?
                'linear-gradient(180deg, #dc2626, #7c2d12)' :
                'linear-gradient(180deg, #22c55e, #16a34a)',
              borderRadius: '2px 2px 0 0',
              border: `1px solid ${isIncreasing ? '#dc2626' : '#22c55e'}`
            }} />
            <div style={{
              fontSize: 8,
              opacity: 0.6,
              transform: 'rotate(-45deg)',
              transformOrigin: 'center',
              whiteSpace: 'nowrap'
            }}>
              {index % 3 === 0 ? new Date(proj.date).getDate() : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompactDebtDisplay({ debt }: { debt: StudyDebt }) {
  const getDebtColor = (level: string) => {
    switch (level) {
      case 'manageable': return '#22c55e';
      case 'concerning': return '#f59e0b';
      case 'critical': return '#dc2626';
      case 'catastrophic': return '#7c2d12';
      default: return '#6b7280';
    }
  };

  const getDebtIcon = (level: string) => {
    switch (level) {
      case 'manageable': return '✅';
      case 'concerning': return '⚠️';
      case 'critical': return '🚨';
      case 'catastrophic': return '💀';
      default: return '❓';
    }
  };

  // Don't show if no debt exists, debt is manageable, or message indicates no exam date
  if (debt.compoundedDebt <= 0.1 ||
      debt.debtLevel === 'manageable' ||
      debt.probabilityCalculation.realityCheckMessage.includes('Set your exam date') ||
      debt.probabilityCalculation.realityCheckMessage.includes('No study debt')) {
    return null;
  }

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: `2px solid ${getDebtColor(debt.debtLevel)}`,
      borderRadius: 12,
      padding: 12,
      boxShadow: `0 4px 16px ${getDebtColor(debt.debtLevel)}40`,
      minWidth: 200,
      pointerEvents: 'auto'
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: getDebtColor(debt.debtLevel),
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        {getDebtIcon(debt.debtLevel)} Study Debt
      </div>

      <div style={{
        fontSize: 14,
        fontWeight: 800,
        marginBottom: 4
      }}>
        {debt.compoundedDebt.toFixed(1)}h Owed
      </div>

      <div style={{
        fontSize: 11,
        opacity: 0.8,
        marginBottom: 8
      }}>
        {debt.probabilityCalculation.currentTrajectory.passChance.toFixed(0)}% pass chance
      </div>

      <div style={{
        fontSize: 10,
        background: `${getDebtColor(debt.debtLevel)}20`,
        padding: 6,
        borderRadius: 4,
        color: getDebtColor(debt.debtLevel),
        fontWeight: 600
      }}>
        Need {debt.recommendedDailyHours.toFixed(1)}h/day
      </div>
    </div>
  );
}
