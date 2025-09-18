import type { RewardOption } from '../types/gameTypes';

export const REWARD_OPTIONS: RewardOption[] = [
  // Base (always available)
  {
    id: 'micro_break',
    name: 'Micro Break',
    description: '10–15 minutes leisure break (walk, stretch, quick clip) — no in-game effect',
    durationMinutes: 15,
    type: 'leisure',
    category: 'base'
  },
  {
    id: 'focus_freeze_10',
    name: 'Focus Freeze 10m',
    description: 'Freeze focus depletion for 10 minutes (helps sustain high focus)',
    durationMinutes: 10,
    type: 'buff',
    category: 'base'
  },

  // 50%+
  {
    id: 'random_equip',
    name: 'Random Equipment',
    description: '1 random equipment based on gem level',
    type: 'equipment',
    category: '50%'
  },
  {
    id: 'focus_freeze_15',
    name: 'Focus Freeze 15m',
    description: 'Freeze focus depletion for 15 minutes',
    durationMinutes: 15,
    type: 'buff',
    category: '50%'
  },

  // 70%+
  {
    id: 'triple_loot_15',
    name: 'Loot Surge 15m',
    description: 'Triple loot chance for ~1–2 cycles (15 minutes)',
    durationMinutes: 15,
    type: 'buff',
    category: '70%'
  },
  {
    id: 'deep_work_freeze_20',
    name: 'Deep Work: Focus Freeze 20m',
    description: 'Sustain high focus for a longer block (20 minutes)',
    durationMinutes: 20,
    type: 'buff',
    category: '70%'
  },

  // 85%+
  {
    id: 'triple_loot_30',
    name: 'Loot Surge 30m',
    description: 'Triple loot chance for ~3–4 cycles (30 minutes)',
    durationMinutes: 30,
    type: 'buff',
    category: '85%'
  },
  {
    id: 'focus_freeze_30',
    name: 'Deep Work: Focus Freeze 30m',
    description: 'Longer focus preservation for extended sessions (30 minutes)',
    durationMinutes: 30,
    type: 'buff',
    category: '85%'
  }
];

export function getAvailableRewards(accuracy: number): RewardOption[] {
  const availableCategories: string[] = ['base'];

  if (accuracy >= 0.50) availableCategories.push('50%');
  if (accuracy >= 0.70) availableCategories.push('70%');
  if (accuracy >= 0.85) availableCategories.push('85%');

  return REWARD_OPTIONS.filter(reward =>
    availableCategories.includes(reward.category)
  );
}

export function getRewardsByCategory(accuracy: number): Record<string, RewardOption[]> {
  const availableRewards = getAvailableRewards(accuracy);

  return {
    'base': availableRewards.filter(r => r.category === 'base'),
    '50%': availableRewards.filter(r => r.category === '50%'),
    '70%': availableRewards.filter(r => r.category === '70%'),
    '85%': availableRewards.filter(r => r.category === '85%')
  };
}
