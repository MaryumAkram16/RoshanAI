import React from 'react';
import { Check, CheckCircle2, Sparkles, Layers } from 'lucide-react';
import { PLATFORM_CONFIGS, PlatformMeta } from './PlatformIcons';

export type PlatformId = 'Upwork' | 'Fiverr' | 'LinkedIn' | 'Freelancer';

interface PlatformSelectorProps {
  selectedPlatforms: PlatformId[];
  onTogglePlatform: (platform: PlatformId) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatforms,
  onTogglePlatform,
  onSelectAll,
  onClearAll,
}) => {
  const platforms: PlatformId[] = ['Upwork', 'LinkedIn', 'Fiverr', 'Freelancer'];
  const allSelected = platforms.every((p) => selectedPlatforms.includes(p));
  const noneSelected = selectedPlatforms.length === 0;

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll();
    }
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Header with Title and Quick Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label
              style={{
                display: 'block',
                fontWeight: 700,
                fontSize: '0.88rem',
                color: '#1A1410',
                margin: 0,
              }}
            >
              Target Platforms
            </label>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 50,
                background: selectedPlatforms.length > 0 ? 'rgba(11, 125, 110, 0.12)' : 'rgba(220, 38, 38, 0.1)',
                color: selectedPlatforms.length > 0 ? '#0B7D6E' : '#DC2626',
                border: `1px solid ${selectedPlatforms.length > 0 ? 'rgba(11, 125, 110, 0.25)' : 'rgba(220, 38, 38, 0.25)'}`,
              }}
            >
              {selectedPlatforms.length} of {platforms.length} selected
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#8B7355', margin: '3px 0 0 0' }}>
            Tailored structure, character limits, and ranking algorithms for each platform.
          </p>
        </div>

        {/* Quick Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={allSelected ? handleClearAll : handleSelectAll}
            style={{
              background: 'transparent',
              border: '1px solid #E8E0D4',
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#5C4B37',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0B7D6E';
              e.currentTarget.style.color = '#0B7D6E';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E8E0D4';
              e.currentTarget.style.color = '#5C4B37';
            }}
          >
            {allSelected ? 'Clear All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* Multi-Select Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
        }}
        className="platform-cards-grid"
      >
        {platforms.map((platformKey) => {
          const config = PLATFORM_CONFIGS[platformKey];
          const isSelected = selectedPlatforms.includes(platformKey);
          const Icon = config.icon;

          return (
            <div
              key={platformKey}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onTogglePlatform(platformKey)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onTogglePlatform(platformKey);
                }
              }}
              style={{
                position: 'relative',
                background: isSelected ? config.bgColor : '#FDFAF5',
                border: `2px solid ${isSelected ? config.brandColor : '#E8E0D4'}`,
                borderRadius: 16,
                padding: '16px 14px',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                boxShadow: isSelected
                  ? `0 8px 24px -6px ${config.brandColor}33, 0 2px 8px rgba(0,0,0,0.04)`
                  : '0 2px 6px rgba(0,0,0,0.02)',
                outline: 'none',
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 120,
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = config.borderColor;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#E8E0D4';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                }
              }}
            >
              {/* Top Row: Logo, Name & Checkbox */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Platform Icon Badge */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: isSelected ? '#fff' : '#fff',
                        border: `1px solid ${isSelected ? config.brandColor + '44' : '#E8E0D4'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={22} color={config.brandColor} />
                    </div>

                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '0.94rem',
                          color: '#1A1410',
                          lineHeight: 1.2,
                        }}
                      >
                        {config.name}
                      </div>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          color: config.brandColor,
                          display: 'inline-block',
                          marginTop: 2,
                        }}
                      >
                        {config.tag}
                      </span>
                    </div>
                  </div>

                  {/* Checkbox Indicator */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: isSelected ? config.brandColor : 'transparent',
                      border: `2px solid ${isSelected ? config.brandColor : '#D1C7B7'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <Check size={13} color="#fff" strokeWidth={3} />}
                  </div>
                </div>

                {/* Subtitle / Platform Target Description */}
                <p
                  style={{
                    fontSize: '0.74rem',
                    color: '#5C4B37',
                    lineHeight: 1.45,
                    margin: '0 0 10px 0',
                  }}
                >
                  {config.subtitle}
                </p>
              </div>

              {/* Bottom Row: Char Limit & Feature Chips */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  borderTop: `1px solid ${isSelected ? config.brandColor + '20' : '#EFE8DE'}`,
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    fontSize: '0.67rem',
                    fontWeight: 700,
                    color: isSelected ? config.brandColor : '#8B7355',
                    background: isSelected ? '#fff' : 'rgba(0,0,0,0.03)',
                    padding: '2px 7px',
                    borderRadius: 4,
                    border: `1px solid ${isSelected ? config.brandColor + '30' : 'transparent'}`,
                  }}
                >
                  {config.charLimit}
                </span>

                <span
                  style={{
                    fontSize: '0.67rem',
                    color: '#8B7355',
                    fontWeight: 600,
                  }}
                >
                  {config.highlights[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .platform-cards-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};
