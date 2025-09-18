// Core TypeScript types for Studyfall

export type ItemRarity = 'Common' | 'Magic' | 'Rare' | 'Epic';

export type EquipmentSlot =
  | 'Head'
  | 'Chest'
  | 'Legs'
  | 'Feet'
  | 'Weapon'
  | 'Accessory';

export interface ItemAffix {
  id: string;
  name: string;
  // Positive or negative percentage values for modifiers like XP gain, focus, etc.
  // Example: { stat: 'xpGainPercent', value: 10 }
  stat:
    | 'xpGainPercent'
    | 'gemXpGainPercent'
    | 'focusCapPercent'
    | 'focusGainRatePercent'
    | 'lootRarityPercent'
    | 'lootQuantityPercent';
  value: number;
}

export interface Item {
  id: string;
  name: string;
  rarity: ItemRarity;
  slot: EquipmentSlot;
  itemLevel: number;
  affixes: ItemAffix[];
}

export interface SubjectGem {
  id: string;
  name: string;
  level: number;
  xp: number;
  category: GemCategory;
  createdAt?: string; // ISO timestamp when the gem/subject was created
  lastStudiedISO?: string; // When this gem was last studied
  decayedXP?: number; // XP lost to forgetting
  peakXP?: number; // Highest XP this gem ever reached
  // Properties for map crafting compatibility
  tier?: number; // 1-3, difficulty tier
  weight?: number; // relative weight in allocation
  cycles?: number; // how many times it contributes a question block
  tags?: string[]; // categorization tags
}

export type GemCategory = 'Math' | 'Science' | 'Language' | 'Humanities';

export interface Character {
  level: number;
  xp: number;
  equipped: Partial<Record<EquipmentSlot, Item>>;
  subjectGem?: SubjectGem; // legacy; active gem is tracked at GameState level
}

export interface FocusState {
  multiplier: number; // 1.00 .. 1.50+
  // seconds of uninterrupted study for the current streak
  uninterruptedSeconds: number;
  // timestamp when paused started, or null if not paused
  pausedAt: number | null;
}

export interface StaminaState {
  current: number; // 0..100
  // total minutes studied since daily reset
  minutesStudiedToday: number;
  lastResetISO: string; // ISO timestamp of last 06:00 local reset processed
}

export interface CurrencyTransaction {
  id: string;
  timestamp: string;
  type: string;
  amount: number;
  source: 'loot' | 'task' | 'spent';
  description?: string;
}

export interface CurrencyLedger {
  transactions: CurrencyTransaction[];
  dailyTotals: Record<string, Record<string, number>>; // date -> orb type -> amount
}

export interface MockExamScore {
  id: string;
  examName: string;
  dateISO: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  timeSpentMinutes: number;
  subjects: {
    [subject: string]: {
      correct: number;
      total: number;
      percentage: number;
    };
  };
  targetScore?: number;
}

export interface RewardOption {
  id: string;
  name: string;
  description: string;
  durationMinutes?: number; // For timed rewards that freeze focus depletion
  type: 'treat' | 'leisure' | 'gaming' | 'equipment' | 'buff';
  category: 'base' | '50%' | '70%' | '85%';
}

export interface ActiveReward {
  id: string;
  name: string;
  startedAt: string; // ISO timestamp
  durationMinutes: number;
  type: 'focus_freeze' | 'triple_loot';
  // Optional event-based charges instead of time
  mode?: 'time' | 'cycles' | 'maps';
  remainingCycles?: number;
  remainingMaps?: number;
}

export interface ConsumableItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  effects: ConsumableEffect[];
  icon: string;
  tier: 'micro' | 'medium' | 'premium';
}

export interface ConsumableEffect {
  type: 'xp_multiplier' | 'focus_multiplier' | 'loot_quantity' | 'loot_rarity' | 'currency_gain' | 'stamina_protection';
  value: number; // multiplier (1.5 = +50%) or flat bonus
  duration: number; // minutes
}

export interface ActiveConsumable {
  id: string;
  consumableId: string;
  name: string;
  effects: ConsumableEffect[];
  startedAt: string; // ISO timestamp
  endsAt: string; // ISO timestamp
}

export type DifficultyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface MapSession {
  craftedMap: {
    seed: number;
    affixes: string[];
    questionCount: number;
    lineup: Array<{
      gemId: string;
      name: string;
      allocated: number;
      cyclesApplied: number;
      tags: string[];
    }>;
    difficultyTier: DifficultyTier;
    difficultyScore: number;
  };
  studyTimeMinutes: number;
  startedAt: string; // ISO timestamp
  isRunning: boolean;
  progress: number; // 0-100
}

export interface GameState {
  character: Character;
  inventory: Item[];
  currency: Record<string, number>;
  currencyLedger?: CurrencyLedger;
  gems: SubjectGem[];
  activeGemId?: string;
  focus: FocusState;
  stamina: StaminaState;
  isStudying: boolean;
  saveVersion: number;
  mapSession?: MapSession;
  activeRewards?: ActiveReward[];
  activeConsumables?: ActiveConsumable[];
  usables?: UsableItem[];
  settings: {
    soundEnabled: boolean;
    characterImageUrl?: string;
    examDate?: string; // ISO date string for exam countdown
    examName?: string; // Name of the exam
    targetScore?: number; // Target exam score percentage
    autoSelectGemOnStart?: boolean; // if no gem selected, auto-pick first on start
  };
  session: {
    mode: 'study' | 'rest';
    elapsedSeconds: number; // study elapsed
    cycleLengthSeconds: number; // study length, default 3000 (50m)
    restElapsedSeconds: number;
    restLengthSeconds: number; // default 600 (10m)
    studyStartedAtISO?: string;
    restStartedAtISO?: string;
    lockedGemId?: string; // gem id locked at study start for XP attribution
    xpThisStudy: number;
    focusIntegralSeconds: number; // sum of focusMultiplier * deltaSeconds during study
    studySecondsThisCycle: number; // accumulated actual study seconds this cycle
    topic?: string;
  };
  analytics: {
    cycles: StudyCycleRecord[];
    mapResults?: MapResult[];
  };
  ui?: {
    lastCycleSummary?: CycleSummary;
    mapIntent?: {
      taskId?: string;
      category?: GemCategory;
      subject?: string;
      topic?: string;
      tags?: string[];
      mapAffixes?: string[];
      targetPercent?: number;
      createdAtISO?: string;
    };
  };
  tasks?: DailyTask[];
  lastTaskGenerationISO?: string; // When tasks were last generated
  loot: {
    momentumSeconds: number; // accumulates while studying
    pityNoRareStreak: number; // consecutive cycles with no Rare+
  };
  mockExams?: MockExamScore[];
  // Spaced Repetition state (SM-2 scheduler per topic/gem)
  srs?: Record<string, SrsItem>;
}

export interface StudyCycleRecord {
  startedAtISO: string;
  endedAtISO: string;
  studySeconds: number;
  avgFocus: number;
  xpGained: number;
  lootCount: number;
  gemId?: string;
  category?: GemCategory;
  topic?: string;
}

export interface CycleSummary {
  record: StudyCycleRecord;
  items: Item[];
  orbs?: { type: string; count: number }[];
}

export interface MapResultTopic {
  gemId: string;
  name: string;
  allocated: number;
  correct?: number;
}

export interface MapResult {
  endedAtISO: string;
  questionCount: number;
  correctAnswers: number;
  accuracy: number; // 0..1
  timeSpentMinutes: number;
  difficultyTier: DifficultyTier;
  affixes: string[];
  lineup: MapResultTopic[];
}

export type UsableKind = 'consumable' | 'reward';

export interface UsableItem {
  id: string;
  name: string;
  description?: string;
  kind: UsableKind;
  payload: {
    consumableId?: string;
    rewardId?: string;
  };
  usesLeft: number;
}

export type TaskKind =
  | 'study_minutes'
  | 'cycles'
  | 'category_minutes'
  | 'topic_accuracy'           // e.g., 20 questions at >= targetPercent
  | 'topic_coverage'           // e.g., finish core set of N questions
  | 'map_objective'            // e.g., complete 1 map with >= targetPercent
  | 'mock_section_target'      // e.g., section mock score >= targetPercent
  | 'error_repair';            // redo recent mistakes count

export interface DailyTask {
  id: string;
  title: string;
  kind: TaskKind;
  target: number; // minutes or cycles
  progress: number; // minutes or cycles
  category?: GemCategory; // for category_minutes
  // Optional roadmap metadata (used by roadmap-style tasks)
  topic?: string;            // e.g., "Geometria Plana", "Forças e Movimento"
  subject?: string;          // e.g., "Physics", "Portuguese"
  targetPercent?: number;    // e.g., 75 means >= 75%
  mapAffixes?: string[];     // suggested affixes for map_objective
  tags?: string[];           // topic tags used for crafting/selection
  reward: { currency: string; amount: number };
  status: 'active' | 'completed' | 'claimed';
}

// SM-2 based SRS metadata
export interface SrsItem {
  id: string;           // gem id or topic id
  ef: number;           // ease factor
  reps: number;         // successful repetitions
  interval: number;     // current interval (days)
  dueISO: string;       // next due date in ISO
  lastReviewISO?: string;
}
