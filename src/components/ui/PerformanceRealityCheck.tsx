import { useState } from 'react';
import type { MockExamScore } from '../../types/gameTypes';
import { calculatePerformanceReality, getPerformanceSeverity, calculateMockExamScore } from '../../services/performanceRealityService';

interface PerformanceRealityCheckProps {
  mockExams: MockExamScore[];
  examDate: string;
  targetScore: number;
  cycles: any[];
  onAddMockExam: (exam: MockExamScore) => void;
  onDeleteMockExam: (examId: string) => void;
}

export default function PerformanceRealityCheck({
  mockExams,
  examDate,
  targetScore,
  cycles,
  onAddMockExam,
  onDeleteMockExam
}: PerformanceRealityCheckProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  // Calculate total study hours from cycles
  const totalStudyHours = cycles.reduce((sum, cycle) => sum + (cycle.studySeconds / 3600), 0);

  const analysis = calculatePerformanceReality(mockExams, totalStudyHours, targetScore, examDate);
  const severity = getPerformanceSeverity(analysis);

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
          color: severity.color,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          {severity.icon} Performance Reality Check
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Mock Exam'}
        </button>
      </div>

      {/* Add Mock Exam Form */}
      {showAddForm && (
        <MockExamForm onSubmit={(exam) => {
          onAddMockExam(exam);
          setShowAddForm(false);
        }} />
      )}

      {/* Reality Check Summary */}
      <div style={{
        padding: 20,
        background: `${severity.color}15`,
        border: `1px solid ${severity.color}40`,
        borderRadius: 12,
        marginBottom: 20,
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: 16,
          fontWeight: 800,
          color: severity.color,
          marginBottom: 8
        }}>
          {analysis.realityCheck}
        </div>
        <div style={{
          fontSize: 13,
          color: severity.color,
          fontWeight: 600
        }}>
          {analysis.recommendation}
        </div>
      </div>

      {/* Performance Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 16,
        marginBottom: 20
      }}>
        <PerformanceMetric
          label="Current Score"
          value={`${analysis.currentReadiness.toFixed(1)}%`}
          target={`${targetScore}%`}
          color={severity.color}
          icon="📊"
        />
        <PerformanceMetric
          label="Projected Score"
          value={`${analysis.projectedExamScore.toFixed(1)}%`}
          target={`${targetScore}%`}
          color={analysis.projectedExamScore >= targetScore ? '#22c55e' : severity.color}
          icon="🎯"
        />
        <PerformanceMetric
          label="Weekly Improvement"
          value={`${analysis.improvementRate > 0 ? '+' : ''}${analysis.improvementRate.toFixed(1)}%`}
          target="Need +5%"
          color={analysis.improvementRate >= 5 ? '#22c55e' : severity.color}
          icon="📈"
        />
        <PerformanceMetric
          label="Weeks to Target"
          value={analysis.timeToTarget === Infinity ? '∞' : `${analysis.timeToTarget.toFixed(1)}w`}
          target={`${Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))}w left`}
          color={analysis.timeToTarget <= 8 ? '#22c55e' : severity.color}
          icon="⏰"
        />
      </div>

      {/* Subject Analysis */}
      {(analysis.weakestSubjects.length > 0 || analysis.strongestSubjects.length > 0) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 20
        }}>
          <SubjectAnalysis
            title="🚨 Weakest Subjects"
            subjects={analysis.weakestSubjects}
            color="#ef4444"
          />
          <SubjectAnalysis
            title="✅ Strongest Subjects"
            subjects={analysis.strongestSubjects}
            color="#22c55e"
          />
        </div>
      )}

      {/* Mock Exam History */}
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
          📝 Mock Exam History ({mockExams.length})
          {mockExams.length === 0 && (
            <span style={{
              fontSize: 12,
              color: '#ef4444',
              fontWeight: 600
            }}>
              ⚠️ NO DATA - TAKE A MOCK EXAM!
            </span>
          )}
        </div>

        {mockExams.length === 0 ? (
          <div style={{
            padding: 20,
            textAlign: 'center',
            opacity: 0.7,
            fontSize: 13
          }}>
            <div style={{ marginBottom: 8 }}>No mock exams recorded yet.</div>
            <div>Take practice tests to get an accurate reality check!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mockExams
              .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
              .map(exam => (
                <MockExamCard
                  key={exam.id}
                  exam={exam}
                  onDelete={() => onDeleteMockExam(exam.id)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PerformanceMetric({ label, value, target, color, icon }: {
  label: string;
  value: string;
  target: string;
  color: string;
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
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
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
        Target: {target}
      </div>
    </div>
  );
}

function SubjectAnalysis({ title, subjects, color }: {
  title: string;
  subjects: string[];
  color: string;
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
        marginBottom: 8
      }}>
        {title}
      </div>
      {subjects.length === 0 ? (
        <div style={{
          fontSize: 11,
          opacity: 0.7
        }}>
          No data available
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4
        }}>
          {subjects.map(subject => (
            <span
              key={subject}
              style={{
                background: `${color}20`,
                color: color,
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600
              }}
            >
              {subject}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MockExamCard({ exam, onDelete }: {
  exam: MockExamScore;
  onDelete: () => void;
}) {
  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 60) return '#3b82f6';
    if (percentage >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      background: 'var(--card-bg)',
      borderRadius: 8,
      border: `1px solid ${getScoreColor(exam.percentage)}30`
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 4
        }}>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            color: getScoreColor(exam.percentage)
          }}>
            {exam.percentage.toFixed(1)}%
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 600
          }}>
            {exam.examName}
          </div>
          <div style={{
            fontSize: 11,
            opacity: 0.7
          }}>
            {new Date(exam.dateISO).toLocaleDateString()}
          </div>
        </div>
        <div style={{
          fontSize: 11,
          opacity: 0.8
        }}>
          {exam.correctAnswers}/{exam.totalQuestions} correct • {exam.timeSpentMinutes} min
        </div>
      </div>
      <button
        onClick={onDelete}
        style={{
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 10,
          cursor: 'pointer'
        }}
      >
        Delete
      </button>
    </div>
  );
}

function MockExamForm({ onSubmit }: {
  onSubmit: (exam: MockExamScore) => void;
}) {
  const [examName, setExamName] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(100);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeSpent, setTimeSpent] = useState(120);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const exam = calculateMockExamScore(
      correctAnswers,
      totalQuestions,
      timeSpent
    );

    exam.examName = examName || `Mock Exam ${new Date().toLocaleDateString()}`;

    onSubmit(exam);

    // Reset form
    setExamName('');
    setCorrectAnswers(0);
    setTimeSpent(120);
  };

  const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  return (
    <div style={{
      background: 'var(--bg)',
      border: '2px solid #3b82f6',
      borderRadius: 12,
      padding: 20,
      marginBottom: 20
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        marginBottom: 16,
        color: '#3b82f6'
      }}>
        📝 Add Mock Exam Results
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 16
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4
            }}>
              Exam Name
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g., Unicamp Practice Test #1"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--card-bg)',
                color: 'var(--fg)',
                fontSize: 13
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4
            }}>
              Total Questions
            </label>
            <input
              type="number"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--card-bg)',
                color: 'var(--fg)',
                fontSize: 13
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4
            }}>
              Correct Answers
            </label>
            <input
              type="number"
              value={correctAnswers}
              onChange={(e) => setCorrectAnswers(Math.max(0, Math.min(totalQuestions, parseInt(e.target.value) || 0)))}
              min="0"
              max={totalQuestions}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--card-bg)',
                color: 'var(--fg)',
                fontSize: 13
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4
            }}>
              Time Spent (minutes)
            </label>
            <input
              type="number"
              value={timeSpent}
              onChange={(e) => setTimeSpent(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--card-bg)',
                color: 'var(--fg)',
                fontSize: 13
              }}
            />
          </div>
        </div>

        {/* Live Score Display */}
        <div style={{
          padding: 12,
          background: percentage >= 60 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${percentage >= 60 ? '#22c55e' : '#ef4444'}30`,
          borderRadius: 8,
          marginBottom: 16,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 900,
            color: percentage >= 60 ? '#22c55e' : '#ef4444'
          }}>
            {percentage.toFixed(1)}%
          </div>
          <div style={{
            fontSize: 12,
            opacity: 0.8
          }}>
            {correctAnswers}/{totalQuestions} correct
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end'
        }}>
          <button
            type="submit"
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Add Exam
          </button>
        </div>
      </form>
    </div>
  );
}