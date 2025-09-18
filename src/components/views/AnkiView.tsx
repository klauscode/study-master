import { useState, useEffect } from 'react';
import { ankiService, type DeckInfo, type CardInfo } from '../../services/ankiService';
import { AnkiConnect } from './anki/AnkiConnect';
import { DeckList } from './anki/DeckList';
import { AddDeck } from './anki/AddDeck';
import { AddCard } from './anki/AddCard';

export default function AnkiView() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [studyCards, setStudyCards] = useState<CardInfo[]>([]);
  const [currentCard, setCurrentCard] = useState<CardInfo | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddDeck, setShowAddDeck] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (connected) {
      loadDecks();
    }
  }, [connected]);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const isConnected = await ankiService.testConnection();
      setConnected(isConnected);
      setError(null);
    } catch (err) {
      setConnected(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to connect to AnkiConnect: ${errorMessage}`);
      console.error('AnkiConnect connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDecks = async () => {
    try {
      setLoading(true);
      const deckStats = await ankiService.getAllDeckStats();
      setDecks(deckStats);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load decks: ${errorMessage}`);
      console.error('Deck loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectDeck = async (deckName: string) => {
    try {
      setLoading(true);
      setSelectedDeck(deckName);
      const cards = await ankiService.getStudyCards(deckName, 10);
      setStudyCards(cards);
      setCurrentCard(cards[0] || null);
      setShowAnswer(false);
      setError(null);
    } catch (err) {
      setError('Failed to load cards from deck');
    } finally {
      setLoading(false);
    }
  };

  const answerCard = async (ease: number) => {
    if (!currentCard) return;

    try {
      await ankiService.answerCard(currentCard.cardId, ease);

      // Move to next card
      const nextIndex = studyCards.findIndex(card => card.cardId === currentCard.cardId) + 1;
      const nextCard = studyCards[nextIndex] || null;

      setCurrentCard(nextCard);
      setShowAnswer(false);

      // Reload deck stats
      if (selectedDeck) {
        const updatedStats = await ankiService.getDeckStats(selectedDeck);
        setDecks(prev => prev.map(deck =>
          deck.name === selectedDeck ? updatedStats : deck
        ));
      }
    } catch (err) {
      setError('Failed to answer card');
    }
  };


  const syncAnki = async () => {
    try {
      setLoading(true);
      await ankiService.syncAnki();
      await loadDecks();
      setError(null);
    } catch (err) {
      setError('Failed to sync Anki');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeck = async (deckName: string) => {
    try {
      await ankiService.createDeck(deckName);
      await loadDecks();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(errorMessage);
    }
  };

  const [addCardDeck, setAddCardDeck] = useState<string | null>(null);

  const handleShowAddCard = (deckName: string) => {
    setAddCardDeck(deckName);
    setShowAddCard(true);
  };

  const handleAddCard = async (front: string, back: string) => {
    if (!addCardDeck) return;
    try {
      await ankiService.addCard(addCardDeck, front, back);
      await loadDecks(); // Refresh deck stats after adding card
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(errorMessage);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
      maxWidth: '100%',
      width: '100%',
      margin: '0',
      padding: '0'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        padding: '24px 0',
        borderBottom: '2px solid var(--border)',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(220, 38, 38, 0.05))',
        borderRadius: '16px 16px 0 0'
      }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 800,
          marginBottom: 12,
          background: 'linear-gradient(45deg, #ef4444, #dc2626)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🃏 Anki Integration
        </h1>
        <p style={{ fontSize: 16, opacity: 0.8, margin: 0, fontWeight: 500 }}>
          Study your flashcards • Track progress • Sync with Anki
        </p>
      </div>

      <AnkiConnect connected={connected} loading={loading} onCheckConnection={checkConnection} onSync={syncAnki} />

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 16,
          padding: '16px 20px',
          color: '#ef4444',
          fontWeight: 600,
          textAlign: 'center'
        }}>
          ⚠️ {error}
        </div>
      )}

      {showAddDeck && <AddDeck onClose={() => setShowAddDeck(false)} onAddDeck={handleAddDeck} />}
      {showAddCard && addCardDeck && <AddCard deckName={addCardDeck} onClose={() => { setShowAddCard(false); setAddCardDeck(null); }} onAddCard={handleAddCard} />}

      {connected && !selectedDeck && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => setShowAddDeck(true)}>Add Deck</button>
          </div>
          <DeckList decks={decks} onSelectDeck={selectDeck} onAddCard={handleShowAddCard} />
        </>
      )}

      {connected && decks.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '80px 40px',
          background: 'var(--card-bg)',
          borderRadius: 20,
          border: '2px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: 64, marginBottom: 24, opacity: 0.3 }}>🃏</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: 'var(--accent)' }}>
            No decks found
          </div>
          <div style={{ fontSize: 16, opacity: 0.7, maxWidth: 500, margin: '0 auto 24px', lineHeight: 1.5 }}>
            Make sure you have some decks in Anki and try refreshing the connection.
          </div>
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 12,
            padding: '16px 20px',
            color: '#f59e0b',
            fontSize: 14,
            maxWidth: 600,
            margin: '0 auto',
            textAlign: 'left'
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>💡 Troubleshooting Steps:</div>
            <div style={{ marginBottom: 4 }}>1. Make sure Anki is running on your computer</div>
            <div style={{ marginBottom: 4 }}>2. Verify AnkiConnect addon is installed (Tools → Add-ons)</div>
            <div style={{ marginBottom: 4 }}>3. Check that you have at least one deck in Anki</div>
            <div style={{ marginBottom: 4 }}>4. Restart Anki if needed</div>
            <div>5. Click "Reconnect" to try again</div>
          </div>
        </div>
      )}

      {selectedDeck && !showAddCard && (
        <StudySession
          deckName={selectedDeck}
          currentCard={currentCard}
          showAnswer={showAnswer}
          onShowAnswer={() => setShowAnswer(true)}
          onAnswer={answerCard}
          onBack={() => {
            setSelectedDeck(null);
            setCurrentCard(null);
            setShowAnswer(false);
          }}
          cardsRemaining={studyCards.length - (studyCards.findIndex(card => card.cardId === currentCard?.cardId) + 1)}
          onAddCard={() => setShowAddCard(true)}
        />
      )}
    </div>
  );
}

function StudySession({ deckName, currentCard, showAnswer, onShowAnswer, onAnswer, onBack, cardsRemaining, onAddCard }: {
  deckName: string;
  currentCard: CardInfo | null;
  showAnswer: boolean;
  onShowAnswer: () => void;
  onAnswer: (ease: number) => void;
  onBack: () => void;
  cardsRemaining: number;
  onAddCard: () => void;
}) {
  if (!currentCard) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '80px 40px',
        background: 'var(--card-bg)',
        borderRadius: 20,
        border: '2px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: 'var(--accent)' }}>
          All cards completed!
        </div>
        <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 24 }}>
          Great job studying the {deckName} deck!
        </div>
        <button
          onClick={onBack}
          style={{
            background: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          ← Back to Decks
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 24
    }}>
      {/* Study Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        background: 'var(--card-bg)',
        borderRadius: 16,
        border: '2px solid var(--border)'
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            color: 'var(--fg)',
            border: '2px solid var(--border)',
            borderRadius: 12,
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          ← Back
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
            📚 {deckName}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {cardsRemaining} cards remaining
          </div>
        </div>

        <button onClick={onAddCard} style={{ width: '80px' }}>Add Card</button>
      </div>

      {/* Card Display */}
      <div style={{
        border: '2px solid var(--border)',
        borderRadius: 20,
        padding: '40px',
        background: 'var(--card-bg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{
          fontSize: 18,
          lineHeight: 1.6,
          marginBottom: showAnswer ? 32 : 0
        }} dangerouslySetInnerHTML={{ __html: currentCard.question }} />

        {showAnswer && (
          <div style={{
            borderTop: '2px solid var(--border)',
            paddingTop: 32,
            fontSize: 16,
            lineHeight: 1.6,
            opacity: 0.9
          }} dangerouslySetInnerHTML={{ __html: currentCard.answer }} />
        )}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16
      }}>
        {!showAnswer ? (
          <button
            onClick={onShowAnswer}
            style={{
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: 16,
              padding: '16px 32px',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 6px 20px rgba(34, 197, 94, 0.3)'
            }}
          >
            Show Answer
          </button>
        ) : (
          <>
            <button
              onClick={() => onAnswer(1)}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Again
            </button>
            <button
              onClick={() => onAnswer(2)}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Hard
            </button>
            <button
              onClick={() => onAnswer(3)}
              style={{
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Good
            </button>
            <button
              onClick={() => onAnswer(4)}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Easy
            </button>
          </>
        )}
      </div>
    </div>
  );
}