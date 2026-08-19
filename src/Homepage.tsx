import React, { useState, useEffect, useRef } from 'react';
import { HeroDashboardMockup } from './components/HeroDashboardMockup';

// ── Animated counter hook ──
function useCounter(target: number, duration = 1800, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return val;
}

// ── Truck-art geometric pattern SVG background ──
const TruckArtBg = () => (
  <svg
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.035, pointerEvents: 'none' }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="tp" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <polygon points="40,4 76,60 4,60" fill="none" stroke="#E87C2E" strokeWidth="1" />
        <polygon points="40,20 62,56 18,56" fill="none" stroke="#F2C94C" strokeWidth="0.5" />
        <circle cx="40" cy="40" r="6" fill="none" stroke="#E87C2E" strokeWidth="0.8" />
        <line x1="4" y1="4" x2="76" y2="76" stroke="#E8E0D4" strokeWidth="0.4" />
        <line x1="76" y1="4" x2="4" y2="76" stroke="#E8E0D4" strokeWidth="0.4" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#tp)" />
  </svg>
);

// ── Feature card ──
interface FeatureCardProps {
  icon: string;
  title: string;
  desc: string;
  tag: string;
  color: string;
  delay: number;
  onClick: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, desc, tag, color, delay, onClick }) => {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `linear-gradient(145deg, #fff, ${color}08)` : '#fff',
        border: `1.5px solid ${hovered ? color : '#E8E0D4'}`,
        borderRadius: 20,
        padding: '28px 26px',
        cursor: 'pointer',
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        transform: visible
          ? hovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)'
          : 'translateY(32px) scale(0.96)',
        opacity: visible ? 1 : 0,
        transitionDelay: visible ? `${delay}ms` : '0ms',
        boxShadow: hovered ? `0 20px 48px ${color}22, 0 4px 16px rgba(0,0,0,0.06)` : '0 2px 12px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {hovered && (
        <div style={{ position: 'absolute', top: -60, right: -60, width: 160, height: 160, borderRadius: '50%', background: `${color}10`, pointerEvents: 'none', transition: 'all 0.4s' }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ fontSize: '2rem', lineHeight: 1 }}>{icon}</div>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: color, background: `${color}12`, padding: '4px 10px', borderRadius: 50 }}>{tag}</span>
      </div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: '#1A1410', marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: '0.85rem', color: '#8B7355', lineHeight: 1.65, margin: 0 }}>{desc}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20, color: color, fontSize: '0.8rem', fontWeight: 700 }}>
        Open feature
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
    </div>
  );
};

// ── Stats ──
const StatCard = ({ val, suffix, label, color, active }: { val: number; suffix: string; label: string; color: string; active: boolean }) => {
  const count = useCounter(val, 1600, active);
  return (
    <div style={{ textAlign: 'center', padding: '24px 20px' }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.8rem', fontWeight: 900, color, lineHeight: 1, marginBottom: 6 }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: '0.82rem', color: '#8B7355', fontWeight: 600, letterSpacing: '0.3px' }}>{label}</div>
    </div>
  );
};

// ── Pipeline step ──
const PipeStep = ({ n, label, sub, color, active }: { n: number; label: string; sub: string; color: string; active: boolean }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    opacity: active ? 1 : 0.35,
    transition: 'all 0.5s',
    transform: active ? 'scale(1)' : 'scale(0.9)',
  }}>
    <div style={{
      width: 52, height: 52, borderRadius: '50%',
      background: active ? `linear-gradient(135deg, ${color}, ${color}cc)` : '#E8E0D4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 900, color: '#fff',
      boxShadow: active ? `0 8px 24px ${color}44` : 'none',
      transition: 'all 0.5s',
    }}>{n}</div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1A1410', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.73rem', color: '#8B7355', lineHeight: 1.4 }}>{sub}</div>
    </div>
  </div>
);

// ── Main Homepage ──
interface HomepageProps {
  onNavigate: (page: string) => void;
}

export function Homepage({ onNavigate }: HomepageProps) {
  const [statsVisible, setStatsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 80);
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  // Auto-cycle pipeline steps
  useEffect(() => {
    const interval = setInterval(() => setActiveStep(p => (p + 1) % 5), 1400);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { id: 'intelligence', icon: '🌐', title: 'Intelligence Layer', desc: 'Live JSearch + SerpAPI + OpenAI synthesis. Real market data for Pakistan & global markets — skills, salaries, demand shifts.', tag: 'Live Data', color: '#0B7D6E' },
    { id: 'career', icon: '🎯', title: 'Career Gap Analysis', desc: 'Upload your resume. Get a precision skill gap report against actual live job listings. With YouTube + course roadmap for every missing skill.', tag: 'AI Powered', color: '#E87C2E' },
    { id: 'profile', icon: '✨', title: 'Profile Generator', desc: 'Reverse-engineers top-ranked Upwork, Fiverr, LinkedIn & Freelancer profiles. Generates yours using real competitor patterns + compliance checks.', tag: 'Unique', color: '#7C3AED' },
    { id: 'proposal', icon: '📝', title: 'Proposal Generator', desc: 'Analyzes job descriptions and writes hyper-converting proposals. Suggests market-accurate rates with full justification and smart client questions.', tag: 'Converts', color: '#DC2626' },
    { id: 'salary', icon: '💰', title: 'Salary Negotiation Coach', desc: 'Stop underpricing yourself. Get word-for-word negotiation scripts backed by live market data. Built for Pakistani freelancers who deserve to stop accepting lowball offers.', tag: '🔥 Hot', color: '#0B7D6E' },
  ];

  const steps = [
    { label: 'Upload Resume', sub: 'PDF, DOCX or image', color: '#E87C2E' },
    { label: 'Market Fetch', sub: 'JSearch + SerpAPI', color: '#0B7D6E' },
    { label: 'AI Analysis', sub: 'GPT-4o synthesis', color: '#7C3AED' },
    { label: 'Gap Scoring', sub: 'Multi-factor report', color: '#DC2626' },
    { label: 'Roadmap', sub: 'Courses + certs', color: '#F2C94C' },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#FDFAF5', color: '#1A1410', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@400;700;900&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes spin-slow { to{transform:rotate(360deg)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
      `}</style>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', overflow: 'hidden', background: 'linear-gradient(160deg, #1A1410 0%, #2D1F14 50%, #1A1410 100%)' }}>
        <TruckArtBg />

        {/* Glowing orbs */}
        <div style={{ position: 'absolute', top: '15%', left: '8%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,124,46,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(11,125,110,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Animated logo ring */}
        <div style={{ position: 'absolute', top: '12%', right: '12%', opacity: 0.12, animation: 'spin-slow 20s linear infinite' }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="80" fill="none" stroke="#E87C2E" strokeWidth="1" strokeDasharray="8 4" />
            <circle cx="90" cy="90" r="60" fill="none" stroke="#F2C94C" strokeWidth="0.5" />
            <polygon points="90,20 160,150 20,150" fill="none" stroke="#E87C2E" strokeWidth="0.8" />
          </svg>
        </div>

        <div style={{ maxWidth: 1080, width: '100%', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          {/* Urdu badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(232,124,46,0.12)', border: '1px solid rgba(232,124,46,0.3)', borderRadius: 50, padding: '6px 18px', marginBottom: 32,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)', opacity: heroVisible ? 1 : 0, transition: 'all 0.7s ease',
          }}>
            <span style={{ fontFamily: "'Noto Nastaliq Urdu', serif", color: '#F2C94C', fontSize: '0.9rem' }}>روشن</span>
            <span style={{ width: 1, height: 16, background: 'rgba(232,124,46,0.4)' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#E87C2E' }}>Illuminate Your Career</span>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2.6rem, 6vw, 4.4rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 24,
            color: '#fff',
            transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
            opacity: heroVisible ? 1 : 0,
            transition: 'all 0.8s ease 0.1s',
          }}>
            Pakistan's First{' '}
            <span style={{
              background: 'linear-gradient(135deg, #E87C2E, #F2C94C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              AI Career Intelligence
            </span>{' '}
            Platform
          </h1>

          <p style={{
            fontSize: '1.08rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, maxWidth: 680, margin: '0 auto 36px',
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            opacity: heroVisible ? 1 : 0,
            transition: 'all 0.8s ease 0.2s',
          }}>
            Live market data from JSearch & SerpAPI. Real-time skill gap analysis. Proposal writing that converts. Profile optimization powered by reverse-engineering top-ranked freelancers.
          </p>

          <div style={{
            display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 48,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            opacity: heroVisible ? 1 : 0,
            transition: 'all 0.8s ease 0.3s',
          }}>
            <button
              onClick={() => onNavigate('career')}
              style={{ padding: '14px 32px', borderRadius: 50, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #E87C2E, #F2C94C)', color: '#fff', boxShadow: '0 8px 32px rgba(232,124,46,0.4)', fontFamily: 'inherit', transition: 'all 0.25s', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
            >
              🚀 Start Career Analysis
            </button>
            <button
              onClick={() => onNavigate('intelligence')}
              style={{ padding: '14px 32px', borderRadius: 50, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)', fontFamily: 'inherit', transition: 'all 0.25s', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
            >
              🌐 View Market Data
            </button>
          </div>

          {/* ── LIVE INTERACTIVE DASHBOARD ANIMATION MOCKUP ── */}
          <div style={{
            transform: heroVisible ? 'translateY(0)' : 'translateY(40px)',
            opacity: heroVisible ? 1 : 0,
            transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
            textAlign: 'left',
          }}>
            <HeroDashboardMockup onTryFeature={onNavigate} />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} style={{ background: '#fff', borderBottom: '1px solid #E8E0D4' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0 }}>
          {[
            { val: 170, suffix: 'k+', label: 'Pakistani Freelancers', color: '#E87C2E' },
            { val: 5, suffix: '', label: 'AI-Powered Tools', color: '#0B7D6E' },
            { val: 12, suffix: '+', label: 'Global Markets Tracked', color: '#7C3AED' },
            { val: 6, suffix: '', label: 'AI Pipeline Steps', color: '#DC2626' },
          ].map((s, i) => (
            <div key={i} style={{ borderRight: '1px solid #E8E0D4', borderBottom: '1px solid #E8E0D4' }}>
              <StatCard {...s} active={statsVisible} />
            </div>
          ))}
        </div>
      </section>

      {/* ── PIPELINE ANIMATION ── */}
      <section style={{ padding: '80px 40px', background: '#FDFAF5', position: 'relative', overflow: 'hidden' }}>
        <TruckArtBg />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#E87C2E', marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', fontWeight: 900, color: '#1A1410' }}>5-Step Intelligence Pipeline</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {steps.map((step, i) => (
              <React.Fragment key={i}>
                <div style={{ flex: '1 1 140px', minWidth: 140 }}>
                  <PipeStep n={i + 1} label={step.label} sub={step.sub} color={step.color} active={activeStep >= i} />
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block" style={{ flex: 1, height: 2, marginTop: 25, background: activeStep > i ? `linear-gradient(90deg, ${steps[i].color}, ${steps[i+1].color})` : '#E8E0D4', transition: 'all 0.6s', minWidth: 10, maxWidth: 40 }} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button onClick={() => setActiveStep(0)} style={{ background: 'none', border: '1px solid #E8E0D4', borderRadius: 50, padding: '8px 20px', fontSize: '0.78rem', color: '#8B7355', cursor: 'pointer', fontFamily: 'inherit' }}>
              ↺ Replay animation
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#0B7D6E', marginBottom: 12 }}>Core Features</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', fontWeight: 900, color: '#1A1410', marginBottom: 12 }}>Everything You Need to Win Online</h2>
            <p style={{ color: '#8B7355', fontSize: '0.95rem', maxWidth: 520, margin: '0 auto' }}>Four tools, one purpose: turning Pakistani freelancers into internationally competitive professionals.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {features.map((f, i) => (
              <FeatureCard key={f.id} icon={f.icon} title={f.title} desc={f.desc} tag={f.tag} color={f.color} delay={i * 80} onClick={() => onNavigate(f.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY PAKISTAN ── */}
      <section style={{ padding: '80px 40px', background: 'linear-gradient(160deg, #1A1410, #2D2018)', position: 'relative', overflow: 'hidden' }}>
        <TruckArtBg />
        <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#E87C2E', marginBottom: 16 }}>Our Mission</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.4rem', fontWeight: 900, color: '#fff', marginBottom: 20, lineHeight: 1.2 }}>
            روشن — Illuminating Pakistan's{' '}
            <span style={{ background: 'linear-gradient(135deg,#E87C2E,#F2C94C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Digital Future</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.97rem', lineHeight: 1.8, marginBottom: 48, maxWidth: 640, margin: '0 auto 48px' }}>
            Pakistan has 170,000+ freelancers generating $397M+ annually — yet most are leaving money on the table with weak profiles and generic proposals. Roshan bridges the gap between raw talent and international opportunity.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { icon: '🇵🇰', title: 'Pakistan-First Intelligence', desc: 'Local market data, Urdu-aware tone guidance, and PKR salary benchmarks alongside international rates.' },
              { icon: '⚡', title: 'Real-Time, Not Stale', desc: 'Every analysis pulls from live APIs — not 6-month-old training data. Market conditions change; so do our insights.' },
              { icon: '🏆', title: 'Reverse-Engineering Champions', desc: 'We study what top earners actually do, extract their patterns, and hand them to you.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px 20px', textAlign: 'left' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 40px', background: '#FDFAF5', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#E87C2E,#F2C94C)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 12px 40px rgba(232,124,46,0.35)' }}>
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <path d="M20 2C10.06 2 2 10.06 2 20s8.06 18 18 18c7.52 0 13.97-4.61 16.63-11.26-7.5 1.34-14.83-3.84-16.63-11.14-.84-3.64.55-7.28 3.33-9.82A18.15 18.15 0 0020 5.52V2z" fill="#fff" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 900, color: '#1A1410', marginBottom: 16 }}>Ready to illuminate your career?</h2>
          <p style={{ color: '#8B7355', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 36 }}>Start with a free career gap analysis. No signup required — just upload your resume and pick a target role.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('career')}
              style={{ padding: '14px 32px', borderRadius: 50, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#E87C2E,#F2C94C)', color: '#fff', boxShadow: '0 8px 28px rgba(232,124,46,0.3)', fontFamily: 'inherit', transition: 'all 0.25s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              🎯 Analyze My Career Gap
            </button>
            <button
              onClick={() => onNavigate('profile')}
              style={{ padding: '14px 32px', borderRadius: 50, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', background: '#fff', border: '1.5px solid #E8E0D4', color: '#1A1410', fontFamily: 'inherit', transition: 'all 0.25s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#E87C2E')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#E8E0D4')}
            >
              ✨ Generate My Profiles
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#1A1410', padding: '40px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Roshan AI</span>
          <span style={{ fontFamily: "'Noto Nastaliq Urdu', serif", color: '#E87C2E', fontSize: '0.85rem' }}>روشن</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: '🌐 Intelligence', id: 'intelligence' },
            { label: '🎯 Career', id: 'career' },
            { label: '✨ Profiles', id: 'profile' },
            { label: '📝 Proposals', id: 'proposal' },
            { label: '💰 Salary', id: 'salary' },
          ].map(({ label, id }) => (
            <button key={id} onClick={() => onNavigate(id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', borderRadius: 6, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E87C2E')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
            >{label}</button>
          ))}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)' }}>Powered by OpenAI GPT-4o · JSearch · SerpAPI</div>
      </footer>
    </div>
  );
}
