import type { StudyCycleRecord, MockExamScore } from '../../types/gameTypes';
import { calculateUnicampBenchmark, getUnicampHistoricalData, getMilestoneStatus, type BenchmarkAnalysis } from '../../services/unicampBenchmarkService';

interface UnicampBenchmarkDisplayProps {
  cycles: StudyCycleRecord[];
  mockExams: MockExamScore[];
  examDate: string;
  isCompact?: boolean;
}

export default function UnicampBenchmarkDisplay({
  cycles,
  mockExams,
  examDate,
  isCompact = false
}: UnicampBenchmarkDisplayProps) {
  const benchmark = calculateUnicampBenchmark(cycles, mockExams, examDate);
  const historicalData = getUnicampHistoricalData();
  const daysLeft = Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const milestoneStatus = getMilestoneStatus(daysLeft, mockExams.length > 0 ? mockExams[mockExams.length - 1].percentage : 0);

  if (isCompact) {
    return <CompactBenchmarkDisplay benchmark={benchmark} daysLeft={daysLeft} />;
  }

  const getComparisonColor = (comparison: string) => {
    switch (comparison) {
      case 'exceptional': return '#059669';
      case 'ahead': return '#22c55e';
      case 'on_track': return '#3b82f6';
      case 'behind': return '#f59e0b';
      case 'far_behind': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'very_likely_pass': return '#059669';
      case 'likely_pass': return '#22c55e';
      case 'uncertain': return '#f59e0b';
      case 'likely_fail': return '#dc2626';
      case 'very_likely_fail': return '#7c2d12';
      default: return '#6b7280';
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'very_likely_pass': return '🏆';
      case 'likely_pass': return '✅';
      case 'uncertain': return '⚠️';
      case 'likely_fail': return '🚨';
      case 'very_likely_fail': return '💀';
      default: return '❓';
    }
  };

  return (
    <div style={{
      border: `2px solid ${getComparisonColor(benchmark.comparison)}`,
      borderRadius: 16,
      padding: 20,
      background: 'var(--card-bg)',
      boxShadow: `0 8px 32px ${getComparisonColor(benchmark.comparison)}30`
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
          color: getComparisonColor(benchmark.comparison),
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          🎓 Unicamp Benchmark Analysis
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          color: getComparisonColor(benchmark.comparison)
        }}>
          #{benchmark.userRank} Percentile
        </div>
      </div>

      {/* Performance Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <PerformanceMetric
          label="Study Intensity"
          value={`${benchmark.dailyHoursVsMedian > 0 ? '+' : ''}${benchmark.dailyHoursVsMedian.toFixed(0)}%`}
          subtitle="vs Median Successful"
          color={benchmark.dailyHoursVsMedian >= 0 ? '#22c55e' : '#dc2626'}
          icon="📊"
        />
        <PerformanceMetric
          label="Elite Comparison"
          value={`${benchmark.dailyHoursVsTop10 > 0 ? '+' : ''}${benchmark.dailyHoursVsTop10.toFixed(0)}%`}
          subtitle="vs Top 10%"
          color={benchmark.dailyHoursVsTop10 >= -20 ? '#22c55e' : '#dc2626'}
          icon="👑"
        />
        <PerformanceMetric
          label="Projected Outcome"
          value={benchmark.projectedOutcome.replace(/_/g, ' ').toUpperCase()}
          subtitle={`${getOutcomeIcon(benchmark.projectedOutcome)} Probability`}
          color={getOutcomeColor(benchmark.projectedOutcome)}
          icon={getOutcomeIcon(benchmark.projectedOutcome)}
        />
      </div>

      {/* Reality Check Messages */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 12,
        marginBottom: 20
      }}>
        <MessageCard
          title="Reality Check"
          message={benchmark.realityMessage}
          color={getComparisonColor(benchmark.comparison)}
          icon="🔍"
        />
        <MessageCard
          title="Historical Pattern"
          message={benchmark.motivationMessage}
          color="#3b82f6"
          icon="📈"
        />
      </div>

      {/* Milestone Status */}
      {milestoneStatus.current && (
        <div style={{
          background: milestoneStatus.isOnTrack ? 'rgba(34, 197, 94, 0.1)' : 'rgba(220, 38, 38, 0.1)',
          border: `2px solid ${milestoneStatus.isOnTrack ? 'rgba(34, 197, 94, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: milestoneStatus.isOnTrack ? '#22c55e' : '#dc2626',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            🎯 Critical Milestone ({daysLeft} days left)
          </div>
          <div style={{
            fontSize: 13,
            marginBottom: 8
          }}>
            {milestoneStatus.current.description}
          </div>
          {!milestoneStatus.isOnTrack && (
            <div style={{
              fontSize: 12,
              color: '#dc2626',
              fontWeight: 600
            }}>
              ⚠️ {milestoneStatus.deficit.toFixed(0)} points behind target score
            </div>
          )}
        </div>
      )}

      {/* Closest Profile Match */}
      <div style={{
        background: 'var(--bg)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid var(--border)',
        marginBottom: 20
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          👥 Most Similar Historical Student
        </div>
        <ProfileCard profile={benchmark.closestProfile} />
      </div>

      {/* Historical Context */}
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
          📊 Unicamp Success Benchmarks
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12
        }}>
          <BenchmarkStat
            label="Median Daily Hours"
            value={`${historicalData.medianDailyHours}h`}
            icon="📈"
          />
          <BenchmarkStat
            label="Top 10% Daily Hours"
            value={`${historicalData.top10DailyHours}h`}
            icon="👑"
          />
          <BenchmarkStat
            label="Minimum Viable"
            value={`${historicalData.minimumViableHours}h`}
            icon="⚡"
          />
          <BenchmarkStat
            label="Avg Preparation"
            value={`${historicalData.averagePreparationDays} days`}
            icon="📅"
          />
        </div>
      </div>
    </div>
  );
}

function PerformanceMetric({ label, value, subtitle, color, icon }: {
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

function MessageCard({ title, message, color, icon }: {
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
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        {icon} {title}
      </div>
      <div style={{
        fontSize: 13,
        lineHeight: 1.4
      }}>
        {message}
      </div>
    </div>
  );
}

function ProfileCard({ profile }: { profile: any }) {
  const isSuccess = profile.outcome === 'passed';

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      padding: 12,
      background: 'var(--card-bg)',
      borderRadius: 8,
      border: `1px solid ${isSuccess ? '#22c55e' : '#dc2626'}30`
    }}>
      <div style={{
        fontSize: 24,
        color: isSuccess ? '#22c55e' : '#dc2626'
      }}>
        {isSuccess ? '✅' : '❌'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: isSuccess ? '#22c55e' : '#dc2626',
          marginBottom: 4
        }}>
          Final Score: {profile.finalScore}% ({profile.outcome})
        </div>
        <div style={{
          fontSize: 12,
          opacity: 0.8,
          marginBottom: 2
        }}>
          {profile.dailyAverage.toFixed(1)}h/day × {profile.preparationDays} days = {profile.totalStudyHours}h total
        </div>
        <div style={{
          fontSize: 11,
          opacity: 0.6
        }}>
          Pattern: {profile.studyPattern.replace('_', ' ')}
        </div>
      </div>
    </div>
  );
}

function BenchmarkStat({ label, value, icon }: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div style={{
      padding: 12,
      background: 'var(--card-bg)',
      borderRadius: 6,
      border: '1px solid var(--border)',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        marginBottom: 2
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11,
        opacity: 0.8
      }}>
        {label}
      </div>
    </div>
  );
}

function CompactBenchmarkDisplay({ benchmark, daysLeft: _daysLeft }: {
  benchmark: BenchmarkAnalysis;
  daysLeft: number;
}) {
  const getComparisonColor = (comparison: string) => {
    switch (comparison) {
      case 'exceptional': return '#059669';
      case 'ahead': return '#22c55e';
      case 'on_track': return '#3b82f6';
      case 'behind': return '#f59e0b';
      case 'far_behind': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getComparisonIcon = (comparison: string) => {
    switch (comparison) {
      case 'exceptional': return '👑';
      case 'ahead': return '🚀';
      case 'on_track': return '✅';
      case 'behind': return '⚠️';
      case 'far_behind': return '🚨';
      default: return '❓';
    }
  };

  // Only show if behind or worse
  if (benchmark.comparison === 'exceptional' || benchmark.comparison === 'ahead') {
    return null;
  }

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: `2px solid ${getComparisonColor(benchmark.comparison)}`,
      borderRadius: 12,
      padding: 12,
      boxShadow: `0 4px 16px ${getComparisonColor(benchmark.comparison)}40`,
      minWidth: 220,
      pointerEvents: 'auto'
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: getComparisonColor(benchmark.comparison),
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        {getComparisonIcon(benchmark.comparison)} Unicamp Benchmark
      </div>

      <div style={{
        fontSize: 14,
        fontWeight: 800,
        marginBottom: 4
      }}>
        #{benchmark.userRank} Percentile
      </div>

      <div style={{
        fontSize: 11,
        opacity: 0.8,
        marginBottom: 8
      }}>
        {benchmark.dailyHoursVsMedian > 0 ? '+' : ''}{benchmark.dailyHoursVsMedian.toFixed(0)}% vs median successful
      </div>

      <div style={{
        fontSize: 10,
        background: `${getComparisonColor(benchmark.comparison)}20`,
        padding: 6,
        borderRadius: 4,
        color: getComparisonColor(benchmark.comparison),
        fontWeight: 600
      }}>
        {benchmark.projectedOutcome.replace(/_/g, ' ').toUpperCase()}
      </div>
    </div>
  );
}
