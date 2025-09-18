import type { Item } from '../types/gameTypes';

export function calculateTotalStatBonus(items: Item[], stat: Item['affixes'][number]['stat']): number {
  return items
    .flatMap((it) => it.affixes)
    .filter((a) => a.stat === stat)
    .reduce((acc, a) => acc + a.value, 0);
}
