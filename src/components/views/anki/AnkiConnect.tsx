// React 17+ automatic JSX runtime: no React import needed

interface AnkiConnectProps {
  connected: boolean | null;
  loading: boolean;
  onCheckConnection: () => void;
  onSync: () => void;
}

export function AnkiConnect({ connected, loading, onCheckConnection, onSync }: AnkiConnectProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        background: connected === true ? 'rgba(34, 197, 94, 0.1)' : connected === false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)',
        border: `2px solid ${connected === true ? 'rgba(34, 197, 94, 0.3)' : connected === false ? 'rgba(239, 68, 68, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
        borderRadius: 16,
        color: connected === true ? '#22c55e' : connected === false ? '#ef4444' : '#94a3b8',
        fontWeight: 700,
        fontSize: 14
      }}>
        <div style={{ fontSize: 16 }}>
          {connected === true ? '✅' : connected === false ? '❌' : '⏳'}
        </div>
        {connected === true ? 'Connected to AnkiConnect' : connected === false ? 'AnkiConnect not available' : 'Checking connection...'}
      </div>

      <button
        onClick={onCheckConnection}
        disabled={loading}
        style={{
          background: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
      >
        🔄 Reconnect
      </button>

      {connected && (
        <button
          onClick={onSync}
          disabled={loading}
          style={{
            background: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          🔄 Sync Anki
        </button>
      )}
    </div>
  );
}
