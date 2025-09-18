import type { StudyCycleRecord, MockExamScore } from '../../types/gameTypes';
import { calculatePersonalCompetition } from '../../services/personalCompetitionService';

interface PersonalCompetitionTrackerProps {
  cycles: StudyCycleRecord[];
  mockExams: MockExamScore[];
  isCompact?: boolean;
}

export default function PersonalCompetitionTracker({
  cycles,
  isCompact = false
}: PersonalCompetitionTrackerProps) {
  const competition = calculatePersonalCompetition(cycles);

  if (isCompact) {
    return <CompactCompetitionDisplay competition={competition} />;
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'accelerating': return '#059669';
      case 'improving': return '#22c55e';
      case 'stable': return '#3b82f6';
      case 'declining': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'accelerating': return '🚀';
      case 'improving': return '📈';
      case 'stable': return '➡️';
      case 'declining': return '📉';
      default: return '❓';
    }
  };

  return (
    <div style={{
      border: `2px solid ${getTrendColor(competition.improvementTrend)}`,
      borderRadius: 16,
      padding: 20,
      background: 'var(--card-bg)',
      boxShadow: `0 8px 32px ${getTrendColor(competition.improvementTrend)}30`
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
          color: getTrendColor(competition.improvementTrend),
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          🏆 Personal Competition
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          color: getTrendColor(competition.improvementTrend)
        }}>
          {getTrendIcon(competition.improvementTrend)}
          <span style={{ textTransform: 'capitalize' }}>{competition.improvementTrend}</span>
        </div>
      </div>

      {/* Competition Progress Bars */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <CompetitionBar
          label="Daily Hours"
          current={competition.todayHours}
          best={competition.bestDailyHours}
          progress={competition.dailyProgress}
          unit="h"
          icon="📅"
        />
        <CompetitionBar
          label="Study Streak"
          current={competition.currentStreak}
          best={competition.bestStreak}
          progress={competition.streakProgress}
          unit="days"
          icon="🔥"
        />
        <CompetitionBar
          label="Weekly Hours"
          current={competition.thisWeekHours}
          best={competition.bestWeeklyHours}
          progress={competition.weeklyProgress}
          unit="h"
          icon="📊"
        />
        <CompetitionBar
          label="Focus Average"
          current={competition.recentFocusAverage}
          best={competition.bestFocusAverage}
          progress={competition.focusProgress}
          unit="x"
          icon="🎯"
          precision={3}
        />
        <CompetitionBar
          label="XP Rate"
          current={competition.currentXPRate}
          best={competition.bestXPRate}
          progress={competition.xpRateProgress}
          unit="/h"
          icon="⚡"
          precision={1}
        />
      </div>

      {/* Performance Trends */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <TrendMetric
          label="vs Last Week"
          value={competition.thisVsLastWeek}
          icon="📈"
        />
        <TrendMetric
          label="vs Last Month"
          value={competition.thisVsLastMonth}
          icon="📊"
        />
        <RecordMetric
          label="Days Since Record"
          value={competition.daysSinceLastRecord}
          icon="⏰"
          isGood={competition.daysSinceLastRecord <= 7}
        />
        <RecordMetric
          label="Records This Month"
          value={competition.recordsThisMonth}
          icon="🏅"
          isGood={competition.recordsThisMonth >= 1}
        />
      </div>

      {/* Recent Achievements */}
      {competition.recentAchievements.length > 0 && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '2px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#22c55e',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            🎉 Recent Personal Records ({competition.recentAchievements.length})
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            {competition.recentAchievements.map((achievement, index) => (
              <AchievementCard key={index} achievement={achievement} />
            ))}
          </div>
        </div>
      )}

      {/* All-Time Records */}
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
          color: 'var(--accent)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          🏆 All-Time Personal Records
          <span style={{
            fontSize: 12,
            opacity: 0.7,
            fontWeight: 600
          }}>
            {competition.personalRecords.length} total
          </span>
        </div>

        {competition.personalRecords.length === 0 ? (
          <div style={{
            padding: 20,
            textAlign: 'center',
            opacity: 0.7,
            fontSize: 13
          }}>
            <div style={{ marginBottom: 8 }}>No personal records yet.</div>
            <div>Keep studying to set your first records!</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 8
          }}>
            {competition.personalRecords.slice(0, 6).map((record, index) => (
              <RecordCard key={index} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompetitionBar({
  label,
  current,
  best,
  progress,
  unit,
  icon,
  precision = 1
}: {
  label: string;
  current: number;
  best: number;
  progress: number;
  unit: string;
  icon: string;
  precision?: number;
}) {
  const percentage = Math.min(100, progress * 100);
  const isNewRecord = progress >= 1;
  const isClose = progress >= 0.8;

  return (
    <div style={{
      background: 'var(--bg)',
      borderRadius: 12,
      padding: 16,
      border: `2px solid ${isNewRecord ? '#22c55e' : isClose ? '#f59e0b' : 'var(--border)'}`,
      position: 'relative'
    }}>
      {isNewRecord && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: -8,
          background: '#22c55e',
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
          ✓
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
      }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          opacity: 0.8
        }}>
          {label}
        </span>
      </div>

      <div style={{
        fontSize: 18,
        fontWeight: 900,
        color: isNewRecord ? '#22c55e' : 'var(--fg)',
        marginBottom: 4
      }}>
        {current.toFixed(precision)}{unit}
      </div>

      <div style={{
        fontSize: 10,
        opacity: 0.6,
        marginBottom: 8
      }}>
        Best: {best.toFixed(precision)}{unit}
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: 6,
        background: 'var(--border)',
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: isNewRecord ? '#22c55e' : isClose ? '#f59e0b' : '#3b82f6',
          borderRadius: 3,
          transition: 'all 0.5s ease'
        }} />
      </div>

      <div style={{
        fontSize: 9,
        marginTop: 4,
        textAlign: 'center',
        color: isNewRecord ? '#22c55e' : isClose ? '#f59e0b' : 'inherit',
        fontWeight: 600
      }}>
        {percentage.toFixed(0)}% of record
      </div>
    </div>
  );
}

function TrendMetric({ label, value, icon }: {
  label: string;
  value: number;
  icon: string;
}) {
  const isPositive = value > 0;
  const color = isPositive ? '#22c55e' : value < -5 ? '#ef4444' : '#6b7280';

  return (
    <div style={{
      background: 'var(--bg)',
      borderRadius: 8,
      padding: 12,
      border: `1px solid ${color}30`,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
      <div style={{
        fontSize: 14,
        fontWeight: 800,
        color: color,
        marginBottom: 2
      }}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </div>
      <div style={{
        fontSize: 10,
        opacity: 0.8,
        fontWeight: 600
      }}>
        {label}
      </div>
    </div>
  );
}

function RecordMetric({ label, value, icon, isGood }: {
  label: string;
  value: number;
  icon: string;
  isGood: boolean;
}) {
  const color = isGood ? '#22c55e' : '#f59e0b';

  return (
    <div style={{
      background: 'var(--bg)',
      borderRadius: 8,
      padding: 12,
      border: `1px solid ${color}30`,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
      <div style={{
        fontSize: 14,
        fontWeight: 800,
        color: color,
        marginBottom: 2
      }}>
        {value === Infinity ? '∞' : value}
      </div>
      <div style={{
        fontSize: 10,
        opacity: 0.8,
        fontWeight: 600
      }}>
        {label}
      </div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: any }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily_hours': return '📅';
      case 'weekly_hours': return '📊';
      case 'focus_average': return '🎯';
      case 'study_streak': return '🔥';
      case 'xp_rate': return '⚡';
      default: return '🏆';
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 8,
      background: 'rgba(34, 197, 94, 0.05)',
      borderRadius: 6,
      border: '1px solid rgba(34, 197, 94, 0.2)'
    }}>
      <div style={{ fontSize: 20 }}>
        {getTypeIcon(achievement.type)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#22c55e'
        }}>
          New Personal Record!
        </div>
        <div style={{
          fontSize: 11,
          opacity: 0.8
        }}>
          {achievement.context}
        </div>
      </div>
      <div style={{
        fontSize: 10,
        opacity: 0.6
      }}>
        {new Date(achievement.dateISO).toLocaleDateString()}
      </div>
    </div>
  );
}

function RecordCard({ record }: { record: any }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily_hours': return '📅';
      case 'weekly_hours': return '📊';
      case 'focus_average': return '🎯';
      case 'study_streak': return '🔥';
      case 'xp_rate': return '⚡';
      default: return '🏆';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily_hours': return 'Daily Hours';
      case 'weekly_hours': return 'Weekly Hours';
      case 'focus_average': return 'Focus Average';
      case 'study_streak': return 'Study Streak';
      case 'xp_rate': return 'XP Rate';
      default: return type;
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: 8,
      background: 'var(--card-bg)',
      borderRadius: 6,
      border: '1px solid var(--border)'
    }}>
      <div style={{ fontSize: 16 }}>
        {getTypeIcon(record.type)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          marginBottom: 2
        }}>
          {getTypeLabel(record.type)}
        </div>
        <div style={{
          fontSize: 10,
          opacity: 0.8
        }}>
          {record.context}
        </div>
      </div>
      <div style={{
        fontSize: 9,
        opacity: 0.6
      }}>
        {new Date(record.dateISO).toLocaleDateString()}
      </div>
    </div>
  );
}

function CompactCompetitionDisplay({ competition }: { competition: any }) {
  if (competition.recentAchievements.length === 0 && competition.daysSinceLastRecord > 7) {
    return null; // Don't show if no recent activity
  }

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '2px solid #22c55e',
      borderRadius: 12,
      padding: 12,
      boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
      minWidth: 200,
      pointerEvents: 'auto'
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#22c55e',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}>
        🏆 Competition Status
      </div>

      {competition.recentAchievements.length > 0 ? (
        <div>
          <div style={{
            fontSize: 14,
            fontWeight: 800,
            color: '#22c55e',
            marginBottom: 4
          }}>
            {competition.recentAchievements.length} New Record{competition.recentAchievements.length > 1 ? 's' : ''}!
          </div>
          <div style={{
            fontSize: 10,
            opacity: 0.8
          }}>
            You're on fire! 🔥
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            fontSize: 14,
            fontWeight: 800,
            color: '#f59e0b',
            marginBottom: 4
          }}>
            {competition.daysSinceLastRecord} days since record
          </div>
          <div style={{
            fontSize: 10,
            opacity: 0.8,
            color: '#f59e0b'
          }}>
            Time to beat your best! 💪
          </div>
        </div>
      )}
    </div>
  );
}
