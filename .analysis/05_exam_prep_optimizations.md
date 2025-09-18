# StudyFall Exam Prep Optimizations for 39-Day Timeline

**Target**: October 26, 2025 UNICAMP Exam
**Current Status**: Critical optimization needed for realistic exam preparation

## 🔴 CRITICAL ISSUE #1: Wrong Spaced Repetition Algorithm

### Current Problem
- **Uses SM-2, not FSRS** (`srsService.ts:19-51`)
- **39-day timeline incompatible** with SM-2 intervals
- **Review schedule**: Day 1 → Day 6 → Day 15 → Day 38 (too sparse!)

### FSRS Algorithm for 39-Day Timeline
```typescript
// Replace SM-2 with FSRS-optimized for exam prep
export function examOptimizedFSRS(item: SrsItem, quality: SrsQuality, now = new Date()): SrsItem {
  const EXAM_DATE = new Date('2025-10-26');
  const daysUntilExam = Math.max(1, (EXAM_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Compress intervals for exam timeline
  const compressionFactor = Math.min(1, daysUntilExam / 90); // Compress if <90 days

  if (quality >= 3) {
    if (item.reps === 0) interval = 1;
    else if (item.reps === 1) interval = Math.ceil(3 * compressionFactor); // 3 days → compressed
    else if (item.reps === 2) interval = Math.ceil(7 * compressionFactor); // 1 week → compressed
    else interval = Math.ceil(Math.min(14, item.interval * 1.8) * compressionFactor); // Cap at 2 weeks
  } else {
    // Failed: reset but with shorter first interval for faster recovery
    interval = Math.ceil(0.5 * compressionFactor) || 1;
  }

  // Ensure final review happens 2-3 days before exam
  if (daysUntilExam <= 7) {
    interval = Math.min(interval, Math.floor(daysUntilExam / 2));
  }
}
```

## 🔴 CRITICAL ISSUE #2: Knowledge Decay Too Harsh

### Current Problem
```typescript
const DECAY_RATE = 0.15;           // 40% loss in 7 days!
const MAX_DECAY_PERCENT = 0.4;     // Devastating for exam prep
```

### Exam-Optimized Decay
```typescript
// Gentler decay for exam preparation
const EXAM_DECAY_RATE = 0.05;        // Slower decay
const EXAM_MAX_DECAY = 0.15;         // Max 15% loss (not 40%)
const DECAY_THRESHOLD_HOURS = 48;    // Start decay after 2 days (not 1)

// Progressive decay resistance with gem level
function getExamDecayResistance(gemLevel: number): number {
  return Math.min(0.8, 0.1 + (gemLevel * 0.02)); // Higher levels = more retention
}
```

## ⚡ MAP SCALING OPTIMIZATION

### Current Scaling (Needs Fix)
```typescript
// Current: Cap at 12 questions regardless of level
const q = Math.min(12, baseQuestions + levelScaling);
```

### Your Proposed Fix (PERFECT!)
```typescript
// 20-question cap at gem level 19+ for 1-hour cycles
function calculateQuestionCount(gems: GemTopic[]): number {
  const avgLevel = gems.reduce((sum, gem) => sum + (gem.level || 1), 0) / gems.length;
  const baseQuestions = 3 + Math.floor(rng() * 4); // 3-6 base
  const levelScaling = Math.floor(avgLevel / 3);

  // Progressive scaling with cap at level 19
  if (avgLevel >= 19) {
    return Math.min(20, baseQuestions + levelScaling); // 20-question cap for 1-hour sessions
  } else {
    return Math.min(12, baseQuestions + levelScaling); // Current cap for lower levels
  }
}

// Time calculation: 3 minutes per question
const estimatedTimeMinutes = questionCount * 3;
const fitsInOneHour = estimatedTimeMinutes <= 60;
```

## 🎯 CROSS-SUBJECT BALANCE MECHANICS

### Current Category Nudge System
```typescript
// From experienceService.ts:180-205
const targetShare = 0.25; // 25% per category over 7 days
const deficit = Math.max(0, targetShare - currentShare);
const bonus = Math.min(0.10, deficit * 0.40); // Up to 10% XP bonus
```

### 39-Day Exam Pressure Enhancement
```typescript
function calculateExamUrgencyMultiplier(state: GameState): number {
  const examDate = new Date(state.settings.examDate || '2025-10-26');
  const now = new Date();
  const daysUntilExam = (examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // Increase urgency as exam approaches
  if (daysUntilExam <= 7) return 2.0;   // Double XP in final week
  if (daysUntilExam <= 14) return 1.5;  // 50% bonus in final 2 weeks
  if (daysUntilExam <= 30) return 1.2;  // 20% bonus in final month
  return 1.0;
}

// Enhanced category balance for exam prep
function computeExamCategoryNudge(state: GameState): number {
  const baseNudge = computeCategoryNudge(state); // Existing logic
  const urgencyMultiplier = calculateExamUrgencyMultiplier(state);

  // Stronger balancing pressure as exam approaches
  return Math.min(2.0, baseNudge * urgencyMultiplier);
}
```

## 💰 CHISEL ECONOMY OPTIMIZATION

### Current Generation vs Consumption
- **Generation**: 4 Map Fragments + 2 Transmute per cycle (guaranteed)
- **Map Cost**: 1 Cartographer's Chisel each
- **Chisel Generation**: ~20% weight in orb drops (irregular)

### Balance Analysis
```
Daily cycles: 24 (every 50min + 10min rest)
Daily Map Fragments: 24 × 4 = 96
Daily Chisels needed: 24 maps = 24 chisels
Current chisel generation: ~15-20% of drops = insufficient!
```

### Economic Fix
```typescript
// Guarantee chisel generation for exam prep
const guaranteedOrbs = {
  'Map Fragment': 4,
  'Transmute': 2,
  'Cartographer\'s Chisel': 1,  // ADD: Guarantee 1 chisel per cycle
  'Alchemy': 1,
  'Chaos': 1
};

// Alternative: Convert surplus Map Fragments to Chisels
function autoConvertFragmentsToChisels(currency: Record<string, number>): void {
  const fragments = currency['Map Fragment'] || 0;
  const chisels = currency['Cartographer\'s Chisel'] || 0;

  // If we have 3+ fragments per chisel, auto-convert excess
  const conversionRatio = 3; // 3 fragments = 1 chisel
  if (fragments >= conversionRatio && chisels < 5) {
    const convertable = Math.floor(fragments / conversionRatio);
    currency['Map Fragment'] -= convertable * conversionRatio;
    currency['Cartographer\'s Chisel'] += convertable;
  }
}
```

## 🗓️ 39-DAY STUDY PLAN GENERATION

### Smart Task Integration for Exam Prep
```typescript
function generateExamTimeline(examDate: string, gems: SubjectGem[]): DailyTask[] {
  const exam = new Date(examDate);
  const now = new Date();
  const daysLeft = Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Phase 1: Learning (70% of time) - Focus on weak subjects
  // Phase 2: Consolidation (20% of time) - Balanced review
  // Phase 3: Final Review (10% of time) - High-confidence maintenance

  const learningDays = Math.floor(daysLeft * 0.7);   // ~27 days
  const consolidationDays = Math.floor(daysLeft * 0.2); // ~8 days
  const finalReviewDays = daysLeft - learningDays - consolidationDays; // ~4 days

  return [
    // Learning phase tasks (prioritize weak gems)
    ...generateLearningPhaseTasks(gems, learningDays),
    // Consolidation phase tasks (balanced coverage)
    ...generateConsolidationTasks(gems, consolidationDays),
    // Final review tasks (maintain strong areas)
    ...generateFinalReviewTasks(gems, finalReviewDays)
  ];
}
```

## 🚀 IMPLEMENTATION PRIORITY

### Immediate (This Week)
1. **Fix FSRS intervals** for 39-day compression
2. **Reduce knowledge decay** rates by 70%
3. **Guarantee chisel generation** (1 per cycle)

### High Priority (Next Week)
4. **Implement 20-question cap** at gem level 19
5. **Add exam urgency multipliers** for final month
6. **Auto-balance** cross-subject progression

### Medium Priority
7. **Generate 39-day study timeline** from settings
8. **Progressive difficulty scaling** with affixes
9. **Performance regression** variance smoothing

## 📊 SUCCESS METRICS

After implementation, the student should achieve:
- **All subjects** reaching level 15+ before exam
- **Daily map completion** rate of 20+ exams
- **Knowledge retention** of 85%+ after 1 week
- **Balanced progression** (no subject <60% of average)
- **Final week**: Focus on weakest 20% of topics only

These changes transform StudyFall from a general study app into a **precision exam preparation tool** optimized for the UNICAMP timeline!