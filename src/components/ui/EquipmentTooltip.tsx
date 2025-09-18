import React, { useState, useRef, useEffect } from 'react';
import AffixDisplay from './AffixDisplay';
import type { Item } from '../../types/gameTypes';

interface EquipmentTooltipProps {
  item?: Item;
  children: React.ReactNode;
  slotName: string;
}

export default function EquipmentTooltip({ item, children, slotName }: EquipmentTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!item) return;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        x: rect.right + 8,
        y: rect.top
      });
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();

      // Adjust position if tooltip goes off-screen
      let newX = position.x;
      let newY = position.y;

      if (rect.right > window.innerWidth) {
        newX = position.x - rect.width - 16; // Show on left side instead
      }

      if (rect.bottom > window.innerHeight) {
        newY = window.innerHeight - rect.height - 8;
      }

      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    }
  }, [isVisible, position.x, position.y]);

  const rarityColors: Record<string, string> = {
    Common: '#c0c0c0',
    Magic: '#6aa2ff',
    Rare: '#ffcc33',
    Epic: '#c280ff',
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: item ? 'help' : 'default' }}
      >
        {children}
      </div>

      {isVisible && item && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 1000,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 12,
            minWidth: 250,
            maxWidth: 350,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            fontSize: 13,
            lineHeight: 1.4,
            pointerEvents: 'none'
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              color: rarityColors[item.rarity] || '#ffffff',
              fontWeight: 600,
              fontSize: 14
            }}>
              {item.name}
            </div>
            <div style={{
              fontSize: 11,
              opacity: 0.8,
              marginTop: 2
            }}>
              {item.rarity} {slotName} • Item Level {item.itemLevel}
            </div>
          </div>

          {/* Affixes */}
          {item.affixes && item.affixes.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 11,
                opacity: 0.8,
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                Affixes
              </div>
              <AffixDisplay
                affixes={item.affixes}
                itemLevel={item.itemLevel}
                layout="detailed"
              />
            </div>
          )}

          {/* Stats Summary */}
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 8,
            fontSize: 11,
            opacity: 0.9
          }}>
            <div style={{
              fontWeight: 600,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}>
              Equipment Slot
            </div>
            <div>{slotName}</div>
          </div>
        </div>
      )}
    </>
  );
}