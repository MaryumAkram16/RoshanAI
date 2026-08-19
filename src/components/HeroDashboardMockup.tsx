import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, CheckCircle2, TrendingUp, Zap, Globe, 
  Layers, ArrowUpRight, Cpu, Play, Pause, RotateCcw, 
  Search, ShieldCheck, Flame, Star
} from 'lucide-react';

interface SkillItem {
  name: string;
  category: string;
  initialScore: number;
  targetScore: number;
  tag: string;
  boost: string;
}

const SKILLS_DATA: SkillItem[] = [
  { name: 'React 19 & Next.js', category: 'Frontend', initialScore: 68, targetScore: 98, tag: 'High Demand', boost: '+24% Visibility' },
  { name: 'TypeScript & Node.js', category: 'Backend', initialScore: 55, targetScore: 94, tag: 'Core Match', boost: '+18% Rate' },
  { name: 'GenAI & LLM Integration', category: 'AI/ML', initialScore: 40, targetScore: 96, tag: 'Top 1% Trend', boost: '+35% Invites' },
  { name: 'Cloud Architecture & DB', category: 'DevOps', initialScore: 62, targetScore: 91, tag: 'Enterprise', boost: '+15% Conversion' },
];

const PLATFORMS = [
  { id: 'upwork', name: 'Upwork', color: '#14A800', badge: 'Top Rated Plus', rate: '$75 - $110/hr' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', badge: 'All-Star SEO', rate: 'PKR 6.5M - 9.2M/yr' },
  { id: 'fiverr', name: 'Fiverr Pro', color: '#1DBF73', badge: 'Pro Verified', rate: '$1,200 - $3,500/gig' },
];

const STAGES = [
  { id: 'scan', label: '1. Ingestion & Market Scan', detail: 'Crawling live job benchmarks across JSearch & SerpAPI', icon: Search },
  { id: 'analyze', label: '2. Live Skill Calibration', detail: 'Quantifying competitive gap against Top 1% earners', icon: Cpu },
  { id: 'synthesize', label: '3. AI Profile Synthesis', detail: 'Structuring algorithm-optimized headlines and bio copy', icon: Sparkles },
  { id: 'optimized', label: '4. Verified & SEO Maximized', detail: 'Roshan Score 98/100 · Ready to win international contracts', icon: ShieldCheck },
];

const BIO_TEXT = "Top-Rated Plus Full-Stack & AI Systems Architect with 6+ years scaling distributed web applications and production GenAI pipelines. Architected cloud-native platforms handling 500k+ MAU with sub-100ms latency. Specialized in converting enterprise requirements into performant, secure software architectures.";

export function HeroDashboardMockup({ onTryFeature }: { onTryFeature?: (page: string) => void }) {
  const [stage, setStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [skillProgress, setSkillProgress] = useState<number[]>([68, 55, 40, 62]);
  const [seoScore, setSeoScore] = useState(64);
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-cycle loop
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = 50; // smooth 20fps tick
    const totalCycleTime = 12000; // 12 seconds full loop
    const stepDuration = totalCycleTime / STAGES.length;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = (prev + (intervalTime / totalCycleTime) * 100) % 100;
        const currentStage = Math.min(Math.floor((next / 100) * STAGES.length), STAGES.length - 1);
        setStage(currentStage);
        return next;
      });
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Handle stage specific transitions & animations
  useEffect(() => {
    if (stage === 0) {
      // Ingestion: Reset skills to baseline, low SEO score, reset typewriter
      setSkillProgress(SKILLS_DATA.map(s => s.initialScore));
      setSeoScore(64);
      setTypedChars(0);
    } else if (stage === 1) {
      // Calibrating skills: Skills rise to target values
      setSkillProgress(SKILLS_DATA.map(s => s.targetScore));
      setSeoScore(78);
      setTypedChars(Math.floor(BIO_TEXT.length * 0.25));
    } else if (stage === 2) {
      // Typing profile bio: Typewriter streams forward rapidly
      setSkillProgress(SKILLS_DATA.map(s => s.targetScore));
      setSeoScore(89);
      setTypedChars(Math.floor(BIO_TEXT.length * 0.85));
    } else if (stage === 3) {
      // Fully optimized: Full text, 98% SEO score
      setSkillProgress(SKILLS_DATA.map(s => s.targetScore));
      setSeoScore(98);
      setTypedChars(BIO_TEXT.length);
    }
  }, [stage]);

  // Minor typing tick effect when in typing stage
  useEffect(() => {
    if (stage === 2) {
      const typeInterval = setInterval(() => {
        setTypedChars(prev => (prev < BIO_TEXT.length ? prev + 3 : prev));
      }, 40);
      return () => clearInterval(typeInterval);
    }
  }, [stage]);

  // Platform auto cycling on full loop completion
  useEffect(() => {
    if (stage === 3) {
      const kwInterval = setInterval(() => {
        setActiveKeywordIndex(prev => (prev + 1) % 4);
      }, 900);
      return () => clearInterval(kwInterval);
    }
  }, [stage]);

  const handleStageClick = (idx: number) => {
    setStage(idx);
    setProgress((idx / STAGES.length) * 100 + 2);
  };

  const handleReset = () => {
    setProgress(0);
    setStage(0);
    setTypedChars(0);
    setSeoScore(64);
  };

  const activePlat = PLATFORMS[selectedPlatform];

  return (
    <div style={{
      width: '100%',
      maxWidth: 1040,
      margin: '0 auto',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Background ambient multi-color glow halo */}
      <div style={{
        position: 'absolute',
        inset: -20,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(232, 124, 46, 0.22) 0%, rgba(242, 201, 76, 0.12) 35%, rgba(11, 125, 110, 0.15) 70%, transparent 85%)',
        filter: 'blur(32px)',
        borderRadius: 40,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Main Glassmorphism Frame */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        background: 'linear-gradient(175deg, rgba(38, 28, 22, 0.95) 0%, rgba(26, 20, 16, 0.98) 100%)',
        borderRadius: 24,
        border: '1.5px solid rgba(232, 124, 46, 0.3)',
        boxShadow: '0 30px 80px -15px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        color: '#FDFAF5',
      }}>

        {/* ── TOP WINDOW HEADER ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          {/* Window dots + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', opacity: 0.85 }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', opacity: 0.85 }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', opacity: 0.85 }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.88rem', fontWeight: 700, color: '#fff', letterSpacing: '0.3px' }}>
                Roshan AI Engine
              </span>
              <span style={{ fontFamily: "'Noto Nastaliq Urdu', serif", fontSize: '0.78rem', color: '#F2C94C' }}>
                روشن انٹیلی جنس
              </span>
            </div>
          </div>

          {/* Live Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(11, 125, 110, 0.25)',
              border: '1px solid rgba(11, 125, 110, 0.45)',
              borderRadius: 50,
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#4ADE80',
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#4ADE80',
                boxShadow: '0 0 8px #4ADE80',
                animation: 'pulse 1.5s infinite',
              }} />
              <span>LIVE SYNTHESIS</span>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, padding: 3 }}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                title={isPlaying ? 'Pause simulation' : 'Play simulation'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  padding: '4px 7px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)')}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button
                onClick={handleReset}
                title="Restart simulation"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  padding: '4px 7px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)')}
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ── SMOOTH PROGRESS BAR ── */}
        <div style={{ width: '100%', height: 3, background: 'rgba(255, 255, 255, 0.08)', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #E87C2E, #F2C94C, #0B7D6E)',
            boxShadow: '0 0 10px rgba(232, 124, 46, 0.8)',
            transition: isPlaying ? 'width 0.05s linear' : 'width 0.3s ease',
          }} />
        </div>

        {/* ── STAGE SELECTOR TABS ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 1,
          background: 'rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          {STAGES.map((s, idx) => {
            const Icon = s.icon;
            const isActive = stage === idx;
            return (
              <div
                key={s.id}
                onClick={() => handleStageClick(idx)}
                style={{
                  padding: '12px 16px',
                  background: isActive ? 'rgba(232, 124, 46, 0.12)' : 'rgba(20, 15, 12, 0.6)',
                  borderBottom: isActive ? '2px solid #E87C2E' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: isActive ? 'linear-gradient(135deg, #E87C2E, #F2C94C)' : 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                  flexShrink: 0,
                  transition: 'all 0.3s',
                }}>
                  <Icon size={13} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: isActive ? '#F2C94C' : 'rgba(255, 255, 255, 0.8)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {s.label}
                  </div>
                  <div style={{
                    fontSize: '0.66rem',
                    color: isActive ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {s.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── MOCKUP CONTENT GRID ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          gap: 20,
          padding: '24px 24px 28px',
        }} className="mockup-grid">

          {/* ── LEFT COLUMN: CANDIDATE & LIVE METRICS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Candidate Identity Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: 16,
              padding: '18px 16px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Subtle truck art accent corner */}
              <div style={{ position: 'absolute', top: -10, right: -10, width: 50, height: 50, opacity: 0.15, transform: 'rotate(45deg)', pointerEvents: 'none' }}>
                <div style={{ border: '2px dashed #E87C2E', width: '100%', height: '100%' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                {/* Avatar with dynamic glow ring */}
                <div style={{
                  position: 'relative',
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E87C2E, #7C3AED)',
                  padding: 2.5,
                  boxShadow: stage >= 2 ? '0 0 16px rgba(232, 124, 46, 0.5)' : 'none',
                  transition: 'all 0.5s',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: '#1A1410',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#FDFAF5',
                  }}>
                    HR
                  </div>
                  {stage >= 3 && (
                    <div style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#10B981',
                      border: '2px solid #1A1410',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <CheckCircle2 size={11} color="#fff" />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Hamza R.</div>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(242, 201, 76, 0.15)', color: '#F2C94C', border: '1px solid rgba(242, 201, 76, 0.3)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                      🇵🇰 PK
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#E87C2E', fontWeight: 600, marginTop: 2 }}>
                    AI & Full-Stack Architect
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 }}>
                    Lahore, Pakistan · Remote Global
                  </div>
                </div>
              </div>

              {/* Target Platforms switcher */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {PLATFORMS.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(idx)}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 8,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: selectedPlatform === idx ? `1px solid ${p.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedPlatform === idx ? `${p.color}22` : 'rgba(255, 255, 255, 0.03)',
                      color: selectedPlatform === idx ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {/* Verified Badge & Rate */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Star size={13} color="#F2C94C" fill="#F2C94C" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F2C94C' }}>{activePlat.badge}</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4ADE80' }}>
                  {stage >= 1 ? activePlat.rate : '$45 - $60/hr'}
                </div>
              </div>
            </div>

            {/* Roshan SEO & Market Match Gauge */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: 16,
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={14} color="#E87C2E" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>Roshan SEO Power</span>
                </div>
                <div style={{
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  fontFamily: "'Playfair Display', serif",
                  color: seoScore > 90 ? '#4ADE80' : seoScore > 75 ? '#F2C94C' : '#E87C2E',
                  transition: 'color 0.4s',
                }}>
                  {seoScore}/100
                </div>
              </div>

              {/* Gauge Bar */}
              <div style={{ width: '100%', height: 7, borderRadius: 10, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{
                  width: `${seoScore}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #E87C2E, #F2C94C, #10B981)',
                  borderRadius: 10,
                  transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }} />
              </div>

              {/* Mini Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ padding: '8px 10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.64rem', color: 'rgba(255, 255, 255, 0.45)' }}>Search Impression</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F2C94C', marginTop: 2 }}>
                    {stage >= 2 ? 'Top 3% Ranking' : 'Page 4'}
                  </div>
                </div>
                <div style={{ padding: '8px 10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.64rem', color: 'rgba(255, 255, 255, 0.45)' }}>Client Conv. Rate</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4ADE80', marginTop: 2 }}>
                    {stage >= 2 ? '3.8x Industry Avg' : '1.1x Baseline'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            {onTryFeature && (
              <button
                onClick={() => onTryFeature('profile')}
                style={{
                  background: 'linear-gradient(135deg, rgba(232, 124, 46, 0.2), rgba(242, 201, 76, 0.2))',
                  border: '1px solid rgba(232, 124, 46, 0.4)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: '#F2C94C',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.25s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #E87C2E, #F2C94C)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(232, 124, 46, 0.2), rgba(242, 201, 76, 0.2))';
                  e.currentTarget.style.color = '#F2C94C';
                }}
              >
                <Sparkles size={13} />
                Generate Your Profile Now
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>

          {/* ── RIGHT COLUMN: DYNAMIC SKILLS & LIVE PROFILE SYNTHESIS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Skills Radar & Calibration Bar */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: 16,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={15} color="#0B7D6E" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Market Skill Calibration</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#0B7D6E', background: 'rgba(11, 125, 110, 0.2)', padding: '2px 8px', borderRadius: 50, fontWeight: 700 }}>
                  JSearch API Live Sync
                </div>
              </div>

              {/* Skill Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SKILLS_DATA.map((skill, idx) => {
                  const currentScore = skillProgress[idx] || skill.initialScore;
                  const isBoosted = currentScore > skill.initialScore;
                  return (
                    <div key={skill.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>{skill.name}</span>
                          <span style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.4)', background: 'rgba(255, 255, 255, 0.06)', padding: '1px 5px', borderRadius: 4 }}>
                            {skill.category}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isBoosted && (
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              color: '#10B981',
                              animation: 'fadeIn 0.4s',
                            }}>
                              {skill.boost}
                            </span>
                          )}
                          <span style={{ fontWeight: 800, color: isBoosted ? '#F2C94C' : 'rgba(255, 255, 255, 0.6)' }}>
                            {currentScore}%
                          </span>
                        </div>
                      </div>

                      {/* Bar */}
                      <div style={{ width: '100%', height: 6, borderRadius: 6, background: 'rgba(255, 255, 255, 0.07)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${currentScore}%`,
                          height: '100%',
                          background: isBoosted
                            ? 'linear-gradient(90deg, #E87C2E, #F2C94C)'
                            : 'rgba(255, 255, 255, 0.25)',
                          borderRadius: 6,
                          transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real-Time Profile Text Generation Terminal */}
            <div style={{
              background: 'rgba(15, 11, 8, 0.85)',
              border: '1px solid rgba(232, 124, 46, 0.25)',
              borderRadius: 16,
              padding: '16px 18px',
              position: 'relative',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                {/* Terminal top meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} color="#E87C2E" />
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#E87C2E', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Reverse-Engineered Top 1% Bio
                    </span>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.45)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Flame size={11} color="#F2C94C" />
                    High Keyword Density
                  </div>
                </div>

                {/* Profile Headline */}
                <div style={{
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  color: '#fff',
                  fontFamily: "'Playfair Display', serif",
                  lineHeight: 1.4,
                  marginBottom: 8,
                }}>
                  {stage >= 1 ? (
                    <span>
                      Senior Full-Stack & AI Systems Architect{' '}
                      <span style={{ color: '#F2C94C', fontWeight: 600 }}>| Next.js, Node, GenAI & High-Scale Systems</span>
                    </span>
                  ) : (
                    <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>[Analyzing target platform role...]</span>
                  )}
                </div>

                {/* Typewriter Body */}
                <div style={{
                  fontSize: '0.77rem',
                  lineHeight: 1.65,
                  color: 'rgba(255, 255, 255, 0.85)',
                  minHeight: 68,
                  position: 'relative',
                }}>
                  {stage === 0 ? (
                    <div style={{ color: 'rgba(255, 255, 255, 0.35)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6, paddingTop: 10 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E87C2E', animation: 'pulse 1s infinite' }} />
                      Extracting competitor win-rates and client search patterns...
                    </div>
                  ) : (
                    <>
                      <span>{BIO_TEXT.slice(0, typedChars)}</span>
                      {stage < 3 && (
                        <span style={{
                          display: 'inline-block',
                          width: 2,
                          height: '0.9em',
                          background: '#F2C94C',
                          marginLeft: 2,
                          verticalAlign: 'middle',
                          animation: 'pulse 0.8s infinite',
                        }} />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Tags / High Converting Keywords */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                paddingTop: 12,
                marginTop: 8,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600 }}>
                  Indexed Keywords:
                </span>
                {['Next.js 15', 'GenAI Agents', 'Microservices', 'Enterprise Scalability', '0 to 1 Architecture'].map((kw, i) => (
                  <span
                    key={kw}
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: stage >= 2 && i === activeKeywordIndex
                        ? 'rgba(232, 124, 46, 0.25)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: stage >= 2 && i === activeKeywordIndex
                        ? '#F2C94C'
                        : 'rgba(255, 255, 255, 0.65)',
                      border: stage >= 2 && i === activeKeywordIndex
                        ? '1px solid rgba(242, 201, 76, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'all 0.3s',
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          .mockup-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
