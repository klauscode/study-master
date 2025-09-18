// React 17+ automatic JSX runtime: no React import needed
import type { DeckInfo } from '../../../services/ankiService';

interface DeckListProps {
  decks: DeckInfo[];
  onSelectDeck: (deckName: string) => void;
  onAddCard: (deckName: string) => void;
}

export function DeckList({ decks, onSelectDeck, onAddCard }: DeckListProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
      {decks.map(deck => (
        <DeckCard
          key={deck.name}
          deck={deck}
          onSelect={onSelectDeck}
          onAddCard={onAddCard}
        />
      ))}
    </div>
  );
}

function DeckCard({ deck, onSelect, onAddCard }: {
  deck: DeckInfo;
  onSelect: (deckName: string) => void;
  onAddCard: (deckName: string) => void;
}) {
  const totalCards = deck.cards.new + deck.cards.learning + deck.cards.review;

  return (
    <div style={{
      border: '2px solid var(--border)',
      borderRadius: 20,
      padding: '24px 28px',
      background: 'var(--card-bg)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease'
    }}>
      <div style={{
        fontSize: 18,
        fontWeight: 800,
        marginBottom: 16,
        color: 'var(--accent)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        📚 {deck.name}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 20
      }}>
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>
            {deck.cards.new}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>
            New
          </div>
        </div>
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
            {deck.cards.learning}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>
            Learning
          </div>
        </div>
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>
            {deck.cards.review}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>
            Review
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 12
      }}>
        <button
          onClick={() => onSelect(deck.name)}
          disabled={totalCards === 0}
          style={{
            flex: 1,
            background: totalCards > 0 ? '#ef4444' : 'var(--border)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: totalCards > 0 ? 'pointer' : 'not-allowed',
            opacity: totalCards > 0 ? 1 : 0.5,
            transition: 'all 0.2s ease'
          }}
        >
          🎯 Study Here
        </button>
        <button
          onClick={() => onAddCard(deck.name)}
          style={{
            background: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          ➕ Add Card
        </button>
      </div>
    </div>
  );
}
