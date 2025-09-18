import { useState } from 'react';

interface AddDeckProps {
  onClose: () => void;
  onAddDeck: (deckName: string) => Promise<void>;
}

export function AddDeck({ onClose, onAddDeck }: AddDeckProps) {
  const [deckName, setDeckName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await onAddDeck(deckName.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deck');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '2px solid var(--border)',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        margin: 16
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Add New Deck</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: 'var(--fg)',
              opacity: 0.7
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 14,
              fontWeight: 600
            }}>
              Deck Name
            </label>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Enter deck name..."
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 12,
                background: 'var(--bg)',
                color: 'var(--fg)',
                fontSize: 14,
                outline: 'none'
              }}
              autoFocus
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#ef4444',
              fontSize: 14,
              marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '2px solid var(--border)',
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--fg)'
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: loading ? 0.7 : 1
              }}
              disabled={loading || !deckName.trim()}
            >
              {loading ? 'Creating...' : 'Create Deck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}