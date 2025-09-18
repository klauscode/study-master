import React from 'react';
import { getTodayEarnings, getTotalEarnings } from '../../services/currencyService';
import type { CurrencyLedger } from '../../types/gameTypes';
import ORBS from '../../constants/orbs.json';

interface CurrencyLedgerProps {
  ledger?: CurrencyLedger;
  currentCurrency: Record<string, number>;
}

export default function CurrencyLedgerComponent({ ledger, currentCurrency }: CurrencyLedgerProps) {
  const [view, setView] = React.useState<'summary' | 'transactions'>('summary');

  const todayEarnings = getTodayEarnings(ledger);
  const totalEarnings = getTotalEarnings(ledger);
  const orbTypes = (ORBS as any[]).map(o => o.type as string);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--card-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 600 }}>Currency Ledger</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setView('summary')}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              background: view === 'summary' ? 'var(--accent)' : 'var(--bg)',
              color: view === 'summary' ? 'white' : 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Summary
          </button>
          <button
            onClick={() => setView('transactions')}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              background: view === 'transactions' ? 'var(--accent)' : 'var(--bg)',
              color: view === 'transactions' ? 'white' : 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Transactions
          </button>
        </div>
      </div>

      {view === 'summary' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {/* Current balances */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Current Balance</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
              {orbTypes.map(type => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 8px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
                  <span>{type}</span>
                  <span style={{ fontWeight: 600 }}>{currentCurrency[type] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's earnings */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Today's Earnings</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
              {orbTypes.map(type => {
                const earned = todayEarnings[type] || 0;
                return (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 8px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
                    <span>{type}</span>
                    <span style={{ fontWeight: 600, color: earned > 0 ? '#22c55e' : earned < 0 ? '#ef4444' : 'var(--fg)' }}>
                      {earned > 0 ? '+' : ''}{earned}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total lifetime earnings */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Total Lifetime Earnings</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
              {orbTypes.map(type => {
                const total = totalEarnings[type] || 0;
                return (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 8px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
                    <span>{type}</span>
                    <span style={{ fontWeight: 600 }}>{total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === 'transactions' && (
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Recent Transactions</div>
          {!ledger?.transactions || ledger.transactions.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.7, padding: 8, textAlign: 'center' }}>No transactions yet</div>
          ) : (
            <div style={{ display: 'grid', gap: 4, maxHeight: '200px', overflowY: 'auto' }}>
              {ledger.transactions.slice(0, 20).map(transaction => {
                const isSpent = transaction.source === 'spent';
                const color = isSpent ? '#ef4444' : transaction.source === 'loot' ? '#22c55e' : '#3b82f6';
                const sign = isSpent ? '-' : '+';

                return (
                  <div key={transaction.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 11,
                    padding: '4px 8px',
                    background: 'var(--bg)',
                    borderRadius: 4,
                    border: '1px solid var(--border)'
                  }}>
                    <div>
                      <span>{transaction.type}</span>
                      <span style={{ opacity: 0.7, marginLeft: 4 }}>({transaction.source})</span>
                    </div>
                    <span style={{ color, fontWeight: 600 }}>
                      {sign}{transaction.amount}
                    </span>
                    <span style={{ opacity: 0.6, fontSize: 10 }}>
                      {new Date(transaction.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}