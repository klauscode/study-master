import { useState } from 'react';
import { ankiService, type BulkCard } from '../../../services/ankiService';

interface BulkImportProps {
  deckName: string;
  onClose: () => void;
  onImportComplete: (result: { success: number; failed: number; errors: string[] }) => void;
}

export function BulkImport({ deckName, onClose, onImportComplete }: BulkImportProps) {
  const [importText, setImportText] = useState('');
  const [importType, setImportType] = useState<'csv' | 'tab' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
  const [previewCards, setPreviewCards] = useState<BulkCard[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const exampleData = {
    csv: `"What is 2+2?","4","math,basic"
"Capital of France","Paris","geography"
"JavaScript array method to add item","push()","programming,js"`,
    tab: `What is 2+2?	4	math	basic
Capital of France	Paris	geography
JavaScript array method to add item	push()	programming	js`,
    manual: `Front: What is 2+2?
Back: 4
Tags: math, basic

Front: Capital of France
Back: Paris
Tags: geography

Front: JavaScript array method to add item
Back: push()
Tags: programming, js`
  };

  const parseManualFormat = (text: string): BulkCard[] => {
    const cards: BulkCard[] = [];
    const blocks = text.split(/\n\s*\n/).filter(block => block.trim());

    for (const block of blocks) {
      const lines = block.split('\n').map(line => line.trim());
      let front = '';
      let back = '';
      let tags: string[] = [];

      for (const line of lines) {
        if (line.toLowerCase().startsWith('front:')) {
          front = line.substring(6).trim();
        } else if (line.toLowerCase().startsWith('back:')) {
          back = line.substring(5).trim();
        } else if (line.toLowerCase().startsWith('tags:')) {
          tags = line.substring(5).split(',').map(tag => tag.trim()).filter(tag => tag);
        }
      }

      if (front && back) {
        cards.push({ front, back, tags });
      }
    }

    return cards;
  };

  const handlePreview = () => {
    let cards: BulkCard[] = [];

    try {
      switch (importType) {
        case 'csv':
          cards = ankiService.parseCsvText(importText);
          break;
        case 'tab':
          cards = ankiService.parseTabText(importText);
          break;
        case 'manual':
          cards = parseManualFormat(importText);
          break;
      }

      setPreviewCards(cards);
      setShowPreview(true);
    } catch (error) {
      alert('Error parsing cards: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleImport = async () => {
    if (previewCards.length === 0) {
      alert('No cards to import. Please add some cards first.');
      return;
    }

    setLoading(true);
    try {
      const result = await ankiService.addMultipleCards(deckName, previewCards);
      onImportComplete(result);
      onClose();
    } catch (error) {
      alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportText(content);

      // Auto-detect format based on file extension
      if (file.name.endsWith('.csv')) {
        setImportType('csv');
      } else if (file.name.endsWith('.tsv') || file.name.endsWith('.txt')) {
        setImportType('tab');
      }
    };
    reader.readAsText(file);
  };

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
        maxWidth: 800,
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
          <h2 style={{ margin: 0, color: 'var(--accent)' }}>📚 Bulk Import Cards</h2>
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
            Importing to deck: <span style={{ color: 'var(--accent)' }}>{deckName}</span>
          </div>
        </div>

        {!showPreview ? (
          <>
            {/* Format Selection */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Choose Import Format:</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="radio"
                    value="manual"
                    checked={importType === 'manual'}
                    onChange={(e) => setImportType(e.target.value as any)}
                  />
                  <span>Manual Format</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="radio"
                    value="csv"
                    checked={importType === 'csv'}
                    onChange={(e) => setImportType(e.target.value as any)}
                  />
                  <span>CSV</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="radio"
                    value="tab"
                    checked={importType === 'tab'}
                    onChange={(e) => setImportType(e.target.value as any)}
                  />
                  <span>Tab-separated</span>
                </label>
              </div>
            </div>

            {/* File Upload */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Or Upload File:</div>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--bg)',
                  color: 'var(--fg)'
                }}
              />
            </div>

            {/* Example */}
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Example {importType.toUpperCase()} format:
              </div>
              <pre style={{
                margin: 0,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                opacity: 0.8
              }}>
                {exampleData[importType]}
              </pre>
            </div>

            {/* Text Input */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Paste your cards here:
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`Paste your ${importType} formatted cards here...`}
                style={{
                  width: '100%',
                  height: 200,
                  padding: 12,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
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
                onClick={handlePreview}
                disabled={!importText.trim()}
                style={{
                  background: importText.trim() ? '#3b82f6' : 'var(--border)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 20px',
                  cursor: importText.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Preview Cards ({importText.trim() ? 'Ready' : 'Enter text first'})
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Preview */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px 0' }}>
                Preview: {previewCards.length} cards found
              </h3>

              <div style={{
                maxHeight: 300,
                overflow: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg)'
              }}>
                {previewCards.map((card, index) => (
                  <div
                    key={index}
                    style={{
                      padding: 12,
                      borderBottom: index < previewCards.length - 1 ? '1px solid var(--border)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                      Card {index + 1}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Front:</strong> {card.front}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Back:</strong> {card.back}
                    </div>
                    {card.tags && card.tags.length > 0 && (
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        <strong>Tags:</strong> {card.tags.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  background: 'var(--border)',
                  color: 'var(--fg)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 20px',
                  cursor: 'pointer'
                }}
              >
                ← Back to Edit
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                style={{
                  background: loading ? 'var(--border)' : '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 20px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Importing...' : `Import ${previewCards.length} Cards`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}