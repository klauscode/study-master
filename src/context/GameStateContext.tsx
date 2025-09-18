import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { GameState, Item, EquipmentSlot, ActiveConsumable } from '../types/gameTypes';
import { calculateXpPerMinute, calculateXPForNextLevel, tickFocus, applyStaminaProgress, needsDailyReset } from '../services/experienceService';
import { calculateTotalStatBonus } from '../services/characterService';
import { saveGameState, loadGameState } from '../services/persistenceService';
import { generateRandomItem } from '../services/lootService';
import { addCurrencyTransaction } from '../services/currencyService';
import { applyDecayToGem } from '../services/knowledgeDecayService';
import { loadGemsFromFile, shouldLoadGems } from '../services/gemLoadingService';
import { generateSmartTasks, createTasksFromSuggestions, shouldGenerateNewTasks } from '../services/smartTaskService';
import { createActiveConsumable } from '../services/consumableService';
import consumablesData from '../constants/consumables.json';
import { initSrsItem, reviewSrs } from '../services/srsService';
import ORBS from '../constants/orbs.json';
import type { DailyTask, GemCategory } from '../types/gameTypes';

type Action =
  | { type: 'ADD_XP'; seconds: number }
  | { type: 'TOGGLE_STUDY'; studying: boolean }
  | { type: 'TICK'; deltaSeconds: number; nowMs: number }
  | { type: 'EQUIP_ITEM'; item: Item }
  | { type: 'ADD_TO_INVENTORY'; item: Item }
  | { type: 'RENAME_GEM'; id: string; name: string }
  | { type: 'DELETE_GEM'; id: string }
  | { type: 'CREATE_GEM'; name: string; category: GemCategory }
  | { type: 'SET_ACTIVE_GEM'; id: string }
  | { type: 'EQUIP_FROM_INVENTORY'; itemId: string }
  | { type: 'UNEQUIP_SLOT'; slot: EquipmentSlot }
  | { type: 'RESET_DAILY'; nowISO: string }
  | { type: 'SET_CYCLE_LENGTH'; seconds: number }
  | { type: 'SET_REST_LENGTH'; seconds: number }
  | { type: 'SET_SOUND'; enabled: boolean }
  | { type: 'SET_AUTO_SELECT_GEM'; enabled: boolean }
  | { type: 'SET_CHARACTER_IMAGE_URL'; url: string }
  | { type: 'SET_SESSION_TOPIC'; topic: string }
  | { type: 'START_REST' }
  | { type: 'START_STUDY' }
  | { type: 'COMPLETE_CYCLE' }
  | { type: 'PUSH_CYCLE'; record: { startedAtISO: string; endedAtISO: string; studySeconds: number; avgFocus: number; xpGained: number; lootCount: number; gemId?: string; category?: GemCategory; topic?: string }; items: Item[]; orbs?: { type: string; count: number }[] }
  | { type: 'CLEAR_CYCLE_SUMMARY' }
  | { type: 'TASK_CLAIM'; id: string }
  | { type: 'UPDATE_LOOT'; momentumSeconds: number; pityNoRareStreak: number }
  | { type: 'REPLACE_INVENTORY_ITEM'; id: string; item: Item }
  | { type: 'EARN_CURRENCY'; currency: string; count: number; source: 'loot' | 'task'; description?: string }
  | { type: 'UPDATE_KNOWLEDGE_DECAY'; nowISO: string }
  | { type: 'RECOVER_STAMINA' }
  | { type: 'SET_EXAM_DATE'; date: string }
  | { type: 'SET_EXAM_NAME'; name: string }
  | { type: 'LOAD_GEMS'; gems: import('../types/gameTypes').SubjectGem[] }
  | { type: 'SET_TARGET_SCORE'; score: number }
  | { type: 'ADD_MOCK_EXAM'; exam: import('../types/gameTypes').MockExamScore }
  | { type: 'DELETE_MOCK_EXAM'; examId: string }
  | { type: 'GAIN_XP'; gemId: string; amount: number }
  | { type: 'CONSUME_CURRENCY'; currency: string; count: number }
  | { type: 'START_MAP_SESSION'; mapSession: import('../types/gameTypes').MapSession }
  | { type: 'UPDATE_MAP_PROGRESS'; progress: number }
  | { type: 'END_MAP_SESSION' }
  | { type: 'ACTIVATE_REWARD'; reward: import('../types/gameTypes').ActiveReward }
  | { type: 'EXPIRE_REWARD'; rewardId: string }
  | { type: 'ACTIVATE_CONSUMABLE'; consumable: ActiveConsumable }
  | { type: 'EXPIRE_CONSUMABLE'; consumableId: string }
  | { type: 'REMOVE_FROM_INVENTORY'; itemId: string }
  | { type: 'GENERATE_SMART_TASKS'; force?: boolean }
  | { type: 'SET_MAP_INTENT'; intent: NonNullable<GameState['ui']>['mapIntent'] }
  | { type: 'CLEAR_MAP_INTENT' }
  | { type: 'ADD_TASK_PROGRESS'; id: string; amount: number }
  | { type: 'COMPLETE_TASK'; id: string }
  | { type: 'SRS_REVIEW'; gemId: string; quality: 0 | 1 | 2 | 3 | 4 | 5 }
  | { type: 'CONSUME_REWARD_CHARGE'; rewardType: 'triple_loot'; mode: 'cycles' | 'maps' }
  | { type: 'ADD_USABLE'; usable: import('../types/gameTypes').UsableItem }
  | { type: 'USE_USABLE'; usableId: string }
  | { type: 'REMOVE_USABLE'; usableId: string }
  | { type: 'ADD_MAP_RESULT'; result: import('../types/gameTypes').MapResult }
  | { type: 'RESET_GAME' };

const initialState: GameState = {
  character: { level: 1, xp: 0, equipped: {}, subjectGem: undefined },
  inventory: [
    // Starter equipment set
    { id: 'starter-head', name: 'Student Cap', rarity: 'Magic', slot: 'Head', itemLevel: 1, affixes: [{ id: 'h1', name: '+10% XP Gain', stat: 'xpGainPercent', value: 10 }] },
    { id: 'starter-chest', name: 'Study Vest', rarity: 'Magic', slot: 'Chest', itemLevel: 1, affixes: [{ id: 'c1', name: '+15% Loot Quantity', stat: 'lootQuantityPercent', value: 15 }] },
    { id: 'starter-legs', name: 'Focus Pants', rarity: 'Magic', slot: 'Legs', itemLevel: 1, affixes: [{ id: 'l1', name: '+8% Focus Gain Rate', stat: 'focusGainRatePercent', value: 8 }] },
    { id: 'starter-feet', name: 'Scholar Boots', rarity: 'Magic', slot: 'Feet', itemLevel: 1, affixes: [{ id: 'f1', name: '+12% Gem XP Gain', stat: 'gemXpGainPercent', value: 12 }] },
    { id: 'starter-weapon', name: 'Learning Stylus', rarity: 'Rare', slot: 'Weapon', itemLevel: 2, affixes: [{ id: 'w1', name: '+18% XP Gain', stat: 'xpGainPercent', value: 18 }, { id: 'w2', name: '+10% Loot Rarity', stat: 'lootRarityPercent', value: 10 }] }
  ],
  currency: {
    'Transmute': 200,
    'Map Fragment': 15,
    'Cartographer\'s Chisel': 8,
    'Alchemy': 5,
    'Chaos': 3
  },
  gems: [],
  activeGemId: undefined,
  focus: { multiplier: 1.0, uninterruptedSeconds: 0, pausedAt: null },
  stamina: { current: 100, minutesStudiedToday: 0, lastResetISO: new Date(0).toISOString() },
  isStudying: false,
  saveVersion: 1,
  settings: {
    soundEnabled: true,
    examDate: '', // No default exam date - user must set it
    examName: 'Unicamp Entrance Exam',
    targetScore: 80, // Default 80% target
    autoSelectGemOnStart: false,
  },
  session: { mode: 'study', elapsedSeconds: 0, cycleLengthSeconds: 3000, restElapsedSeconds: 0, restLengthSeconds: 600, lockedGemId: undefined, xpThisStudy: 0, focusIntegralSeconds: 0, studySecondsThisCycle: 0 },
  analytics: { cycles: [] },
  tasks: [],
  lastTaskGenerationISO: undefined,
  loot: { momentumSeconds: 0, pityNoRareStreak: 0 },
  mockExams: [],
  activeRewards: [],
  activeConsumables: [],
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TOGGLE_STUDY': {
      // Prevent starting study without an active gem selected
      if (action.studying && !state.activeGemId) return state;
      // When manually stopping/pausing study, start focus decay timer
      // When resuming, clear decay timer to continue where we left off
      const focus = action.studying
        ? { ...state.focus, pausedAt: null }
        : { ...state.focus, pausedAt: Date.now() };

      return { ...state, isStudying: action.studying, focus };
    }
    case 'TICK': {
      // Focus update
      const equippedItems = Object.values(state.character.equipped).filter((x): x is Item => Boolean(x));
      const focusRateBonus = calculateTotalStatBonus(equippedItems as any, 'focusGainRatePercent');
      const focusCapBonus = calculateTotalStatBonus(equippedItems as any, 'focusCapPercent');
      const fatigueMult = state.stamina.current < 30 ? 0.5 : 1.0;
      const focusGenMult = (1 + focusRateBonus / 100) * fatigueMult;
      const focusCap = 1.5 * (1 + (focusCapBonus || 0) / 100);

      // Check for active focus freeze rewards and expire old ones
      const currentActiveRewards = (state.activeRewards || []).filter(reward => {
        const startTime = new Date(reward.startedAt).getTime();
        const endTime = startTime + (reward.durationMinutes * 60 * 1000);
        return action.nowMs < endTime;
      });

      // Expire outdated active consumables
      const currentActiveConsumables = (state.activeConsumables || []).filter(consumable => {
        return new Date(consumable.endsAt).getTime() > action.nowMs;
      });

      const hasFocusFreeze = currentActiveRewards.some(reward => reward.type === 'focus_freeze');
      const isInMapSession = !!(state.mapSession && state.mapSession.isRunning);

      const f = tickFocus(
        state.focus.multiplier,
        state.focus.uninterruptedSeconds,
        state.isStudying || isInMapSession, // Treat map sessions as studying for focus purposes
        state.focus.pausedAt,
        action.nowMs,
        action.deltaSeconds,
        focusGenMult,
        focusCap,
        state.session.mode === 'rest' || hasFocusFreeze || isInMapSession, // Suppress decay during rest, focus freeze, OR map sessions
        currentActiveConsumables // Pass cleaned consumables for focus effects
      );

      // Stamina progress (while studying OR in map sessions)
      const stamina = (state.isStudying || isInMapSession)
        ? applyStaminaProgress(state.stamina.current, state.stamina.minutesStudiedToday, action.deltaSeconds)
        : { current: state.stamina.current, minutesStudiedToday: state.stamina.minutesStudiedToday };

      let session = state.session;
      if (state.session.mode === 'study' && (state.isStudying || isInMapSession)) {
        session = {
          ...session,
          elapsedSeconds: session.elapsedSeconds + action.deltaSeconds,
          studySecondsThisCycle: session.studySecondsThisCycle + action.deltaSeconds,
          focusIntegralSeconds: session.focusIntegralSeconds + f.multiplier * action.deltaSeconds,
        };
        // accumulate loot momentum
        const loot = { ...state.loot, momentumSeconds: state.loot.momentumSeconds + action.deltaSeconds };
        return { ...state, focus: { ...state.focus, ...f }, stamina: { ...state.stamina, ...stamina }, session, loot };
      } else if (state.session.mode === 'rest') {
        session = { ...session, restElapsedSeconds: session.restElapsedSeconds + action.deltaSeconds };
        // Gentle stamina recovery during rest up to today's dynamic cap
        const dynamicMax = Math.max(0, 100 - Math.floor(state.stamina.minutesStudiedToday / 60) * 10);
        const recoveryPerSecond = 1 / 600; // +1 stamina per 10 minutes of rest
        const newCurrent = state.stamina.current < dynamicMax
          ? Math.min(dynamicMax, state.stamina.current + recoveryPerSecond * action.deltaSeconds)
          : state.stamina.current;
        return { ...state, focus: { ...state.focus, ...f }, stamina: { ...state.stamina, ...stamina, current: Math.round(newCurrent) }, session };
      }

      return {
        ...state,
        focus: { ...state.focus, ...f },
        stamina: { ...state.stamina, ...stamina },
        session,
        activeRewards: currentActiveRewards, // Update to remove expired rewards
        activeConsumables: currentActiveConsumables // Update to remove expired consumables
      };
    }
    case 'ADD_XP': {
      const xpPerMin = calculateXpPerMinute(state);
      const gained = (xpPerMin / 60) * action.seconds;
      let xp = state.character.xp + gained;
      let level = state.character.level;
      let needed = calculateXPForNextLevel(level);
      while (xp >= needed) {
        xp -= needed;
        level += 1;
        needed = calculateXPForNextLevel(level);
      }
      const session = state.session.mode === 'study' ? { ...state.session, xpThisStudy: state.session.xpThisStudy + gained } : state.session;
      // update active gem xp/level with gem-specific bonus
      const equippedItems2 = Object.values(state.character.equipped).filter((x): x is Item => Boolean(x));
      const gemXpBonus = calculateTotalStatBonus(equippedItems2 as any, 'gemXpGainPercent');
      const gemGain = gained * (1 + gemXpBonus / 100);
      // update active gem xp/level, lock to session gem if present
      let gems = state.gems;
      const awardGemId = state.session.lockedGemId ?? state.activeGemId;
      if (awardGemId) {
        gems = state.gems.map((g) => {
          if (g.id !== awardGemId) return g;
          let gxp = g.xp + gemGain;
          let gl = g.level;
          let req = calculateXPForNextLevel(gl);
          while (gxp >= req) {
            gxp -= req;
            gl += 1;
            req = calculateXPForNextLevel(gl);
          }
          return {
            ...g,
            xp: gxp,
            level: gl,
            lastStudiedISO: new Date().toISOString(),
            peakXP: Math.max(g.peakXP || g.xp, gxp)
          };
        });
      }
      // update tasks progress (study minutes)
      const minutesDelta = action.seconds / 60;
      const updatedTasks: DailyTask[] = (state.tasks ?? []).map(t => {
        if (t.status !== 'active') return t;
        if (t.kind === 'study_minutes') {
          const progress = Math.min(t.target, t.progress + minutesDelta);
          return { ...t, progress, status: (progress >= t.target ? ('completed' as 'completed') : ('active' as 'active')) };
        }
        if (t.kind === 'category_minutes') {
          const activeCat = state.gems.find(g => g.id === state.activeGemId)?.category;
          if (activeCat && t.category === activeCat) {
            const progress = Math.min(t.target, t.progress + minutesDelta);
            return { ...t, progress, status: (progress >= t.target ? ('completed' as 'completed') : ('active' as 'active')) };
          }
        }
        return t;
      });
      return { ...state, character: { ...state.character, xp, level }, session, gems, tasks: updatedTasks };
    }
    case 'EQUIP_ITEM': {
      return {
        ...state,
        character: { ...state.character, equipped: { ...state.character.equipped, [action.item.slot]: action.item } },
      };
    }
    case 'EQUIP_FROM_INVENTORY': {
      const idx = state.inventory.findIndex(it => it.id === action.itemId)
      if (idx < 0) return state
      const item = state.inventory[idx]
      const prev = state.character.equipped[item.slot]
      const newInventory = [...state.inventory]
      newInventory.splice(idx, 1)
      if (prev) newInventory.push(prev)
      return {
        ...state,
        inventory: newInventory,
        character: { ...state.character, equipped: { ...state.character.equipped, [item.slot]: item } },
      }
    }
    case 'UNEQUIP_SLOT': {
      const prev = state.character.equipped[action.slot]
      if (!prev) return state
      const { [action.slot]: _, ...restEquipped } = state.character.equipped
      return {
        ...state,
        inventory: [...state.inventory, prev],
        character: { ...state.character, equipped: restEquipped },
      }
    }
    case 'ADD_TO_INVENTORY': {
      return { ...state, inventory: [...state.inventory, action.item] };
    }
    case 'REPLACE_INVENTORY_ITEM': {
      const inventory = state.inventory.map(it => it.id === action.id ? action.item : it)
      return { ...state, inventory }
    }
    case 'RESET_DAILY': {
      // Generate smart tasks on daily reset
      const suggestions = generateSmartTasks(state);
      const existingTaskIds = new Set((state.tasks || []).map(t => t.id));
      const smartTasks = createTasksFromSuggestions(suggestions, existingTaskIds);

      return {
        ...state,
        stamina: { current: 100, minutesStudiedToday: 0, lastResetISO: action.nowISO },
        tasks: smartTasks,
        lastTaskGenerationISO: action.nowISO
      };
    }
    case 'RECOVER_STAMINA': {
      // +1 stamina per 10 minutes during rest periods (if not at max)
      const newStamina = Math.min(100, (state.stamina.current || 0) + 1);
      return { ...state, stamina: { ...state.stamina, current: newStamina } };
    }
    case 'CREATE_GEM': {
      const id = `${Date.now()}-${Math.floor(Math.random()*1e6)}`;
      const gem = { id, name: action.name.trim() || 'Subject Gem', level: 1, xp: 0, category: action.category } as const;
      const gems = [...state.gems, gem as any];
      return { ...state, gems, activeGemId: state.activeGemId ?? id };
    }
    case 'SET_ACTIVE_GEM': {
      if (state.isStudying) return state;
      if (!state.gems.some(g => g.id === action.id)) return state;
      // Reset current study cycle timers when changing gem and clear any locked gem
      const session = {
        ...state.session,
        elapsedSeconds: 0,
        xpThisStudy: 0,
        focusIntegralSeconds: 0,
        studySecondsThisCycle: 0,
        studyStartedAtISO: new Date().toISOString(),
        lockedGemId: undefined,
      };
      // Reset streak when changing topics
      const focus = { ...state.focus, uninterruptedSeconds: 0 };
      return { ...state, activeGemId: action.id, session, focus };
    }
    case 'RENAME_GEM': {
      const name = action.name.trim();
      if (!name) return state;
      const gems = state.gems.map(g => (g.id === action.id ? { ...g, name } : g));
      return { ...state, gems };
    }
    case 'DELETE_GEM': {
      const gems = state.gems.filter(g => g.id !== action.id);
      const activeGemId = state.activeGemId === action.id ? (gems[0]?.id) : state.activeGemId;
      return { ...state, gems, activeGemId };
    }
    case 'SET_CYCLE_LENGTH': {
      return { ...state, session: { ...state.session, cycleLengthSeconds: action.seconds } };
    }
    case 'SET_REST_LENGTH': {
      return { ...state, session: { ...state.session, restLengthSeconds: action.seconds } };
    }
    case 'SET_SOUND': {
      return { ...state, settings: { ...state.settings, soundEnabled: action.enabled } };
    }
    case 'SET_AUTO_SELECT_GEM': {
      return { ...state, settings: { ...state.settings, autoSelectGemOnStart: action.enabled } };
    }
    case 'SET_CHARACTER_IMAGE_URL': {
      return { ...state, settings: { ...state.settings, characterImageUrl: action.url } };
    }
    case 'SET_SESSION_TOPIC': {
      return { ...state, session: { ...state.session, topic: action.topic } };
    }
    case 'START_REST': {
      return {
        ...state,
        isStudying: false,
        focus: { ...state.focus, pausedAt: null }, // Don't decay focus during natural rest - preserve it
        session: { ...state.session, mode: 'rest', restElapsedSeconds: 0, restStartedAtISO: new Date().toISOString(), lockedGemId: undefined },
      };
    }
    case 'START_STUDY': {
      // If no active gem, optionally auto-select first gem when enabled
      let activeGemId = state.activeGemId;
      if (!activeGemId && state.settings.autoSelectGemOnStart && (state.gems?.length || 0) > 0) {
        activeGemId = state.gems[0]!.id;
      }
      if (!activeGemId) return state; // still block if none available
      return {
        ...state,
        activeGemId,
        isStudying: true,
        session: {
          ...state.session,
          mode: 'study',
          elapsedSeconds: 0,
          xpThisStudy: 0,
          focusIntegralSeconds: 0,
          studySecondsThisCycle: 0,
          studyStartedAtISO: new Date().toISOString(),
          lockedGemId: activeGemId,
        },
      };
    }
    case 'COMPLETE_CYCLE': {
      return { ...state, session: { ...state.session, elapsedSeconds: 0 } };
    }
    case 'PUSH_CYCLE': {
      const cycles = [...state.analytics.cycles, action.record];
      if (cycles.length > 1000) cycles.shift();
      // update cycle count tasks
      const updatedTasks: DailyTask[] = (state.tasks ?? []).map(t => {
        if (t.status !== 'active') return t;
        if (t.kind === 'cycles') {
          const progress = Math.min(t.target, t.progress + 1);
          return { ...t, progress, status: (progress >= t.target ? ('completed' as 'completed') : ('active' as 'active')) };
        }
        return t;
      });
      return { ...state, analytics: { cycles }, tasks: updatedTasks, ui: { ...(state.ui ?? {}), lastCycleSummary: { record: action.record, items: action.items, orbs: action.orbs } } };
    }
    case 'CLEAR_CYCLE_SUMMARY': {
      const ui = { ...(state.ui ?? {}) } as any;
      delete ui.lastCycleSummary;
      return { ...state, ui };
    }
    case 'TASK_CLAIM': {
      const tasks: DailyTask[] = (state.tasks ?? []).map(t => (t.id === action.id && t.status === 'completed' ? { ...t, status: 'claimed' as const } : t));
      const found = (state.tasks ?? []).find(t => t.id === action.id);
      const currency = { ...state.currency } as any;
      let currencyLedger = state.currencyLedger;

      if (found && found.status === 'completed') {
        currency[found.reward.currency] = (currency[found.reward.currency] ?? 0) + found.reward.amount;
        // Track task reward in ledger
        currencyLedger = addCurrencyTransaction(
          currencyLedger,
          found.reward.currency,
          found.reward.amount,
          'task',
          `Task reward: ${found.title}`
        );
      }
      return { ...state, tasks, currency, currencyLedger };
    }
    case 'ADD_TASK_PROGRESS': {
      const tasks: DailyTask[] = (state.tasks ?? []).map(t => {
        if (t.id !== action.id || t.status !== 'active') return t;
        const progress = Math.min(t.target, (t.progress || 0) + Math.max(0, action.amount));
        const done = progress >= t.target;
        return { ...t, progress, status: done ? 'completed' as const : 'active' as const };
      });
      return { ...state, tasks };
    }
    case 'COMPLETE_TASK': {
      const tasks: DailyTask[] = (state.tasks ?? []).map(t => (t.id === action.id && t.status === 'active') ? { ...t, status: 'completed' as const, progress: Math.max(t.target, t.progress || 0) } : t);
      return { ...state, tasks };
    }
    case 'SRS_REVIEW': {
      const srs = { ...(state.srs ?? {}) } as any;
      const now = new Date();
      const cur = srs[action.gemId] ?? initSrsItem(action.gemId, now);
      srs[action.gemId] = reviewSrs(cur, action.quality as any, now);
      return { ...state, srs } as any;
    }
    case 'ADD_MAP_RESULT': {
      const prev = state.analytics.mapResults || [];
      const mapResults = [...prev, action.result];
      if (mapResults.length > 500) mapResults.shift();
      return { ...state, analytics: { ...state.analytics, mapResults } } as any;
    }
    case 'SET_MAP_INTENT': {
      const ui = { ...(state.ui ?? {}) } as any;
      ui.mapIntent = { ...(action.intent || {}), createdAtISO: new Date().toISOString() };
      return { ...state, ui };
    }
    case 'CLEAR_MAP_INTENT': {
      if (!state.ui?.mapIntent) return state;
      const ui = { ...(state.ui ?? {}) } as any;
      delete ui.mapIntent;
      return { ...state, ui };
    }
    case 'CONSUME_CURRENCY': {
      const currency = { ...state.currency }
      const cur = currency[action.currency] || 0
      const actualSpent = Math.min(cur, action.count); // Track what was actually spent
      currency[action.currency] = Math.max(0, cur - action.count)

      let currencyLedger = state.currencyLedger;
      if (actualSpent > 0) {
        // Track currency spending in ledger
        currencyLedger = addCurrencyTransaction(
          currencyLedger,
          action.currency,
          actualSpent,
          'spent',
          'Crafting expense'
        );
      }

      return { ...state, currency, currencyLedger }
    }
    case 'EARN_CURRENCY': {
      const currency = { ...state.currency } as any;
      currency[action.currency] = (currency[action.currency] || 0) + action.count;

      let currencyLedger = state.currencyLedger;
      if (action.count > 0) {
        currencyLedger = addCurrencyTransaction(
          currencyLedger,
          action.currency,
          action.count,
          action.source,
          action.description
        );
      }
      return { ...state, currency, currencyLedger };
    }
    case 'UPDATE_LOOT': {
      return { ...state, loot: { momentumSeconds: action.momentumSeconds, pityNoRareStreak: action.pityNoRareStreak } };
    }
    case 'UPDATE_KNOWLEDGE_DECAY': {
      const gems = state.gems.map(gem => applyDecayToGem(gem, action.nowISO));
      return { ...state, gems };
    }
    case 'SET_EXAM_DATE': {
      return { ...state, settings: { ...state.settings, examDate: action.date } };
    }
    case 'SET_EXAM_NAME': {
      return { ...state, settings: { ...state.settings, examName: action.name } };
    }
    case 'LOAD_GEMS': {
      // Set active gem to first gem if none is set
      const activeGemId = state.activeGemId || action.gems[0]?.id;
      return { ...state, gems: action.gems, activeGemId };
    }
    case 'SET_TARGET_SCORE': {
      return { ...state, settings: { ...state.settings, targetScore: action.score } };
    }
    case 'ADD_MOCK_EXAM': {
      const mockExams = [...(state.mockExams || []), action.exam];
      return { ...state, mockExams };
    }
    case 'DELETE_MOCK_EXAM': {
      const mockExams = (state.mockExams || []).filter(exam => exam.id !== action.examId);
      return { ...state, mockExams };
    }
    case 'GAIN_XP': {
      const updatedGems = state.gems.map(gem =>
        gem.id === action.gemId
          ? { ...gem, xp: gem.xp + action.amount }
          : gem
      );
      return { ...state, gems: updatedGems };
    }
    case 'START_MAP_SESSION': {
      return {
        ...state,
        mapSession: action.mapSession,
        // Keep current studying state - map sessions integrate with main study loop
      };
    }
    case 'UPDATE_MAP_PROGRESS': {
      if (!state.mapSession) return state;
      const clamped = Math.max(0, Math.min(100, action.progress));
      return {
        ...state,
        mapSession: {
          ...state.mapSession,
          progress: clamped,
          // Mark session as no longer running once it reaches 100%
          isRunning: clamped < 100
        }
      };
    }
    case 'END_MAP_SESSION': {
      return {
        ...state,
        mapSession: undefined,
        // Keep current studying state - user can continue studying after map
      };
    }
    case 'ACTIVATE_REWARD': {
      const activeRewards = [...(state.activeRewards || []), action.reward];
      return { ...state, activeRewards };
    }
    case 'EXPIRE_REWARD': {
      const activeRewards = (state.activeRewards || []).filter(r => r.id !== action.rewardId);
      return { ...state, activeRewards };
    }
    case 'ACTIVATE_CONSUMABLE': {
      const activeConsumables = [...(state.activeConsumables || []), action.consumable];
      return { ...state, activeConsumables };
    }
    case 'EXPIRE_CONSUMABLE': {
      const activeConsumables = (state.activeConsumables || []).filter(c => c.id !== action.consumableId);
      return { ...state, activeConsumables };
    }
    case 'ADD_USABLE': {
      const usables = [...(state.usables || []), action.usable]
      return { ...state, usables }
    }
    case 'REMOVE_USABLE': {
      const usables = (state.usables || []).filter(u => u.id !== action.usableId)
      return { ...state, usables }
    }
    case 'USE_USABLE': {
      const usables = [...(state.usables || [])]
      const idx = usables.findIndex(u => u.id === action.usableId)
      if (idx < 0) return state
      const u = usables[idx]
      // Activate based on kind
      if (u.kind === 'consumable' && u.payload.consumableId) {
        const list = (consumablesData as any[])
        const def = list.find(x => x.id === u.payload.consumableId)
        if (def) {
          const ac = createActiveConsumable(def)
          const activeConsumables = [...(state.activeConsumables || []), ac]
          const left = (u.usesLeft || 1) - 1
          if (left <= 0) usables.splice(idx,1)
          else usables[idx] = { ...u, usesLeft: left }
          return { ...state, activeConsumables, usables }
        }
      } else if (u.kind === 'reward' && u.payload.rewardId) {
        const id = u.payload.rewardId
        const isFocus = id.includes('focus')
        const reward: import('../types/gameTypes').ActiveReward = isFocus ? {
          id: `${id}-${Date.now()}`,
          name: 'Focus Freeze',
          startedAt: new Date().toISOString(),
          durationMinutes: 15,
          type: 'focus_freeze',
          mode: 'time'
        } : {
          id: `${id}-${Date.now()}`,
          name: 'Loot Surge',
          startedAt: new Date().toISOString(),
          durationMinutes: 0,
          type: 'triple_loot',
          mode: 'cycles',
          remainingCycles: 2
        }
        const activeRewards = [...(state.activeRewards || []), reward]
        const left = (u.usesLeft || 1) - 1
        if (left <= 0) usables.splice(idx,1)
        else usables[idx] = { ...u, usesLeft: left }
        return { ...state, activeRewards, usables }
      }
      return state
    }
    case 'CONSUME_REWARD_CHARGE': {
      const rewards = [...(state.activeRewards || [])]
      for (let i=0;i<rewards.length;i++){
        const r = rewards[i]
        if (r.type !== action.rewardType) continue
        if (action.mode === 'cycles' && (r.remainingCycles || 0) > 0){
          const remaining = (r.remainingCycles || 0) - 1
          if (remaining <= 0) rewards.splice(i,1)
          else rewards[i] = { ...r, remainingCycles: remaining }
          break
        }
        if (action.mode === 'maps' && (r.remainingMaps || 0) > 0){
          const remaining = (r.remainingMaps || 0) - 1
          if (remaining <= 0) rewards.splice(i,1)
          else rewards[i] = { ...r, remainingMaps: remaining }
          break
        }
      }
      return { ...state, activeRewards: rewards }
    }
    case 'REMOVE_FROM_INVENTORY': {
      const inventory = state.inventory.filter(item => item.id !== action.itemId);
      return { ...state, inventory };
    }
    case 'GENERATE_SMART_TASKS': {
      // Check if we should generate new tasks
      if (!action.force && !shouldGenerateNewTasks(state.lastTaskGenerationISO)) {
        return state;
      }

      const suggestions = generateSmartTasks(state);
      const existingTaskIds = new Set((state.tasks || []).map(t => t.id));
      const newTasks = createTasksFromSuggestions(suggestions, existingTaskIds);

      // Keep existing tasks and add new ones (don't replace)
      const allTasks = [...(state.tasks || []), ...newTasks];

      return {
        ...state,
        tasks: allTasks,
        lastTaskGenerationISO: new Date().toISOString()
      };
    }
    case 'RESET_GAME':
      return initialState;
    default:
      return state;
  }
}

const GameStateContext = createContext<{ state: GameState; dispatch: React.Dispatch<Action> } | null>(null);


export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const saved = loadGameState();
  const hydrate = (s: GameState | null): GameState => {
    if (!s) return initialState;
    // migrate old slots to new slots
    const slotMap: Record<string, EquipmentSlot> = {
      Mind: 'Head',
      Resolve: 'Chest',
      Pacing: 'Legs',
      Conduit: 'Feet',
      Tome: 'Weapon',
      Sigil1: 'Accessory',
      Sigil2: 'Accessory',
    } as any;
    const migrateItem = (it: any): any => {
      if (!it) return it
      const slot = it.slot && (slotMap as any)[it.slot] ? (slotMap as any)[it.slot] : it.slot
      const itemLevel = typeof it.itemLevel === 'number' ? it.itemLevel : ((s as any).character?.level || 1)
      return { ...it, slot, itemLevel }
    };
    const migratedEquipped: any = {};
    if ((s as any).character?.equipped) {
      const eq = (s as any).character.equipped;
      const seen: Partial<Record<EquipmentSlot, boolean>> = {};
      Object.keys(eq).forEach((k) => {
        const mi = migrateItem(eq[k]);
        if (!mi) return;
        const newSlot = mi.slot as EquipmentSlot;
        if (!seen[newSlot]) {
          migratedEquipped[newSlot] = mi;
          seen[newSlot] = true;
        } else {
          // spill to inventory later
          (s as any).inventory = [mi, ...((s as any).inventory || [])];
        }
      });
    }
    const migratedInventory = ((s as any).inventory || []).map(migrateItem);
    return {
      ...initialState,
      ...s,
      character: { ...initialState.character, ...s.character, equipped: migratedEquipped },
      focus: { ...initialState.focus, ...s.focus },
      stamina: { ...initialState.stamina, ...s.stamina },
      session: s.session ? { ...initialState.session, ...s.session } : { ...initialState.session },
      gems: Array.isArray((s as any).gems) ? (s as any).gems : initialState.gems,
      activeGemId: (s as any).activeGemId ?? initialState.activeGemId,
      analytics: (s as any).analytics ?? initialState.analytics,
      settings: (s as any).settings ? { ...initialState.settings, ...(s as any).settings } : initialState.settings,
      tasks: (s as any).tasks ?? initialState.tasks,
      loot: (s as any).loot ?? initialState.loot,
      inventory: migratedInventory,
    };
  };
  const [state, dispatch] = useReducer(reducer, hydrate(saved));

  // autosave
  const latestStateRef = useRef(state);
  useEffect(() => { latestStateRef.current = state; }, [state]);
  // Expose state for console KPIs/debugging (dev or preview)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window as any).__studyfall = { getState: () => latestStateRef.current };
      }
    } catch {}
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      saveGameState(latestStateRef.current);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // daily reset check on mount
  useEffect(() => {
    const now = new Date();
    if (needsDailyReset(state.stamina.lastResetISO, now)) {
      dispatch({ type: 'RESET_DAILY', nowISO: now.toISOString() });
    }
  }, []);

  // Ensure tasks exist on first load and generate smart tasks
  useEffect(() => {
    if (!state.tasks || state.tasks.length === 0) {
      dispatch({ type: 'GENERATE_SMART_TASKS', force: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-load gems on first run or when we have too few gems
  useEffect(() => {
    const loadGems = async () => {
      if (shouldLoadGems(state.gems)) {
        console.log('Loading gems from data file...');
        const gems = await loadGemsFromFile();
        if (gems.length > 0) {
          dispatch({ type: 'LOAD_GEMS', gems });
        }
      }
    };
    loadGems();
  }, []); // Only run once on mount

  // Ensure gems are present after a RESET_GAME without remounting the provider
  useEffect(() => {
    let cancelled = false;
    const maybeLoad = async () => {
      if ((state.gems?.length || 0) === 0 && shouldLoadGems(state.gems)) {
        const gems = await loadGemsFromFile();
        if (!cancelled && gems.length > 0) dispatch({ type: 'LOAD_GEMS', gems });
      }
    };
    maybeLoad();
    return () => { cancelled = true; };
  }, [state.gems?.length]);

  // simple ticker to progress focus/stamina and XP while studying
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const delta = Math.max(0, (now - last) / 1000);
      last = now;
      dispatch({ type: 'TICK', deltaSeconds: delta, nowMs: Date.now() });
      if (state.isStudying && state.session.mode === 'study' && delta > 0) {
        dispatch({ type: 'ADD_XP', seconds: delta });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [state.isStudying, state.session.mode]);

  // Auto-pause when the tab becomes hidden to discourage AFK
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible' && state.isStudying) {
        dispatch({ type: 'TOGGLE_STUDY', studying: false });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [state.isStudying]);

  // Knowledge decay update (every 30 seconds)
  useEffect(() => {
    const decayId = setInterval(() => {
      dispatch({ type: 'UPDATE_KNOWLEDGE_DECAY', nowISO: new Date().toISOString() });
    }, 30000); // Update every 30 seconds
    return () => clearInterval(decayId);
  }, []);

  // Stamina recovery during rest (every 10 minutes)
  useEffect(() => {
    if (state.session.mode !== 'rest' || state.stamina.current >= 100) return;

    const staminaRecoveryId = setInterval(() => {
      dispatch({ type: 'RECOVER_STAMINA' });
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(staminaRecoveryId);
  }, [state.session.mode, state.stamina.current]);

  // Periodic daily reset check (handles long-running tabs without reload)
  useEffect(() => {
    const checkId = setInterval(() => {
      const now = new Date();
      if (needsDailyReset(state.stamina.lastResetISO, now)) {
        dispatch({ type: 'RESET_DAILY', nowISO: now.toISOString() });
      }
    }, 60000);
    return () => clearInterval(checkId);
  }, [state.stamina.lastResetISO]);

  // Smart task generation (every hour)
  useEffect(() => {
    const taskGenId = setInterval(() => {
      dispatch({ type: 'GENERATE_SMART_TASKS' });
    }, 60 * 60 * 1000); // Generate tasks every hour
    return () => clearInterval(taskGenId);
  }, []);

  // Auto transitions: study -> rest, rest -> study
  useEffect(() => {
    // Suppress normal study/rest auto-transitions during map sessions
    if (state.mapSession?.isRunning) return;
    if (state.session.mode === 'study' && state.session.elapsedSeconds >= state.session.cycleLengthSeconds) {
      // Award loot and move to rest; capture analytics and summary
      const seed = Date.now() + state.character.level;
      const equippedItems3 = Object.values(state.character.equipped).filter((x): x is Item => Boolean(x));
      const qtyBonus = calculateTotalStatBonus(equippedItems3 as any, 'lootQuantityPercent');
      const rareBiasBonus = calculateTotalStatBonus(equippedItems3 as any, 'lootRarityPercent');

      // Consolidated consumable timing check - now consistent everywhere
      const now = Date.now();
      const isConsumableActive = (consumable: any) => new Date(consumable.endsAt).getTime() > now;

      const getActiveConsumableMultiplier = (effectType: string): number => {
        const activeConsumables = (state.activeConsumables || []).filter(isConsumableActive);

        let multiplier = 1.0;
        for (const consumable of activeConsumables) {
          const effect = consumable.effects.find(e => e.type === effectType);
          if (effect) multiplier *= effect.value;
        }
        return multiplier;
      };

      const lootQuantityMultiplier = getActiveConsumableMultiplier('loot_quantity');
      const lootRarityMultiplier = getActiveConsumableMultiplier('loot_rarity');

      const baseCount = 3 + Math.floor(state.focus.multiplier * 2.0); // Guaranteed 4-5 items at 1.0 focus
      const momentumBonus = Math.min(2, Math.floor((state.loot.momentumSeconds || 0) / 900)); // +1 item per 15m momentum, max +2
      let count = Math.max(3, Math.round((baseCount + momentumBonus) * (1 + qtyBonus / 100) * lootQuantityMultiplier));

      // Check for active triple loot buff using consistent timing
      const hasTripleLoot = (state.activeRewards || []).some(reward => {
        if (reward.type !== 'triple_loot') return false;
        // cycles-based charges
        if ((reward.remainingCycles || 0) > 0) return true;
        // time-based
        const startTime = new Date(reward.startedAt).getTime();
        const endTime = startTime + (reward.durationMinutes * 60 * 1000);
        return now < endTime;
      });

      if (hasTripleLoot) {
        count *= 3; // Triple the loot count
      }

      const itemLevel = state.gems.find(g => g.id === state.activeGemId)?.level || state.character.level;

      // Fixed rarity bias calculation - more predictable and balanced
      const avgFocusThisCycle = state.session.studySecondsThisCycle > 0 ?
        state.session.focusIntegralSeconds / state.session.studySecondsThisCycle :
        state.focus.multiplier;
      const focusBonus = Math.max(0, (avgFocusThisCycle - 1.0) * 0.5); // 0 to 0.25 bonus
      const gearBonus = Math.max(0, (rareBiasBonus / 100) * lootRarityMultiplier); // Gear + consumable bonus
      const rarityBias = Math.min(0.75, focusBonus + gearBonus); // Cap at 75% bias
      // rolls: each roll either item or orb (15%)
      const items: Item[] = [];
      const orbs: Record<string, number> = {};
      let s = seed;
      const rng = () => { s = (1664525 * s + 1013904223) % 4294967296; return s / 4294967296; };
      const pickOrb = () => {
        const arr = (ORBS as any[]);
        const total = arr.reduce((a,b)=>a + b.weight, 0);
        let r = rng() * total;
        for (const o of arr) { r -= o.weight; if (r <= 0) return o.type as string; }
        return arr[arr.length-1].type as string;
      };
      for (let i=0;i<count;i++){
        if (rng() < 0.35){ // Increased orb chance from 15% to 35%
          const t = pickOrb();
          orbs[t] = (orbs[t]||0) + 1;
        } else {
          items.push(generateRandomItem(seed + i + 1, itemLevel, rarityBias));
        }
      }

      // Improved orb distribution - add guaranteed to random instead of overwriting
      const guaranteedOrbs = {
        'Map Fragment': 4,
        'Transmute': 2,
        'Cartographer\'s Chisel': 1, // ADD: Guarantee 1 chisel per cycle for exam prep
        'Augment': 1,
        'Alchemy': 1,
        'Chaos': 1
      };

      Object.entries(guaranteedOrbs).forEach(([orbType, minCount]) => {
        const currentCount = orbs[orbType] || 0;
        // If we didn't get enough from random rolls, add the difference
        if (currentCount < minCount) {
          orbs[orbType] = minCount;
        }
        // If we got more than minimum from random, keep the higher amount
      });
      const hasRare = items.some(it => it.rarity === 'Rare' || it.rarity === 'Epic');
      let pityNoRareStreak = state.loot.pityNoRareStreak || 0;
      if (!hasRare) pityNoRareStreak += 1; else pityNoRareStreak = 0;
      if (pityNoRareStreak >= 2 && items.length > 0) {
        // ensure at least one Rare by upgrading last item
        items[items.length - 1] = { ...items[items.length - 1], rarity: 'Rare' as any };
        pityNoRareStreak = 0;
      }
      for (const it of items) dispatch({ type: 'ADD_TO_INVENTORY', item: it });
      // If triple_loot is cycles-based, consume one charge per cycle
      const hasCycleCharge = (state.activeRewards || []).some(r => r.type==='triple_loot' && (r.remainingCycles||0) > 0)
      if (hasCycleCharge) {
        dispatch({ type: 'CONSUME_REWARD_CHARGE', rewardType: 'triple_loot', mode: 'cycles' })
      }
      for (const [t,c] of Object.entries(orbs)) {
        dispatch({ type: 'EARN_CURRENCY', currency: t, count: c, source: 'loot', description: 'Study cycle reward' });
      }

      const studySeconds = Math.floor(state.session.studySecondsThisCycle);
      const avgFocus = state.session.studySecondsThisCycle > 0 ? state.session.focusIntegralSeconds / state.session.studySecondsThisCycle : state.focus.multiplier;
      const nowISO = new Date().toISOString();
      const startedAtISO = state.session.studyStartedAtISO ?? nowISO;
      const record = {
        startedAtISO,
        endedAtISO: nowISO,
        studySeconds,
        avgFocus: Number(avgFocus.toFixed(3)),
        xpGained: Math.round(state.session.xpThisStudy),
        lootCount: items.length,
        gemId: state.activeGemId,
        category: state.gems.find(g => g.id === state.activeGemId)?.category,
        topic: state.session.topic,
      } as const;

      const orbsArr = Object.entries(orbs).map(([type,count]) => ({ type, count }))
      dispatch({ type: 'PUSH_CYCLE', record, items, orbs: orbsArr });
      dispatch({ type: 'UPDATE_LOOT', momentumSeconds: 0, pityNoRareStreak });
      dispatch({ type: 'COMPLETE_CYCLE' });
      dispatch({ type: 'START_REST' });
      // play a soft beep
      if (state.settings.soundEnabled) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = 660;
          o.connect(g);
          g.connect(ctx.destination);
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
          o.start();
          o.stop(ctx.currentTime + 0.4);
        } catch {}
      }
    }
    if (state.session.mode === 'rest' && state.session.restElapsedSeconds >= state.session.restLengthSeconds) {
      dispatch({ type: 'START_STUDY' });
    }
  }, [state.mapSession?.isRunning, state.session.mode, state.session.elapsedSeconds, state.session.cycleLengthSeconds, state.session.restElapsedSeconds, state.session.restLengthSeconds, state.character.level, state.focus.multiplier]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider');
  return ctx;
}





