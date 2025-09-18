import { useGameState } from '../../context/GameStateContext'
import ProgressDebtTracker from './ProgressDebtTracker'
import UnicampBenchmarkDisplay from './UnicampBenchmarkDisplay'
import StudyDebtCalculator from './StudyDebtCalculator'
import PersonalCompetitionTracker from './PersonalCompetitionTracker'

export default function CoachRail(){
  const { state } = useGameState()
  const hasExam = !!state.settings.examDate
  return (
    <div style={{ display:'grid', gap:12 }}>
      {/* Compact insights stack: no floating UI */}
      {hasExam && (
        <div style={{ pointerEvents:'auto' }}>
          <ProgressDebtTracker cycles={state.analytics.cycles} examDate={state.settings.examDate!} isCompact={true} />
        </div>
      )}
      <div style={{ pointerEvents:'auto' }}>
        <PersonalCompetitionTracker cycles={state.analytics.cycles} mockExams={state.mockExams ?? []} isCompact={true} />
      </div>
      {hasExam && (
        <div style={{ pointerEvents:'auto' }}>
          <UnicampBenchmarkDisplay cycles={state.analytics.cycles} mockExams={state.mockExams ?? []} examDate={state.settings.examDate!} isCompact={true} />
        </div>
      )}
      {hasExam && (
        <div style={{ pointerEvents:'auto' }}>
          <StudyDebtCalculator cycles={state.analytics.cycles} examDate={state.settings.examDate!} isCompact={true} />
        </div>
      )}
    </div>
  )
}

