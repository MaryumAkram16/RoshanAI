import React, { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  FileText,
  TrendingUp,
  ShieldCheck,
  Zap,
  Columns,
  Eye,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { PLATFORM_CONFIGS, PlatformId } from './PlatformIcons';
import { ProfileIntelligenceResult } from '../profileIntelligence';

interface ProfileComparisonViewProps {
  originalText: string;
  optimizedResult: ProfileIntelligenceResult;
  platform: PlatformId;
  onCopyOptimized?: () => void;
  copied?: boolean;
  onSmartRefresh?: () => void;
  isRefreshing?: boolean;
  refreshSuccess?: boolean;
}

export const ProfileComparisonView: React.FC<ProfileComparisonViewProps> = ({
  originalText,
  optimizedResult,
  platform,
  onCopyOptimized,
  copied = false,
  onSmartRefresh,
  isRefreshing = false,
  refreshSuccess = false,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side' | 'optimized-only' | 'original-only'>('split');
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const config = PLATFORM_CONFIGS[platform];
  const Icon = config?.icon;

  const originalWordCount = originalText.trim() ? originalText.trim().split(/\s+/).length : 0;
  const originalCharCount = originalText.length;

  const handleCopyOriginal = () => {
    navigator.clipboard.writeText(originalText);
    setCopiedOriginal(true);
    setTimeout(() => setCopiedOriginal(false), 2000);
  };

  const improvements = [
    {
      title: 'SEO & Keyword Injection',
      desc: `${optimizedResult.keywordsInjected.length} high-ranking search terms strategically embedded.`,
      val: `+${optimizedResult.seoScore.keywordDensity}% Density`,
    },
    {
      title: 'Hook & Conversion Framing',
      desc: 'Re-architected with direct value proposition and clear client call-to-action.',
      val: 'Conversion Ready',
    },
    {
      title: 'Platform Policy Compliance',
      desc: `${optimizedResult.compliance.passed ? '100% compliant' : 'Reviewed'} for ${platform} guidelines and character limits.`,
      val: `${optimizedResult.wordCount} words`,
    },
  ];

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 20,
        border: '1px solid #E8E0D4',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 1,
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : 'auto',
        maxHeight: isFullscreen ? '100vh' : 'none',
        display: isFullscreen ? 'flex' : 'block',
        flexDirection: 'column',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          padding: '16px 22px',
          background: '#FDFAF5',
          borderBottom: '1px solid #E8E0D4',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: config?.bgColor || 'rgba(11,125,110,.1)',
              border: `1px solid ${config?.borderColor || '#E8E0D4'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {Icon && <Icon size={18} color={config?.brandColor} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1A1410' }}>
                Before & After Profile Comparison
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: config?.brandColor || '#E87C2E',
                  background: config?.bgColor || 'rgba(232,124,46,.1)',
                  padding: '2px 8px',
                  borderRadius: 50,
                  border: `1px solid ${config?.borderColor || 'transparent'}`,
                }}
              >
                {platform}
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#8B7355', margin: '2px 0 0 0' }}>
              Compare your original raw resume text against the AI reverse-engineered optimization.
            </p>
          </div>
        </div>

        {/* Action Controls & View Mode Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* View Mode Buttons */}
          <div
            style={{
              display: 'flex',
              background: '#F0EBE1',
              padding: 3,
              borderRadius: 50,
              border: '1px solid #E8E0D4',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('split')}
              style={{
                padding: '5px 12px',
                borderRadius: 50,
                fontSize: '0.74rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'split' ? '#fff' : 'transparent',
                color: viewMode === 'split' ? '#1A1410' : '#8B7355',
                boxShadow: viewMode === 'split' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Columns size={13} /> Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setViewMode('optimized-only')}
              style={{
                padding: '5px 12px',
                borderRadius: 50,
                fontSize: '0.74rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'optimized-only' ? '#fff' : 'transparent',
                color: viewMode === 'optimized-only' ? config?.brandColor || '#E87C2E' : '#8B7355',
                boxShadow: viewMode === 'optimized-only' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Sparkles size={13} /> AI Optimized Only
            </button>
            <button
              type="button"
              onClick={() => setViewMode('original-only')}
              style={{
                padding: '5px 12px',
                borderRadius: 50,
                fontSize: '0.74rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'original-only' ? '#fff' : 'transparent',
                color: viewMode === 'original-only' ? '#1A1410' : '#8B7355',
                boxShadow: viewMode === 'original-only' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <FileText size={13} /> Original Only
            </button>
          </div>

          {/* Smart Refresh Button */}
          {onSmartRefresh && (
            <button
              type="button"
              onClick={onSmartRefresh}
              disabled={isRefreshing}
              title={`Re-run SerpAPI intelligence and rewrite only for ${platform}`}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1.5px solid ${refreshSuccess ? '#0B7D6E' : (config?.borderColor || '#E87C2E')}`,
                background: refreshSuccess ? 'rgba(11,125,110,0.1)' : (config?.bgColor || 'rgba(232,124,46,.08)'),
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                color: refreshSuccess ? '#0B7D6E' : (config?.brandColor || '#E87C2E'),
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.74rem',
                fontWeight: 700,
                transition: 'all 0.18s ease',
                opacity: isRefreshing ? 0.7 : 1,
              }}
            >
              {isRefreshing ? (
                <Loader2 size={13} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              ) : refreshSuccess ? (
                <Check size={13} color="#0B7D6E" />
              ) : (
                <RefreshCw size={13} />
              )}
              <span>{isRefreshing ? `Refreshing ${platform}...` : refreshSuccess ? 'Refreshed!' : 'Smart Refresh'}</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #E8E0D4',
              background: '#fff',
              cursor: 'pointer',
              color: '#8B7355',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.74rem',
              fontWeight: 600,
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden-mobile">{isFullscreen ? 'Close' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {/* Comparative Key Metrics Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
          padding: '12px 20px',
          background: 'rgba(232, 124, 46, 0.04)',
          borderBottom: '1px solid #E8E0D4',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'rgba(11, 125, 110, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={14} color="#0B7D6E" />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#8B7355', fontWeight: 600 }}>SEO Power Score</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0B7D6E' }}>
              {optimizedResult.seoScore.overall}% <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#8B7355' }}>(Top 5% Rank)</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'rgba(232, 124, 46, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={14} color="#E87C2E" />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#8B7355', fontWeight: 600 }}>Keywords Injected</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#E87C2E' }}>
              +{optimizedResult.keywordsInjected.length} Market Keywords
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'rgba(10, 102, 194, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={14} color="#0A66C2" />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#8B7355', fontWeight: 600 }}>Policy & Char Limit</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0A66C2' }}>
              {optimizedResult.profileText.length} / {optimizedResult.platformLimits.charLimit} chars
            </div>
          </div>
        </div>
      </div>

      {/* Main Side-by-Side Comparison Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            viewMode === 'split'
              ? 'repeat(auto-fit, minmax(320px, 1fr))'
              : '1fr',
          gap: 0,
          flex: 1,
          overflowY: 'auto',
          background: '#fff',
        }}
        className="comparison-grid"
      >
        {/* LEFT COLUMN: ORIGINAL RESUME */}
        {(viewMode === 'split' || viewMode === 'original-only') && (
          <div
            style={{
              padding: 20,
              borderRight: viewMode === 'split' ? '1px solid #E8E0D4' : 'none',
              background: '#FDFAF5',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Column Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: '1px solid #E8E0D4',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    background: '#F0EBE1',
                    color: '#5C4B37',
                    padding: '3px 10px',
                    borderRadius: 50,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <FileText size={12} /> Original Resume / Input
                </span>
                <span style={{ fontSize: '0.72rem', color: '#8B7355' }}>
                  {originalWordCount} words · {originalCharCount} chars
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyOriginal}
                style={{
                  background: '#fff',
                  border: '1px solid #E8E0D4',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#5C4B37',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                }}
              >
                {copiedOriginal ? <Check size={12} color="#0B7D6E" /> : <Copy size={12} />}
                {copiedOriginal ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Content Area */}
            <div
              style={{
                flex: 1,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #E8E0D4',
                padding: 16,
                overflowY: 'auto',
                maxHeight: isFullscreen ? 'calc(100vh - 240px)' : 500,
              }}
            >
              {originalText ? (
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    fontSize: '0.84rem',
                    lineHeight: 1.65,
                    color: '#5C4B37',
                    margin: 0,
                  }}
                >
                  {originalText}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#8B7355', fontSize: '0.82rem' }}>
                  No raw resume text available.
                </div>
              )}
            </div>

            {/* Note badge */}
            <div
              style={{
                marginTop: 12,
                fontSize: '0.72rem',
                color: '#8B7355',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>ℹ️ Raw draft before market intelligence calibration and SerpAPI keyword injection.</span>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: AI-OPTIMIZED PROFILE */}
        {(viewMode === 'split' || viewMode === 'optimized-only') && (
          <div
            style={{
              padding: 20,
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Column Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: '1px solid #E8E0D4',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: config?.bgColor || 'rgba(11,125,110,0.1)',
                    color: config?.brandColor || '#0B7D6E',
                    border: `1px solid ${config?.borderColor || 'rgba(11,125,110,0.25)'}`,
                    padding: '3px 10px',
                    borderRadius: 50,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Sparkles size={12} /> AI-Optimized for {platform}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#8B7355' }}>
                  {optimizedResult.wordCount} words · {optimizedResult.profileText.length} chars
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {onSmartRefresh && (
                  <button
                    type="button"
                    onClick={onSmartRefresh}
                    disabled={isRefreshing}
                    style={{
                      background: refreshSuccess ? 'rgba(11,125,110,0.1)' : 'transparent',
                      border: `1px solid ${refreshSuccess ? '#0B7D6E' : (config?.borderColor || '#E87C2E')}`,
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: isRefreshing ? 'not-allowed' : 'pointer',
                      color: refreshSuccess ? '#0B7D6E' : (config?.brandColor || '#E87C2E'),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                      opacity: isRefreshing ? 0.7 : 1,
                    }}
                  >
                    {isRefreshing ? (
                      <Loader2 size={12} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : refreshSuccess ? (
                      <Check size={12} color="#0B7D6E" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    <span>{isRefreshing ? 'Refreshing...' : refreshSuccess ? 'Refreshed' : 'Smart Refresh'}</span>
                  </button>
                )}

                {onCopyOptimized && (
                  <button
                    type="button"
                    onClick={onCopyOptimized}
                    style={{
                      background: config?.bgColor || 'rgba(232,124,46,.1)',
                      border: `1px solid ${config?.borderColor || '#E87C2E'}`,
                      borderRadius: 6,
                      padding: '4px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: config?.brandColor || '#E87C2E',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied Optimized' : 'Copy Optimized'}
                  </button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div
              style={{
                flex: 1,
                background: '#FDFAF5',
                borderRadius: 12,
                border: `1.5px solid ${config?.borderColor || '#E8E0D4'}`,
                padding: 16,
                overflowY: 'auto',
                maxHeight: isFullscreen ? 'calc(100vh - 240px)' : 500,
              }}
            >
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  fontSize: '0.86rem',
                  lineHeight: 1.7,
                  color: '#1A1410',
                  margin: 0,
                }}
              >
                {optimizedResult.profileText}
              </pre>
            </div>

            {/* Keyword tags preview */}
            {optimizedResult.keywordsInjected.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0B7D6E', marginBottom: 6 }}>
                  ✓ Injected Market Keywords:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {optimizedResult.keywordsInjected.map((kw, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.67rem',
                        fontWeight: 600,
                        background: 'rgba(11,125,110,0.08)',
                        color: '#0B7D6E',
                        border: '1px solid rgba(11,125,110,0.2)',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .comparison-grid {
            grid-template-columns: 1fr !important;
          }
          .hidden-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
