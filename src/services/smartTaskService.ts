// Smart task generation based on performance, spaced repetition, and study patterns
import type { GameState, DailyTask, GemCategory, StudyCycleRecord } from '../types/gameTypes';
import { isDue } from './srsService';
import TOPICS from '../constants/unicamp_topics.json' assert { type: 'json' };

export interface TaskSuggestion {
  priority: number; // 1-10, higher = more urgent
  reason: string;
  task: Omit<DailyTask, 'progress' | 'status'>;
}

export function generateSmartTasks(state: GameState): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  const now = new Date();

  // Starter roadmap: if little/no history, seed outcome-based tasks for high-incidence topics
  const hasHistory = (state.analytics?.cycles?.length || 0) >= 5;
  if (!hasHistory) {
    suggestions.push(...getStarterRoadmapSuggestions(state, now));
  }

  // Analyze recent performance and study patterns
  suggestions.push(...analyzeSrsDue(state, now));
  suggestions.push(...analyzeSpacedRepetition(state, now));
  suggestions.push(...analyzeMapPerformance(state, now));
  suggestions.push(...analyzeMapFuelNeeds(state, now));
  suggestions.push(...analyzeCategoryBalance(state, now));
  suggestions.push(...analyzeStudyStreak(state, now));
  suggestions.push(...analyzeEquipmentNeeds(state, now));
  suggestions.push(...analyzeExamPreparation(state, now));

  // Sort by priority and return top 5-6 suggestions
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);
}

function analyzeSrsDue(state: GameState, now: Date): TaskSuggestion[] {
  const srs = state.srs || {};
  const due: Array<{ id: string; overdue: number }> = [];
  for (const id of Object.keys(srs)) {
    const item = srs[id]!;
    if (isDue(item, now)) {
      const overdue = now.getTime() - new Date(item.dueISO).getTime();
      due.push({ id, overdue });
    }
  }
  if (due.length === 0) return [];
  due.sort((a, b) => b.overdue - a.overdue);
  const pick = due[0];
  const gem = (state.gems || []).find(g => g.id === pick.id);
  if (!gem) return [];
  // Derive subject from tags if present (first non-weight tag)
  const subject = (gem.tags || []).find(t => !/^(high|medium)$/i.test(t));
  const suggestion: TaskSuggestion = {
    priority: 10,
    reason: 'Revisão SRS em atraso',
    task: {
      id: `srs_due_${gem.id}_${now.getTime()}`,
      title: `${gem.name} — 15 questões, ≥80%`,
      kind: 'topic_accuracy' as any,
      target: 15,
      category: gem.category,
      topic: gem.name,
      subject,
      targetPercent: 80,
      reward: { currency: 'Map Fragment', amount: 2 }
    }
  };
  return [suggestion];
}

// ----- Roadmap seeding for UNICAMP topics (outcome-based tasks) -----

function pickTopTopics(): Array<{ category: GemCategory; subject?: string; topic: string; weight: number }>{
  const out: Array<{ category: GemCategory; subject?: string; topic: string; weight: number }> = [];
  const pushList = (category: GemCategory, subject: string | undefined, arr: string[], w: number) => {
    for (const t of arr) out.push({ category, subject, topic: t, weight: w });
  };

  // Math
  pushList('Math', undefined, (TOPICS as any).Math.high, 1.0);
  pushList('Math', undefined, (TOPICS as any).Math.medium, 0.6);

  // Science: Physics, Chemistry, Biology mapped to category 'Science'
  const sci = (TOPICS as any).Science;
  pushList('Science', 'Physics', sci.Physics.high, 1.0);
  pushList('Science', 'Physics', sci.Physics.medium, 0.6);
  pushList('Science', 'Chemistry', sci.Chemistry.high, 1.0);
  pushList('Science', 'Chemistry', sci.Chemistry.medium, 0.6);
  pushList('Science', 'Biology', sci.Biology.high, 1.0);
  pushList('Science', 'Biology', sci.Biology.medium, 0.6);

  // Humanities: History, Geography (Philosophy/Sociology lower volume, still present)
  const hum = (TOPICS as any).Humanities;
  pushList('Humanities', 'History', hum.History.high, 1.0);
  pushList('Humanities', 'History', hum.History.medium, 0.6);
  pushList('Humanities', 'Geography', hum.Geography.high, 1.0);
  pushList('Humanities', 'Geography', hum.Geography.medium, 0.6);
  pushList('Humanities', 'Philosophy', hum.Philosophy.high, 0.5);
  pushList('Humanities', 'Sociology', hum.Sociology.high, 0.5);

  // Language: Portuguese + Literature
  const lang = (TOPICS as any).Language;
  pushList('Language', 'Portuguese', lang.Portuguese.high, 1.0);
  pushList('Language', 'Portuguese', lang.Portuguese.medium, 0.6);
  pushList('Language', 'Literature', lang.Literature.high, 0.7);
  pushList('Language', 'Literature', lang.Literature.medium, 0.5);

  return out;
}

function getStarterRoadmapSuggestions(state: GameState, now: Date): TaskSuggestion[] {
  const topics = pickTopTopics()
    .sort((a, b) => b.weight - a.weight);

  const pick = (i: number) => topics[i];
  const s: TaskSuggestion[] = [];

  // 1) Do Now: highest-weight topic accuracy quest
  const t1 = pick(0);
  s.push({
    priority: 10,
    reason: `Alta incidência (prioridade UNICAMP)`,
    task: {
      id: `topic_acc_${t1.topic}_${now.getTime()}`,
      title: `${t1.topic} — 20 questões, ≥80%`,
      kind: 'topic_accuracy' as any,
      target: 20,
      category: t1.category,
      topic: t1.topic,
      subject: t1.subject,
      targetPercent: 80,
      reward: { currency: 'Map Fragment', amount: 5 }
    }
  });

  // 2) Alternate A: map objective for same category (accuracy-focused recipe)
  s.push({
    priority: 8,
    reason: `Prática dirigida (mapa com precisão)`,
    task: {
      id: `map_obj_${t1.category}_${now.getTime()}`,
      title: `Mapa: ${t1.category} (precision + marathon), ≥75%`,
      kind: 'map_objective' as any,
      target: 1,
      category: t1.category,
      topic: t1.topic,
      mapAffixes: ['precision', 'marathon'],
      targetPercent: 75,
      reward: { currency: 'Chaos', amount: 2 }
    }
  });

  // 3) Alternate B: second-high topic coverage quest
  const t2 = pick(1) || t1;
  s.push({
    priority: 7,
    reason: `Cobertura de conteúdo (núcleo)`,
    task: {
      id: `coverage_${t2.topic}_${now.getTime()}`,
      title: `${t2.topic} — núcleo 30 questões, ≥70%`,
      kind: 'topic_coverage' as any,
      target: 30,
      category: t2.category,
      topic: t2.topic,
      subject: t2.subject,
      targetPercent: 70,
      reward: { currency: 'Alchemy', amount: 3 }
    }
  });

  return s;
}

function analyzeSpacedRepetition(state: GameState, now: Date): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  const oneDay = 24 * 60 * 60 * 1000;
  const threeDays = 3 * oneDay;
  const sevenDays = 7 * oneDay;

  for (const gem of state.gems || []) {
    if (!gem.lastStudiedISO || !gem.name) continue;

    const lastStudied = new Date(gem.lastStudiedISO);
    const daysSinceStudied = (now.getTime() - lastStudied.getTime()) / oneDay;

    // Critical: Haven't studied in 7+ days (knowledge decay!)
    if (daysSinceStudied >= 7) {
      suggestions.push({
        priority: 10,
        reason: `Critical knowledge decay! ${gem.name} hasn't been studied in ${Math.floor(daysSinceStudied)} days`,
        task: {
          id: `revival_${gem.id}_${now.getTime()}`,
          title: `🚨 Revive ${gem.name}`,
          kind: 'category_minutes',
          target: 45,
          category: gem.category,
          reward: { currency: 'Transmute', amount: 150 + Math.floor(daysSinceStudied * 10) }
        }
      });
    }
    // High priority: 3-6 days (spaced repetition optimal window)
    else if (daysSinceStudied >= 3) {
      suggestions.push({
        priority: 8,
        reason: `Perfect spaced repetition timing for ${gem.name}`,
        task: {
          id: `spaced_${gem.id}_${now.getTime()}`,
          title: `🧠 Spaced Review: ${gem.name}`,
          kind: 'category_minutes',
          target: 30,
          category: gem.category,
          reward: { currency: 'Alchemy', amount: 3 + Math.floor(gem.level / 2) }
        }
      });
    }
  }

  return suggestions;
}

function analyzeMapPerformance(state: GameState, now: Date): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  const recentCycles = getRecentCycles(state, 7); // Last 7 days

  // Analyze which gems have poor map/practice performance
  const gemPerformance: Record<string, { total: number, accuracy: number, attempts: number }> = {};

  // This would need map completion data - for now, simulate based on gem levels vs expected performance
  for (const gem of state.gems || []) {
    if (!gem.name || !gem.level) continue;

    const createdAt = gem.createdAt ? new Date(gem.createdAt) : now;
    const expectedLevel = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)));

    if (gem.level < expectedLevel * 0.7) { // Underperforming gem
      suggestions.push({
        priority: 7,
        reason: `${gem.name} is underperforming - needs focused practice`,
        task: {
          id: `focus_${gem.id}_${now.getTime()}`,
          title: `🎯 Focus Practice: ${gem.name}`,
          kind: 'category_minutes',
          target: 60,
          category: gem.category,
          reward: { currency: 'Chaos', amount: 2 + Math.floor(gem.level / 3) }
        }
      });
    }
  }

  return suggestions;
}

function analyzeCategoryBalance(state: GameState, now: Date): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const since = now.getTime() - sevenDaysMs;

  // Calculate category study time in last 7 days
  const categoryMinutes: Record<GemCategory, number> = {
    Math: 0, Science: 0, Language: 0, Humanities: 0
  };

  for (const record of state.analytics?.cycles || []) {
    const cycleTime = new Date(record.endedAtISO).getTime();
    if (cycleTime < since) continue;

    const category = record.category || 'Math';
    categoryMinutes[category] += record.studySeconds / 60;
  }

  const totalMinutes = Object.values(categoryMinutes).reduce((sum, min) => sum + min, 0);
  if (totalMinutes === 0) return suggestions;

  // Find underrepresented categories (should be ~25% each)
  const targetShare = 0.25;

  for (const [category, minutes] of Object.entries(categoryMinutes)) {
    const currentShare = minutes / totalMinutes;

    if (currentShare < targetShare * 0.6) { // Less than 15% when should be 25%
      const deficit = (targetShare - currentShare) * totalMinutes;

      suggestions.push({
        priority: 6,
        reason: `${category} is neglected - only ${(currentShare * 100).toFixed(1)}% of study time`,
        task: {
          id: `balance_${category}_${now.getTime()}`,
          title: `⚖️ Rebalance: Study ${category}`,
          kind: 'category_minutes',
          target: Math.max(30, Math.floor(deficit)),
          category: category as GemCategory,
          reward: { currency: 'Regal', amount: 1 + Math.floor(deficit / 30) }
        }
      });
    }
  }

  return suggestions;
}

// Ensure studying timers can fund X maps/day by granting materials via cycle-based tasks
function analyzeMapFuelNeeds(state: GameState, now: Date): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  const targetMapsPerDay = 3; // baseline daily target; can be made configurable
  const costPerMap = { fragment: 1, chisel: 1 };

  const ownedFragments = (state.currency?.["Map Fragment"] || 0);
  const ownedChisels = (state.currency?.["Cartographer's Chisel"] || 0);

  const needFragments = Math.max(0, targetMapsPerDay * costPerMap.fragment - ownedFragments);
  const needChisels = Math.max(0, targetMapsPerDay * costPerMap.chisel - ownedChisels);

  const cyclesFor = (need: number) => Math.max(1, Math.ceil(need / 2)); // 2 mats per cycle as a pacing rule

  if (needFragments > 0) {
    suggestions.push({
      priority: 8,
      reason: `Combustível de mapa: completar ${targetMapsPerDay} mapas hoje` ,
      task: {
        id: `fuel_frag_${now.toDateString()}`,
        title: `Combustível de Mapa: +${needFragments} Fragmentos`,
        kind: 'cycles',
        target: cyclesFor(needFragments),
        reward: { currency: 'Map Fragment', amount: needFragments }
      }
    });
  }

  if (needChisels > 0) {
    suggestions.push({
      priority: 8,
      reason: `Cinzéis para mapas: completar ${targetMapsPerDay} mapas hoje` ,
      task: {
        id: `fuel_chisel_${now.toDateString()}`,
        title: `Cinzéis do Cartógrafo: +${needChisels}`,
        kind: 'cycles',
        target: cyclesFor(needChisels),
        reward: { currency: "Cartographer's Chisel", amount: needChisels }
      }
    });
  }

  return suggestions;
}

function analyzeStudyStreak(state: GameState, now: Date): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  const recentCycles = getRecentCycles(state, 3); // Last 3 days

  // Check if user has been inactive
  if (recentCycles.length === 0) {
    suggestions.push({
      priority: 9,
      reason: "No study sessions in 3 days - time to get back on track!",
      task: {
        id: `comeback_${now.getTime()}`,
        title: `🔥 Comeback Special`,
        kind: 'study_minutes',
        target: 25,
        reward: { currency: 'Transmute', amount: 100 }
      }
    });
  }
  // Check for low daily volume
  else if (recentCycles.length < 2) {
    suggestions.push({
      priority: 5,
      reason: "Study volume is low - let's boost productivity!",
      task: {
        id: `boost_${now.getTime()}`,
        title: `⚡ Productivity Boost`,
        kind: 'cycles',
        target: 3,
        reward: { currency: 'Map Fragment', amount: 5 }
      }
    });
  }

  return suggestions;
}

function analyzeEquipmentNeeds(state: GameState, now: Date): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  const currency = state.currency || {};

  // Check if user needs more crafting materials
  if ((currency['Map Fragment'] || 0) < 3) {
    suggestions.push({
      priority: 4,
      reason: "Running low on Map Fragments for practice sessions",
      task: {
        id: `fragments_${now.getTime()}`,
        title: `🗺️ Gather Map Fragments`,
        kind: 'cycles',
        target: 4,
        reward: { currency: 'Map Fragment', amount: 8 }
      }
    });
  }

  if ((currency['Transmute'] || 0) < 50) {
    suggestions.push({
      priority: 3,
      reason: "Need more Transmute orbs for equipment upgrades",
      task: {
        id: `transmute_${now.getTime()}`,
        title: `💰 Build Currency Reserve`,
        kind: 'study_minutes',
        target: 90,
        reward: { currency: 'Transmute', amount: 75 }
      }
    });
  }

  return suggestions;
}

function analyzeExamPreparation(state: GameState, now: Date): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];

  if (!state.settings?.examDate) return suggestions;

  const examDate = new Date(state.settings.examDate);
  const daysUntilExam = Math.ceil((examDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  // Critical final push (less than 7 days)
  if (daysUntilExam > 0 && daysUntilExam <= 7) {
    suggestions.push({
      priority: 10,
      reason: `UNICAMP in ${daysUntilExam} days! Final review time!`,
      task: {
        id: `final_push_${now.getTime()}`,
        title: `🎯 Final Review Sprint`,
        kind: 'study_minutes',
        target: 120,
        reward: { currency: 'Chaos', amount: 8 }
      }
    });
  }
  // Intensive prep (7-30 days)
  else if (daysUntilExam > 7 && daysUntilExam <= 30) {
    suggestions.push({
      priority: 7,
      reason: `${daysUntilExam} days until UNICAMP - intensive prep mode!`,
      task: {
        id: `intensive_prep_${now.getTime()}`,
        title: `📚 Intensive Prep Session`,
        kind: 'study_minutes',
        target: 90,
        reward: { currency: 'Regal', amount: 2 }
      }
    });
  }

  return suggestions;
}

function getRecentCycles(state: GameState, days: number): StudyCycleRecord[] {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return (state.analytics?.cycles || []).filter(cycle => {
    return new Date(cycle.endedAtISO) > cutoff;
  });
}

// Generate tasks every hour
export function shouldGenerateNewTasks(lastGenerated?: string): boolean {
  if (!lastGenerated) return true;

  const lastGen = new Date(lastGenerated);
  const now = new Date();
  const hoursSince = (now.getTime() - lastGen.getTime()) / (60 * 60 * 1000);

  return hoursSince >= 1; // Generate every hour
}

// Convert suggestions to actual tasks
export function createTasksFromSuggestions(suggestions: TaskSuggestion[], existingTaskIds: Set<string>): DailyTask[] {
  const tasks: DailyTask[] = [];

  for (const suggestion of suggestions) {
    // Don't duplicate existing tasks
    if (existingTaskIds.has(suggestion.task.id)) continue;

    tasks.push({
      ...suggestion.task,
      progress: 0,
      status: 'active'
    });

    // Limit to 3-4 active tasks at once
    if (tasks.length >= 4) break;
  }

  return tasks;
}
