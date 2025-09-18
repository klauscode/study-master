import React from 'react';
import { useGameState } from '../../context/GameStateContext';

interface ExamCountdownWidgetProps {
  examDate: string; // ISO date string
  examName?: string;
}

export default function ExamCountdownWidget({
  examDate,
  examName = "Unicamp Entrance Exam"
}: ExamCountdownWidgetProps) {
  const { state } = useGameState();
  const [timeLeft, setTimeLeft] = React.useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = new Date();
    const exam = new Date(examDate);

    // Check if the exam date is valid
    if (isNaN(exam.getTime()) || !examDate) {
      return {
        total: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isOverdue: false,
        isInvalid: true,
        percentage: 0
      };
    }

    const diff = exam.getTime() - now.getTime();

    if (diff <= 0) {
      return {
        total: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isOverdue: true,
        percentage: 0
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // Calculate percentage of time remaining (based on actual time span from now to exam)
    const totalPrepTime = Math.max(diff, 30 * 24 * 60 * 60 * 1000); // Use actual time or minimum 30 days
    const percentage = Math.max(0, Math.min(100, (diff / totalPrepTime) * 100));

    return {
      total: diff,
      days,
      hours,
      minutes,
      seconds,
      isOverdue: false,
      isInvalid: false,
      percentage
    };
  }

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [examDate]);

  const getUrgencyLevel = () => {
    if (timeLeft.isOverdue) return 'overdue';
    if (timeLeft.days <= 7) return 'critical';
    if (timeLeft.days <= 14) return 'danger';
    if (timeLeft.days <= 30) return 'warning';
    return 'normal';
  };

  const getUrgencyColor = () => {
    switch (getUrgencyLevel()) {
      case 'overdue': return '#7c2d12';
      case 'critical': return '#dc2626';
      case 'danger': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const getUrgencyText = () => {
    switch (getUrgencyLevel()) {
      case 'overdue': return '💀 EXAM OVERDUE!';
      case 'critical': return '🚨 FINAL WEEK!';
      case 'danger': return '⚠️ URGENT!';
      case 'warning': return '🔥 CRITICAL PHASE';
      default: return '📚 PREPARATION TIME';
    }
  };

  const urgencyColor = getUrgencyColor();
  const urgencyLevel = getUrgencyLevel();

  // Don't render if no valid exam date is set
  if ((timeLeft as any).isInvalid) {
    return null;
  }

  if (timeLeft.isOverdue) {
    return (
      <div style={{
        background: '#7c2d12',
        color: 'white',
        padding: '16px 20px',
        borderRadius: 12,
        border: '2px solid #dc2626',
        boxShadow: '0 8px 32px rgba(124, 45, 18, 0.5)',
        animation: 'shake 0.5s infinite',
        fontWeight: 700,
        pointerEvents: 'auto'
      }}>
        <div style={{ fontSize: 16, marginBottom: 4 }}>💀 EXAM OVERDUE!</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>The exam has passed!</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: `2px solid ${urgencyColor}`,
      borderRadius: 16,
      padding: 16,
      boxShadow: `0 8px 32px ${urgencyColor}30`,
      minWidth: 240,
      animation: urgencyLevel === 'critical' ? 'pulse 1s infinite' : 'none',
      pointerEvents: 'auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: urgencyColor,
          textTransform: 'uppercase'
        }}>
          {getUrgencyText()}
        </div>
        <div style={{
          fontSize: 10,
          opacity: 0.6,
          fontWeight: 600
        }}>
          {timeLeft.percentage.toFixed(1)}% time left
        </div>
      </div>

      {/* Exam Name */}
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        marginBottom: 12,
        color: 'var(--fg)'
      }}>
        {examName}
      </div>

      {/* Countdown Display */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        marginBottom: 12
      }}>
        <TimeUnit value={timeLeft.days} label="Days" color={urgencyColor} />
        <TimeUnit value={timeLeft.hours} label="Hours" color={urgencyColor} />
        <TimeUnit value={timeLeft.minutes} label="Min" color={urgencyColor} />
        <TimeUnit value={timeLeft.seconds} label="Sec" color={urgencyColor} animate={true} />
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: 8,
        background: 'var(--border)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
        position: 'relative'
      }}>
        <div
          style={{
            width: `${timeLeft.percentage}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${urgencyColor}, ${urgencyColor}aa)`,
            borderRadius: 4,
            transition: 'width 1s ease'
          }}
        />
        {/* Danger zones */}
        <div style={{
          position: 'absolute',
          right: '22%', // 30 days mark
          top: 0,
          height: '100%',
          width: 1,
          background: '#f59e0b',
          opacity: 0.8
        }} />
        <div style={{
          position: 'absolute',
          right: '11%', // 14 days mark
          top: 0,
          height: '100%',
          width: 1,
          background: '#ef4444',
          opacity: 0.8
        }} />
        <div style={{
          position: 'absolute',
          right: '5.5%', // 7 days mark
          top: 0,
          height: '100%',
          width: 1,
          background: '#dc2626',
          opacity: 0.8
        }} />
      </div>

      {/* Motivational/Anxiety Text */}
      <div style={{
        fontSize: 10,
        opacity: 0.8,
        textAlign: 'center',
        color: urgencyColor,
        fontWeight: 600
      }}>
        {getMotivationalText(timeLeft.days, urgencyLevel)}
      </div>

      {/* Daily Progress Bar */}
      <div style={{
        marginTop: 8,
        padding: 8,
        background: 'var(--bg)',
        borderRadius: 8,
        border: `1px solid ${urgencyColor}20`
      }}>
        <div style={{
          fontSize: 9,
          opacity: 0.7,
          marginBottom: 4,
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Today's Progress</span>
          <span>{getCurrentDayHours(state).toFixed(1)}/8h target</span>
        </div>
        <div style={{
          width: '100%',
          height: 4,
          background: 'var(--border)',
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <div
            style={{
              width: `${Math.min(100, (getCurrentDayHours(state) / 8) * 100)}%`,
              height: '100%',
              background: getCurrentDayHours(state) >= 8 ? '#22c55e' : urgencyColor,
              borderRadius: 2,
              transition: 'width 0.5s ease'
            }}
          />
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label, color, animate = false }: {
  value: number;
  label: string;
  color: string;
  animate?: boolean;
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: 8,
      background: 'var(--bg)',
      borderRadius: 8,
      border: `1px solid ${color}30`,
      animation: animate ? 'fadeIn 0.5s ease' : 'none'
    }}>
      <div style={{
        fontSize: 16,
        fontWeight: 900,
        color: color,
        lineHeight: 1
      }}>
        {value.toString().padStart(2, '0')}
      </div>
      <div style={{
        fontSize: 8,
        opacity: 0.7,
        marginTop: 2,
        textTransform: 'uppercase',
        fontWeight: 600
      }}>
        {label}
      </div>
    </div>
  );
}

function getMotivationalText(days: number, urgencyLevel: string): string {
  if (urgencyLevel === 'critical') {
    return "⚡ Every hour counts! Push harder!";
  }
  if (urgencyLevel === 'danger') {
    return "🔥 Crunch time! No time to waste!";
  }
  if (urgencyLevel === 'warning') {
    return "⏰ Build momentum now!";
  }
  return `📈 ${days} days to transform your future`;
}

function getCurrentDayHours(state: ReturnType<typeof useGameState>['state']): number {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cycles = state.analytics?.cycles ?? [];
    const hours = cycles
      .filter(c => (c.startedAtISO || '').slice(0,10) === today)
      .reduce((sum, c) => sum + c.studySeconds / 3600, 0);
    return Math.max(0, +hours.toFixed(2));
  } catch {
    return 0;
  }
}

// Add necessary CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
  }

  @keyframes fadeIn {
    0% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;
if (!document.head.querySelector('[data-exam-countdown-styles]')) {
  style.setAttribute('data-exam-countdown-styles', 'true');
  document.head.appendChild(style);
}
