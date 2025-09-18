import type { Item } from '../types/gameTypes';

export interface CraftingRequirement {
  canCraft: boolean;
  reason?: string;
  description: string;
}

export interface CraftingAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirements: (item: Item | null, currency: Record<string, number>) => CraftingRequirement;
}

/**
 * Crafting actions with their requirements and descriptions
 */
export const CRAFTING_ACTIONS: CraftingAction[] = [
  {
    id: 'transmute',
    name: 'Transmute',
    description: 'Upgrade a Common item to Magic rarity with 1-2 random affixes',
    icon: '⚡',
    color: '#6aa2ff',
    requirements: (item, currency) => {
      if (!item) {
        return { canCraft: false, reason: 'No item selected', description: 'Select an item to transmute' };
      }
      if (item.rarity !== 'Common') {
        return { canCraft: false, reason: 'Item must be Common rarity', description: 'Only Common items can be transmuted' };
      }
      if ((currency.Transmute || 0) < 1) {
        return { canCraft: false, reason: 'Need 1 Transmute Orb', description: 'Requires 1 Transmute Orb' };
      }
      return { canCraft: true, description: 'Ready to transmute to Magic rarity' };
    }
  },
  {
    id: 'alchemy',
    name: 'Alchemy',
    description: 'Upgrade a Common item to Rare rarity with 2-4 random affixes',
    icon: '🧪',
    color: '#ffcc33',
    requirements: (item, currency) => {
      if (!item) {
        return { canCraft: false, reason: 'No item selected', description: 'Select an item to use alchemy on' };
      }
      if (item.rarity !== 'Common') {
        return { canCraft: false, reason: 'Item must be Common rarity', description: 'Only Common items can be upgraded with alchemy' };
      }
      if ((currency.Alchemy || 0) < 1) {
        return { canCraft: false, reason: 'Need 1 Alchemy Orb', description: 'Requires 1 Alchemy Orb' };
      }
      return { canCraft: true, description: 'Ready to upgrade to Rare rarity' };
    }
  },
  {
    id: 'scour',
    name: 'Scour',
    description: 'Remove all affixes and reset item to Common rarity',
    icon: '🧽',
    color: '#94a3b8',
    requirements: (item, currency) => {
      if (!item) {
        return { canCraft: false, reason: 'No item selected', description: 'Select an item to scour' };
      }
      if (item.rarity === 'Common') {
        return { canCraft: false, reason: 'Item is already Common', description: 'Common items cannot be scoured' };
      }
      if ((currency.Scour || 0) < 1) {
        return { canCraft: false, reason: 'Need 1 Scour Orb', description: 'Requires 1 Scour Orb' };
      }
      return { canCraft: true, description: 'Ready to remove all affixes' };
    }
  },
  {
    id: 'chaos',
    name: 'Chaos',
    description: 'Reroll all affixes on a Rare item while keeping the same number',
    icon: '🌀',
    color: '#f59e0b',
    requirements: (item, currency) => {
      if (!item) {
        return { canCraft: false, reason: 'No item selected', description: 'Select an item to chaos' };
      }
      if (item.rarity !== 'Rare') {
        return { canCraft: false, reason: 'Item must be Rare rarity', description: 'Only Rare items can be chaos orbed' };
      }
      if ((currency.Chaos || 0) < 1) {
        return { canCraft: false, reason: 'Need 1 Chaos Orb', description: 'Requires 1 Chaos Orb' };
      }
      return { canCraft: true, description: `Ready to reroll ${item.affixes?.length || 0} affixes` };
    }
  },
  {
    id: 'regal',
    name: 'Regal',
    description: 'Upgrade Magic item to Rare and add one new affix',
    icon: '👑',
    color: '#c280ff',
    requirements: (item, currency) => {
      if (!item) {
        return { canCraft: false, reason: 'No item selected', description: 'Select an item to regal' };
      }
      if (item.rarity !== 'Magic') {
        return { canCraft: false, reason: 'Item must be Magic rarity', description: 'Only Magic items can be regaled' };
      }
      if ((currency.Regal || 0) < 1) {
        return { canCraft: false, reason: 'Need 1 Regal Orb', description: 'Requires 1 Regal Orb' };
      }
      return { canCraft: true, description: 'Ready to upgrade to Rare and add affix' };
    }
  },
  {
    id: 'augment',
    name: 'Augment',
    description: 'Add one new affix to an item (if space available)',
    icon: '➕',
    color: '#22c55e',
    requirements: (item, currency) => {
      if (!item) {
        return { canCraft: false, reason: 'No item selected', description: 'Select an item to augment' };
      }
      if ((item.affixes?.length || 0) >= 4) {
        return { canCraft: false, reason: 'Item has maximum affixes (4)', description: 'Cannot add more affixes to this item' };
      }
      if ((currency.Augment || 0) < 1) {
        return { canCraft: false, reason: 'Need 1 Augment Orb', description: 'Requires 1 Augment Orb' };
      }
      return { canCraft: true, description: `Ready to add affix (${item.affixes?.length || 0}/4)` };
    }
  },
  {
    id: 'exalted',
    name: 'Exalted',
    description: 'Attempt to add one affix to a Rare item (75% chance)',
    icon: '💎',
    color: '#ef4444',
    requirements: (item, currency) => {
      if (!item) {
        return { canCraft: false, reason: 'No item selected', description: 'Select an item to exalt' };
      }
      if (item.rarity !== 'Rare') {
        return { canCraft: false, reason: 'Item must be Rare rarity', description: 'Only Rare items can be exalted' };
      }
      if ((item.affixes?.length || 0) >= 4) {
        return { canCraft: false, reason: 'Item has maximum affixes (4)', description: 'Cannot add more affixes to this item' };
      }
      if ((currency.Exalted || 0) < 1) {
        return { canCraft: false, reason: 'Need 1 Exalted Orb', description: 'Requires 1 Exalted Orb' };
      }
      return { canCraft: true, description: `75% chance to add affix (${item.affixes?.length || 0}/4)` };
    }
  }
];

/**
 * Get crafting action by ID
 */
export function getCraftingAction(id: string): CraftingAction | undefined {
  return CRAFTING_ACTIONS.find(action => action.id === id);
}

/**
 * Get all crafting requirements for an item
 */
export function getAllCraftingRequirements(item: Item | null, currency: Record<string, number>) {
  return CRAFTING_ACTIONS.map(action => ({
    ...action,
    requirement: action.requirements(item, currency)
  }));
}