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

/**
 * Get today's date string for ledger tracking
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Add a currency transaction to the ledger
 */
export function addCurrencyTransaction(
  ledger: CurrencyLedger | undefined,
  type: string,
  amount: number,
  source: 'loot' | 'task' | 'spent',
  description?: string
): CurrencyLedger {
  const newTransaction: CurrencyTransaction = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type,
    amount,
    source,
    description
  };

  const today = getTodayDateString();
  const currentLedger = ledger || { transactions: [], dailyTotals: {} };

  // Update transactions (keep last 500)
  const newTransactions = [newTransaction, ...currentLedger.transactions].slice(0, 500);

  // Update daily totals
  const newDailyTotals = { ...currentLedger.dailyTotals };
  if (!newDailyTotals[today]) {
    newDailyTotals[today] = {};
  }
  if (!newDailyTotals[today][type]) {
    newDailyTotals[today][type] = 0;
  }

  if (source === 'spent') {
    newDailyTotals[today][type] -= amount;
  } else {
    newDailyTotals[today][type] += amount;
  }

  return {
    transactions: newTransactions,
    dailyTotals: newDailyTotals
  };
}

/**
 * Get today's earnings for display
 */
export function getTodayEarnings(ledger: CurrencyLedger | undefined): Record<string, number> {
  if (!ledger) return {};

  const today = getTodayDateString();
  return ledger.dailyTotals[today] || {};
}

/**
 * Get total earnings for display
 */
export function getTotalEarnings(ledger: CurrencyLedger | undefined): Record<string, number> {
  if (!ledger) return {};

  const totals: Record<string, number> = {};

  for (const dayTotals of Object.values(ledger.dailyTotals)) {
    for (const [type, amount] of Object.entries(dayTotals)) {
      if (!totals[type]) totals[type] = 0;
      totals[type] += amount;
    }
  }

  return totals;
}