import type { StudyCycleRecord } from '../../types/gameTypes';
import { calculateProgressDebt, getDebtSeverity, calculateCatchUpPlan, calculateDailyTarget } from '../../services/progressDebtService';

interface ProgressDebtTrackerProps {
  cycles: StudyCycleRecord[];
  examDate: string;
  isCompact?: boolean; // For different display modes
}

export default function ProgressDebtTracker({ cycles, examDate, isCompact = false }: ProgressDebtTrackerProps) {
  const debt = calculateProgressDebt(cycles, examDate);
  const severity = getDebtSeverity(debt);
  const catchUp = calculateCatchUpPlan(debt, examDate);
  const dailyTarget = calculateDailyTarget(examDate);

  if (isCompact) {
    return <CompactDebtDisplay debt={debt} severity={severity} />;
  }

  return (
    <div style={{
      border: `2px solid ${severity.color}`,
      borderRadius: 16,
      padding: 20,
      background: 'var(--card-bg)',
      boxShadow: `0 8px 32px ${severity.color}30`
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
          color: severity.color
        }}>
          📊 Progress Debt Tracker
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: severity.color,
          textTransform: 'uppercase',
          background: `${severity.color}20`,
          padding: '4px 8px',
          borderRadius: 6
        }}>
          {severity.level}
        </div>
      </div>

      {/* Debt Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <DebtMetric
          label="Net Debt"
          value={`${debt.netDebt.toFixed(1)}h`}
          color={severity.color}
          description="Hours behind target"
          icon="⚠️"
        />
        <DebtMetric
          label="Current Streak"
          value={`${debt.currentStreak} days`}
          color={debt.currentStreak >= 7 ? '#22c55e' : '#6b7280'}
          description="Days meeting targets"
          icon="🔥"
        />
        <DebtMetric
          label="Exam Readiness"
          value={`${debt.projectedExamReadiness.toFixed(0)}%`}
          color={debt.projectedExamReadiness >= 80 ? '#22c55e' : severity.color}
          description="Current trajectory"
          icon="🎯"
        />
        <DebtMetric
          label="Daily Target"
          value={`${dailyTarget.toFixed(1)}h`}
          color="#3b82f6"
          description="Hours needed/day"
          icon="📚"
        />
      </div>

      {/* Status Message */}
      <div style={{
        padding: 16,
        background: `${severity.color}15`,
        border: `1px solid ${severity.color}40`,
        borderRadius: 12,
        marginBottom: 20,
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: severity.color,
          marginBottom: 4
        }}>
          {severity.message}
        </div>
        {debt.netDebt > 0 && (
          <div style={{
            fontSize: 12,
            opacity: 0.8,
            color: severity.color
          }}>
            You need {catchUp.dailyHoursNeeded.toFixed(1)} hours/day to get back on track
          </div>
        )}
      </div>

      {/* Catch-up Plan */}
      {debt.netDebt > 2 && (
        <div style={{
          padding: 16,
          background: 'var(--bg)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          marginBottom: 20
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 12,
            color: 'var(--accent)'
          }}>
            🎯 Catch-Up Plan
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 12,
            fontSize: 12
          }}>
            <div>
              <span style={{ opacity: 0.7 }}>Daily Hours Needed:</span>
              <div style={{
                fontWeight: 700,
                color: catchUp.feasible ? '#f59e0b' : '#ef4444',
                fontSize: 14
              }}>
                {catchUp.dailyHoursNeeded.toFixed(1)}h
              </div>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>Days to Neutral:</span>
              <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: 14 }}>
                {catchUp.daysToNeutral} days
              </div>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>Intensity:</span>
              <div style={{
                fontWeight: 700,
                color: getIntensityColor(catchUp.intensity),
                fontSize: 14,
                textTransform: 'uppercase'
              }}>
                {catchUp.intensity}
              </div>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>Feasible:</span>
              <div style={{
                fontWeight: 700,
                color: catchUp.feasible ? '#22c55e' : '#ef4444',
                fontSize: 14
              }}>
                {catchUp.feasible ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Days Chart */}
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
          📈 Last 14 Days Performance
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(14, 1fr)',
          gap: 4
        }}>
          {debt.dailyTargets.slice(-14).map((day) => (
            <DayBar key={day.date} day={day} />
          ))}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 10,
          opacity: 0.6
        }}>
          <span>14d ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Worst Day Callout */}
      {debt.worstDay && debt.worstDay.debtHours > 4 && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 8,
          fontSize: 12,
          color: '#ef4444',
          textAlign: 'center'
        }}>
          💥 Worst day: {new Date(debt.worstDay.date).toLocaleDateString()}
          ({debt.worstDay.debtHours.toFixed(1)}h deficit)
        </div>
      )}
    </div>
  );
}

function CompactDebtDisplay({ debt, severity }: { debt: any; severity: any }) {
  if (debt.netDebt <= 1) return null;

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: `2px solid ${severity.color}`,
      borderRadius: 12,
      padding: 12,
      boxShadow: `0 4px 16px ${severity.color}30`,
      minWidth: 200,
      pointerEvents: 'auto'
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: severity.color,
        marginBottom: 4
      }}>
        ⚠️ Study Debt
      </div>
      <div style={{
        fontSize: 16,
        fontWeight: 900,
        color: severity.color,
        marginBottom: 4
      }}>
        {debt.netDebt.toFixed(1)} hours behind
      </div>
      <div style={{
        fontSize: 10,
        opacity: 0.8,
        color: severity.color
      }}>
        {debt.currentStreak} day streak
      </div>
    </div>
  );
}

function DebtMetric({ label, value, color, description, icon }: {
  label: string;
  value: string;
  color: string;
  description: string;
  icon: string;
}) {
  return (
    <div style={{
      background: 'var(--bg)',
      borderRadius: 12,
      padding: 16,
      border: `1px solid ${color}30`,
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: 20,
        marginBottom: 4
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 900,
        color: color,
        marginBottom: 4
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        opacity: 0.8,
        marginBottom: 2
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 10,
        opacity: 0.6
      }}>
        {description}
      </div>
    </div>
  );
}

function DayBar({ day }: { day: any }) {
  const ratio = day.actualHours / day.targetHours;
  const height = Math.max(4, Math.min(40, ratio * 40));

  let color = '#22c55e'; // good
  if (ratio < 0.5) color = '#ef4444'; // bad
  else if (ratio < 0.8) color = '#f59e0b'; // warning
  else if (ratio < 1) color = '#3b82f6'; // close

  return (
    <div style={{
      height: 50,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <div
        style={{
          width: '100%',
          height: height,
          background: color,
          borderRadius: '2px 2px 0 0',
          opacity: day.actualHours === 0 ? 0.3 : 1
        }}
        title={`${day.date}: ${day.actualHours.toFixed(1)}h / ${day.targetHours.toFixed(1)}h`}
      />
      {day.debtHours > 0 && (
        <div style={{
          position: 'absolute',
          top: -8,
          fontSize: 8,
          color: '#ef4444',
          fontWeight: 700
        }}>
          !
        </div>
      )}
    </div>
  );
}

function getIntensityColor(intensity: string): string {
  switch (intensity) {
    case 'light': return '#22c55e';
    case 'moderate': return '#3b82f6';
    case 'intense': return '#f59e0b';
    case 'extreme': return '#ef4444';
    default: return '#6b7280';
  }
}