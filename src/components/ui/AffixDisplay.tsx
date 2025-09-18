import { formatAffixWithTier } from '../../services/affixService';
import type { ItemAffix } from '../../types/gameTypes';

interface AffixDisplayProps {
  affixes: ItemAffix[];
  itemLevel: number;
  layout?: 'compact' | 'detailed';
  className?: string;
}

export default function AffixDisplay({ affixes, itemLevel, layout = 'detailed', className }: AffixDisplayProps) {
  if (!affixes || affixes.length === 0) {
    return (
      <div className={className} style={{ fontSize: 12, opacity: 0.7 }}>
        No affixes
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div className={className} style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {affixes.map(affix => {
          const formatted = formatAffixWithTier(affix, itemLevel);
          return (
            <span
              key={affix.id}
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 12,
                backgroundColor: formatted.tierInfo.color + '20',
                border: `1px solid ${formatted.tierInfo.color}`,
                color: formatted.tierInfo.color,
                fontWeight: 500
              }}
            >
              {formatted.tierInfo.tier} {formatted.value}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={className} style={{ display: 'grid', gap: 6 }}>
      {affixes.map(affix => {
        const formatted = formatAffixWithTier(affix, itemLevel);
        return (
          <div
            key={affix.id}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 8px',
              background: 'var(--bg)',
              fontSize: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>{formatted.displayName} {formatted.value}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 4px',
                borderRadius: 4,
                backgroundColor: formatted.tierInfo.color + '20',
                color: formatted.tierInfo.color,
                border: `1px solid ${formatted.tierInfo.color}`
              }}
            >
              {formatted.tierInfo.tier}
            </span>
          </div>
        );
      })}
    </div>
  );
}