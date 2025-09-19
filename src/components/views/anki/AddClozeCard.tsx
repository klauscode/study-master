import { useState } from 'react';
import { ankiService, type ClozeCard } from '../../../services/ankiService';

interface AddClozeCardProps {
  deckName: string;
  onClose: () => void;
  onAddCard: (card: ClozeCard) => Promise<void>;
}

export function AddClozeCard({ deckName, onClose, onAddCard }: AddClozeCardProps) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      // Ensure Cloze model exists first
      await ankiService.ensureClozeModel();

      const clozeCard: ClozeCard = {
        text: text.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      await onAddCard(clozeCard);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to add cloze card: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const insertCloze = (clozeText?: string) => {
    const textarea = document.getElementById('cloze-text') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);

    // If no text is selected and no clozeText provided, just insert placeholder
    const textToWrap = clozeText || selectedText || 'text to hide';

    // Find the next cloze number
    const existingClozes = text.match(/\{\{c\d+::/g) || [];
    const nextNumber = existingClozes.length + 1;

    const clozeMarkup = `{{c${nextNumber}::${textToWrap}}}`;

    const newText = text.substring(0, start) + clozeMarkup + text.substring(end);
    setText(newText);

    // Focus back to textarea and position cursor
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + clozeMarkup.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const previewCloze = () => {
    // Simple preview - replace cloze markup with [...] for preview
    return text.replace(/\{\{c\d+::(.*?)\}\}/g, '[...]');
  };

  const examples = [
    {
      title: 'Basic Cloze',
      text: 'The capital of {{c1::France}} is {{c2::Paris}}.'
    },
    {
      title: 'Multiple Clozes',
      text: 'In {{c1::1969}}, {{c2::Neil Armstrong}} became the first person to walk on the {{c3::moon}}.'
    },
    {
      title: 'Programming',
      text: 'To create an array in JavaScript, use {{c1::[]}} or {{c2::new Array()}}.'
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 20,
        padding: 32,
        maxWidth: 700,
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '2px solid var(--border)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24
        }}>
          <h2 style={{ margin: 0, color: 'var(--accent)' }}>🧩 Add Cloze Deletion Card</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: 'var(--fg)'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Adding to deck: <span style={{ color: 'var(--accent)' }}>{deckName}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
              Cloze Text:
            </label>
            <textarea
              id="cloze-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your text with {{c1::cloze deletions}}..."
              style={{
                width: '100%',
                height: 120,
                padding: 12,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg)',
                color: 'var(--fg)',
                fontSize: 14,
                resize: 'vertical'
              }}
              required
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => insertCloze()}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Insert Cloze
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                style={{
                  background: 'var(--border)',
                  color: 'var(--fg)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>

            {showPreview && text && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 14
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Preview (how it will look as a question):</div>
                <div>{previewCloze()}</div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
              Tags (optional):
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg)',
                color: 'var(--fg)',
                fontSize: 14
              }}
            />
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Separate tags with commas
            </div>
          </div>

          {/* Examples */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20
          }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>💡 Examples:</div>
            {examples.map((example, index) => (
              <div key={index} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>
                  {example.title}:
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.1)',
                    padding: 8,
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                  onClick={() => setText(example.text)}
                  title="Click to use this example"
                >
                  {example.text}
                </div>
              </div>
            ))}
          </div>

          {/* Help Text */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
            fontSize: 13
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>🎯 Cloze Deletion Tips:</div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Use <code>{'{{c1::text}}'}</code> format for cloze deletions</li>
              <li>Number them sequentially: c1, c2, c3, etc.</li>
              <li>Each number creates a separate card</li>
              <li>Select text and click "Insert Cloze" for easy formatting</li>
              <li>Great for facts, definitions, and step-by-step processes</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'var(--border)',
                color: 'var(--fg)',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !text.trim()}
              style={{
                background: (loading || !text.trim()) ? 'var(--border)' : '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                cursor: (loading || !text.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Adding...' : 'Add Cloze Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}