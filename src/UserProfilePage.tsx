import React, { useState, useEffect, useRef } from 'react';
import {
  User, Star, TrendingUp, FileText, Briefcase,
  CheckCircle2, Edit2, Save, Trash2, Copy, Check,
  BarChart2, Award, Globe, Zap, Clock, ChevronDown, ChevronUp, Circle, ArrowRight,
  BookOpen, Plus, X, Settings, Download, AlertCircle,
  Shield, RefreshCw, Target, MessageSquare
} from 'lucide-react';
import {
  loadProfile, saveProfile, updateProfile, clearProfile,
  saveProposal, deleteProposal, markSkillLearned,
  recalculateRoshanScore, getScoreLevel, formatDate,
  UserProfile, SavedProposal, SavedProfile, SavedNegotiation, RoshanScoreHistory
} from './userProfile';
import { useAuth } from './contexts/AuthContext';
import { updateUserProfile } from './lib/firebase';

// ─────────────────────────────────────────────────────────
// SHARED STYLES (inline, self-contained)
// ─────────────────────────────────────────────────────────

const PS = {
  card: { background: '#fff', borderRadius: 20, padding: '24px 26px', border: '1px solid #E8E0D4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' } as React.CSSProperties,
  label: { display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#1A1410', marginBottom: 5 } as React.CSSProperties,
  input: { width: '100%', padding: '10px 13px', borderRadius: 11, border: '1.5px solid #E8E0D4', background: '#fff', fontFamily: 'inherit', fontSize: '0.88rem', color: '#1A1410', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  btnPri: { padding: '10px 20px', borderRadius: 50, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#E87C2E,#F2C94C)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', transition: 'all .2s' } as React.CSSProperties,
  btnGhost: { padding: '8px 16px', borderRadius: 50, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', border: '1px solid #E8E0D4', background: '#F0EBE1', color: '#1A1410', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'all .2s' } as React.CSSProperties,
  badge: (color: string) => ({ background: `${color}15`, color, padding: '3px 10px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 700 } as React.CSSProperties),
  mb: (n: number) => ({ marginBottom: n } as React.CSSProperties),
};

// ─────────────────────────────────────────────────────────
// ROSHAN SCORE RING
// ─────────────────────────────────────────────────────────

const ScoreRing = ({ score, history, size = 140 }: { score: number; history?: RoshanScoreHistory[]; size?: number }) => {
  const level = getScoreLevel(score);
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const dur = 1400;
    const go = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(eased * score);
      if (p < 1) frame = requestAnimationFrame(go);
    };
    frame = requestAnimationFrame(go);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const offset = circ - (animated / 100) * circ;

  return (
    <div 
      style={{ position: 'relative', width: size, height: size, flexShrink: 0, cursor: 'help' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F0EBE1" strokeWidth="10" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={level.color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.9rem', marginBottom: 2 }}>{level.emoji}</span>
        <span style={{ fontSize: '2rem', fontWeight: 900, fontFamily: "'Playfair Display',serif", color: level.color, lineHeight: 1 }}>
          {Math.round(animated)}
        </span>
        <span style={{ fontSize: '0.6rem', color: '#8B7355', fontWeight: 700, letterSpacing: '0.5px', marginTop: 2 }}>/ 100</span>
      </div>
      
      {hovered && history && history.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 15, background: '#1A1410', color: '#fff', padding: '16px', borderRadius: '12px', width: 280, zIndex: 100, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8B7355' }}>Recent Score Changes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 5).map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{h.event}</span>
                <span style={{ color: '#E87C2E', fontWeight: 700, flexShrink: 0, background: 'rgba(232,124,46,0.15)', padding: '2px 6px', borderRadius: 6, fontSize: '0.75rem' }}>{h.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// SCORE BREAKDOWN BAR
// ─────────────────────────────────────────────────────────

const ScoreBar = ({ label, urdu, val, max, color }: { label: string; urdu: string; val: number; max: number; color: string }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
      <div>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1A1410' }}>{label}</span>
        <span style={{ fontSize: '0.7rem', color: '#8B7355', marginLeft: 6, fontFamily: "'Noto Nastaliq Urdu', serif" }}>{urdu}</span>
      </div>
      <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{val} / {max}</span>
    </div>
    <div style={{ height: 6, background: '#E8E0D4', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${(val / max) * 100}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 1s ease-out' }} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────
// SCORE HISTORY MINI CHART
// ─────────────────────────────────────────────────────────

const ScoreHistoryChart = ({ history }: { history: { date: string; score: number; event: string }[] }) => {
  if (history.length < 2) return (
    <div style={{ fontSize: '0.8rem', color: '#8B7355', textAlign: 'center', padding: '20px 0' }}>
      Complete more actions to see your score history
    </div>
  );

  const max = 100;
  const w = 340, h = 80;
  const pts = history.slice(0, 10).reverse();
  const xs = pts.map((_, i) => (i / Math.max(pts.length - 1, 1)) * w);
  const ys = pts.map(p => h - (p.score / max) * h);

  const path = pts.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${ys[i]}`).join(' ');
  const fill = `${path} L ${xs[xs.length - 1]} ${h} L 0 ${h} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 4}`} preserveAspectRatio="none" style={{ display: 'block', marginTop: 8 }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E87C2E" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#E87C2E" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sg)" />
      <path d={path} fill="none" stroke="#E87C2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r="3" fill="#E87C2E" />
      ))}
    </svg>
  );
};

// Helper to strip tags and decode entities for display
const cleanForDisplay = (text: string) => {
  if (!text) return '';
  // First basic strip for performance
  const stripped = text.replace(/<[^>]+>/g, '');
  // Then decode entities if & is present
  if (stripped.includes('&')) {
    try {
      const doc = new DOMParser().parseFromString(stripped, 'text/html');
      return doc.body.textContent || stripped;
    } catch {
      return stripped;
    }
  }
  return stripped;
};

// ─────────────────────────────────────────────────────────
// PROPOSAL CARD
// ─────────────────────────────────────────────────────────

const ProposalCard: React.FC<{ proposal: SavedProposal; onDelete: () => void; urduMode: boolean }> = ({ proposal, onDelete, urduMode }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(cleanForDisplay(proposal.proposalText));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const PLATFORM_COLORS: Record<string, string> = {
    Upwork: '#14a800', Fiverr: '#1dbf73', LinkedIn: '#0a66c2', Freelancer: '#29b2fe',
  };
  const color = PLATFORM_COLORS[proposal.platform] || '#E87C2E';

  return (
    <div style={{ ...PS.card, padding: '18px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={PS.badge(color)}>{proposal.platform}</span>
            <span style={{ fontSize: '0.75rem', color: '#8B7355', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={11} /> {formatDate(proposal.createdAt)}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E87C2E' }}>{proposal.suggestedRate}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1410', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {proposal.jobTitle}
          </div>
          {!expanded && (
            <div style={{ fontSize: '0.78rem', color: '#8B7355', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {cleanForDisplay(proposal.proposalText)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={copy} style={{ background: 'transparent', border: '1px solid #E8E0D4', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', color: '#8B7355', display: 'flex', alignItems: 'center', gap: 4 }}>
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'transparent', border: '1px solid #E8E0D4', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', color: '#8B7355', display: 'flex', alignItems: 'center', gap: 4 }}>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button onClick={onDelete} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, padding: '14px', background: '#FDFAF5', borderRadius: 10, border: '1px solid #E8E0D4', fontSize: '0.83rem', color: '#1A1410', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
          {cleanForDisplay(proposal.proposalText)}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// SAVED PROFILE CARD
// ─────────────────────────────────────────────────────────

const SavedProfileCard: React.FC<{ platform: string; profileData: SavedProfile }> = ({ platform, profileData }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(cleanForDisplay(profileData.profileText));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #F0EBE1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div 
            style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1A1410', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} 
            onClick={() => setExpanded(!expanded)}
          >
             {platform}
             {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#8B7355', marginTop: 2 }}>{formatDate(profileData.createdAt)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ ...PS.badge('#0B7D6E') }}>SEO {profileData.seoScore}%</span>
          <span style={{ ...PS.badge('#E87C2E') }}>Str {profileData.strengthScore}%</span>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, padding: '14px', background: '#FDFAF5', borderRadius: 10, border: '1px solid #E8E0D4', fontSize: '0.83rem', color: '#1A1410', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', position: 'relative' }}>
          <button onClick={copy} style={{ position: 'absolute', top: 8, right: 8, background: '#fff', border: '1px solid #E8E0D4', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.7rem', color: '#8B7355', display: 'flex', alignItems: 'center', gap: 4 }}>
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
          {cleanForDisplay(profileData.profileText)}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// NEGOTIATION CARD
// ─────────────────────────────────────────────────────────

const NegotiationCard: React.FC<{ negotiation: SavedNegotiation; onDelete: () => void }> = ({ negotiation, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(negotiation.openingScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verdictColor = negotiation.verdict === 'lowball' ? '#DC2626' : negotiation.verdict === 'above' ? '#0B7D6E' : '#E87C2E';

  return (
    <div style={{ ...PS.card, padding: '18px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={PS.badge(verdictColor)}>{negotiation.verdict.toUpperCase()}</span>
            <span style={{ fontSize: '0.75rem', color: '#8B7355', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={11} /> {formatDate(negotiation.createdAt)}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0B7D6E' }}>Rec: {negotiation.recommendedRate}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1410', marginBottom: 4 }}>
            {negotiation.role} ({negotiation.experience})
          </div>
          <div style={{ fontSize: '0.78rem', color: '#8B7355' }}>
            Platform: {negotiation.platform} • Client Offer: {negotiation.offeredRate} {negotiation.currency}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={copy} style={{ background: 'transparent', border: '1px solid #E8E0D4', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', color: '#8B7355', display: 'flex', alignItems: 'center', gap: 4 }}>
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'transparent', border: '1px solid #E8E0D4', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', color: '#8B7355', display: 'flex', alignItems: 'center', gap: 4 }}>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button onClick={onDelete} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, padding: '14px', background: '#FDFAF5', borderRadius: 10, border: '1px solid #E8E0D4', fontSize: '0.83rem', color: '#1A1410', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0B7D6E', marginBottom: 6, textTransform: 'uppercase' }}>Opening Script:</div>
          {cleanForDisplay(negotiation.openingScript)}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// MAIN PROFILE PAGE
// ─────────────────────────────────────────────────────────

export function UserProfilePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user, profile: fbProfile, requireAuth, openAuthModal } = useAuth();
  
  if (!user || !fbProfile) {
    return (
      <div style={{ padding: 60, textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', marginBottom: 16 }}>Your Roshan Profile</h2>
        <p style={{ color: '#8B7355', marginBottom: 24 }}>Sign in to track your career readiness, view your Roshan Score, and save your generated profiles and proposals to the cloud.</p>
        <button onClick={() => openAuthModal('profile_view')} style={PS.btnPri}>
          <User size={16} /> Sign In to View Profile
        </button>
      </div>
    );
  }

  // We map the Firebase profile to the expected structures, providing defaults for missing fields
  const profile: UserProfile = {
    name: fbProfile.name || fbProfile.displayName || '',
    targetRole: fbProfile.targetRole || '',
    targetMarket: fbProfile.targetMarket || '',
    workType: fbProfile.workType || 'Remote',
    preferredPlatforms: fbProfile.preferredPlatforms || [],
    resumeText: fbProfile.resumeText || '',
    resumeFileName: fbProfile.resumeFileName || '',
    resumeUpdatedAt: fbProfile.resumeUpdatedAt || '',
    savedProposals: fbProfile.savedProposals || [],
    savedProfiles: fbProfile.savedProfiles || {},
    savedNegotiations: fbProfile.savedNegotiations || [],
    savedAnalyses: fbProfile.savedAnalyses || [],
    closedSkillGaps: fbProfile.closedSkillGaps || [],
    lastGapScore: fbProfile.lastGapScore || 0,
    roshanScore: fbProfile.roshanScore || 0,
    roshanScoreHistory: fbProfile.roshanScoreHistory || [],
    createdAt: fbProfile.createdAt?.toDate().toISOString() || new Date().toISOString(),
    lastActiveAt: fbProfile.lastActiveAt || new Date().toISOString(),
    totalProposalsGenerated: fbProfile.totalProposalsGenerated || 0,
    totalProfilesGenerated: fbProfile.totalProfilesGenerated || 0,
    totalAnalysesRun: fbProfile.totalAnalysesRun || fbProfile.salaryAnalysesRun || 0,
    language: fbProfile.language || 'en',
    urduNames: fbProfile.urduNames || false,
  };

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', targetRole: '', targetMarket: '', workType: 'Remote' as const });
  const [activeTab, setActiveTab] = useState<'overview' | 'proposals' | 'negotiations' | 'skills' | 'settings'>('overview');
  const [newSkill, setNewSkill] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // We map update calls to Firestore updates now
  const pushUpdate = async (updates: any) => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      await updateUserProfile(user.uid, updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error("Failed to update profile", e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const startEdit = () => {
    setEditForm({ name: profile.name, targetRole: profile.targetRole, targetMarket: profile.targetMarket, workType: profile.workType });
    setEditing(true);
  };

  const saveEdit = async () => {
    await pushUpdate({ ...editForm });
    setEditing(false);
  };

  const addSkill = async () => {
    if (!newSkill.trim() || !user) return;
    const { arrayUnion, doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('./lib/firebase');
    await updateDoc(doc(db, 'users', user.uid), {
      closedSkillGaps: arrayUnion(newSkill.trim())
    });
    setNewSkill('');
  };

  const removeSkill = async (skill: string) => {
    if (!user) return;
    const { arrayRemove, doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('./lib/firebase');
    await updateDoc(doc(db, 'users', user.uid), {
      closedSkillGaps: arrayRemove(skill)
    });
  };

  const handleDeleteProposal = async (id: string) => {
    if (!user) return;
    const filtered = (profile.savedProposals || []).filter(p => p.id !== id);
    await pushUpdate({ savedProposals: filtered });
  };

  const handleDeleteNegotiation = async (id: string) => {
    if (!user) return;
    const filtered = (profile.savedNegotiations || []).filter(n => n.id !== id);
    await pushUpdate({ savedNegotiations: filtered });
  };

  const handleClearProfile = async () => {
    if (confirmClear && user) { 
      // Instead of clearing everything, maybe just reset stats
      await pushUpdate({
        savedProposals: [],
        savedProfiles: {},
        closedSkillGaps: [],
        roshanScoreHistory: []
      });
      setConfirmClear(false); 
    }
    else setConfirmClear(true);
  };

  const toggleUrdu = () => pushUpdate({ urduNames: !profile.urduNames });
  const toggleLanguage = () => pushUpdate({ language: profile.language === 'en' ? 'ur' : 'en' });

  const level = getScoreLevel(profile.roshanScore);
  
  // Calculate a live breakdown if history is empty
  const getLiveBreakdown = () => {
    // 1. Profile Strength (0–25)
    const profiles = Object.values(profile.savedProfiles);
    const bestSEO = profiles.length > 0 ? Math.max(...profiles.map(p => p.seoScore)) : 0;
    const seoPoints = (bestSEO / 100) * 15;
    const resumePoints = profile.resumeText ? 5 : 0;
    const quantityPoints = Math.min(Object.keys(profile.savedProfiles).length * 1.5, 5);
    const profileStrength = Math.round(seoPoints + resumePoints + quantityPoints);

    // 2. Skill Coverage (0–25)
    const skillCoverage = Math.round(Math.min(profile.closedSkillGaps.length * 2.5, 25));

    // 3. Proposal Activity (0–25)
    const proposalActivity = Math.round(Math.min(profile.totalProposalsGenerated * 2.5, 25));

    // 4. Market Fit (0–25)
    const marketFit = Math.round((profile.lastGapScore / 100) * 25);

    // 5. Negotiation Skill (0–10)
    const negotiationSkill = Math.round(Math.min(profile.savedNegotiations.length * 2, 10));

    return { profileStrength, skillCoverage, proposalActivity, marketFit, negotiationSkill };
  };

  const latestHistory = profile.roshanScoreHistory[0] || { 
    breakdown: getLiveBreakdown(),
    event: 'Current Status',
    score: profile.roshanScore,
    date: new Date().toISOString()
  };

  const exportData = () => {
    const data = JSON.stringify(profile, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `roshan_profile_${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const isEmpty = !profile.name && !profile.resumeText && profile.savedProposals.length === 0;

  const TABS = [
    { id: 'overview', label: profile.language === 'ur' ? 'جائزہ' : 'Overview', icon: <BarChart2 size={15} /> },
    { id: 'skills', label: profile.language === 'ur' ? 'مہارتیں' : 'Skills Tracker', icon: <Zap size={15} />, count: profile.closedSkillGaps.length },
    { id: 'settings', label: profile.language === 'ur' ? 'ترتیبات' : 'Settings', icon: <Settings size={15} /> },
  ] as const;

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1100, margin: '0 auto', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');`}</style>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.5rem, 4vw, 1.9rem)', marginBottom: 4 }}>
            {profile.language === 'ur' ? 'میری پروفائل' : 'My Profile'}
            {profile.urduNames && <span style={{ fontFamily: "'Noto Nastaliq Urdu',serif", fontSize: '1.2rem', marginLeft: 12, color: '#E87C2E' }}>میری پروفائل</span>}
          </h2>
          <p style={{ color: '#8B7355', fontSize: '0.88rem' }}>
            {profile.language === 'ur' ? 'اپنی کیریئر کی پیشرفت ٹریک کریں' : 'Track your career readiness progress and saved work'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={async () => {
            await pushUpdate({}); // Triggers an update with current timestamps
          }} style={{ ...PS.btnPri, background: saveStatus === 'saved' ? '#0B7D6E' : saveStatus === 'saving' ? '#8B7355' : 'linear-gradient(135deg,#E87C2E,#F2C94C)' }} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? <RefreshCw size={14} className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Profile'}
          </button>
          <button onClick={exportData} style={{ ...PS.btnGhost, fontSize: '0.78rem' }}>
            <Download size={13} /> Export
          </button>
          <button onClick={startEdit} style={PS.btnPri}>
            <Edit2 size={14} /> Edit Info
          </button>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {isEmpty && (
        <div style={{ ...PS.card, border: '2px dashed #E8E0D4', textAlign: 'center', padding: '48px 32px', marginBottom: 24 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✨</div>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', marginBottom: 10 }}>Start Building Your Roshan Profile</h3>
          <p style={{ color: '#8B7355', fontSize: '0.88rem', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.65 }}>
            Your profile will automatically fill as you use the tools. Run a career analysis, generate profiles, and save proposals — your Roshan Score will grow with every action.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => onNavigate('career')} style={PS.btnPri}>🎯 Career Analysis</button>
            <button onClick={() => onNavigate('profile')} style={PS.btnGhost}>✨ Generate Profiles</button>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ ...PS.card, width: '100%', maxWidth: 480, margin: '20px', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', marginBottom: 20 }}>Edit Profile</h3>
            {[
              { key: 'name', label: 'Full Name', placeholder: 'Your name' },
              { key: 'targetRole', label: 'Target Role', placeholder: 'e.g. Senior React Developer' },
              { key: 'targetMarket', label: 'Target Market', placeholder: 'e.g. United States' },
            ].map(f => (
              <div key={f.key} style={PS.mb(14)}>
                <label style={PS.label}>{f.label}</label>
                <input style={PS.input} placeholder={f.placeholder} value={(editForm as any)[f.key]} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={PS.mb(20)}>
              <label style={PS.label}>Work Type</label>
              <select style={PS.input} value={editForm.workType} onChange={e => setEditForm(p => ({ ...p, workType: e.target.value as any }))}>
                {['Remote', 'Hybrid', 'Onsite'].map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(false)} style={PS.btnGhost}>Cancel</button>
              <button onClick={saveEdit} style={PS.btnPri}><Save size={14} /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCORE HERO CARD ── */}
      <div style={{ ...PS.card, marginBottom: 24, borderTop: `4px solid ${level.color}`, background: `linear-gradient(135deg, #fff 60%, ${level.color}08)` }}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <ScoreRing score={profile.roshanScore} history={profile.roshanScoreHistory} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: '1.5rem', fontFamily: "'Playfair Display',serif", fontWeight: 700, color: '#1A1410' }}>
                Roshan Score™
              </div>
              {profile.urduNames && <span style={{ fontFamily: "'Noto Nastaliq Urdu',serif", color: '#E87C2E', fontSize: '0.9rem' }}>روشن اسکور</span>}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${level.color}15`, borderRadius: 50, padding: '5px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: level.color }}>{level.emoji} {level.label}</span>
              {profile.urduNames && <span style={{ fontFamily: "'Noto Nastaliq Urdu',serif", fontSize: '0.75rem', color: level.color }}>{level.urdu}</span>}
            </div>
            <p style={{ color: '#5C4B37', fontSize: '0.86rem', lineHeight: 1.6, marginBottom: 16 }}>
              {profile.roshanScore < 20 ? 'Start by running a career analysis, generating profiles, and saving proposals to build your score.' :
               profile.roshanScore < 40 ? 'Good start! Generate platform profiles and close skill gaps to accelerate your score.' :
               profile.roshanScore < 60 ? 'Rising strong! Keep closing skill gaps and generating winning proposals.' :
               profile.roshanScore < 80 ? 'Excellent trajectory! Focus on niche specialization and high-value client targeting.' :
               'Elite level reached! Share your success story and mentor other Pakistani freelancers.'}
            </p>

            <button onClick={() => setShowScoreBreakdown(!showScoreBreakdown)} style={{ ...PS.btnGhost, fontSize: '0.78rem' }}>
              {showScoreBreakdown ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showScoreBreakdown ? 'Hide' : 'Show'} Score Breakdown
            </button>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, flex: 1, width: '100%' }}>
            {[
              { label: 'Analyses', urdu: 'تجزیے', val: profile.totalAnalysesRun, icon: '🎯', color: '#E87C2E' },
              { label: 'Profiles', urdu: 'پروفائل', val: profile.totalProfilesGenerated, icon: '✨', color: '#7C3AED' },
              { label: 'Proposals', urdu: 'تجاویز', val: profile.totalProposalsGenerated, icon: '📝', color: '#0B7D6E' },
              { label: 'Skills Closed', urdu: 'مہارتیں', val: profile.closedSkillGaps.length, icon: '⚡', color: '#DC2626' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '12px 14px', background: '#FDFAF5', borderRadius: 12, border: '1px solid #E8E0D4' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '0.62rem', color: '#8B7355', fontWeight: 700, marginTop: 2 }}>
                  {profile.urduNames ? s.urdu : s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score breakdown */}
        {showScoreBreakdown && latestHistory && (
          <div style={{ marginTop: 20, padding: '18px', background: '#FDFAF5', borderRadius: 12, border: '1px solid #E8E0D4' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1A1410', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score Breakdown</div>
                <ScoreBar label="Profile Strength" urdu="پروفائل طاقت" val={latestHistory.breakdown.profileStrength} max={25} color="#E87C2E" />
                <ScoreBar label="Skill Coverage" urdu="مہارت کوریج" val={latestHistory.breakdown.skillCoverage} max={25} color="#0B7D6E" />
                <ScoreBar label="Proposal Activity" urdu="تجویز سرگرمی" val={latestHistory.breakdown.proposalActivity} max={25} color="#7C3AED" />
                <ScoreBar label="Market Fit" urdu="مارکیٹ فٹ" val={latestHistory.breakdown.marketFit} max={25} color="#DC2626" />
                <ScoreBar label="Negotiation Bonus" urdu="مذاکراتی بونس" val={latestHistory.breakdown.negotiationSkill} max={10} color="#F2C94C" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1A1410', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score History</div>
                <ScoreHistoryChart history={profile.roshanScoreHistory} />
                {profile.roshanScoreHistory.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {profile.roshanScoreHistory.slice(0, 4).map((h, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#8B7355' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{h.event}</span>
                        <span style={{ fontWeight: 700, color: '#E87C2E', flexShrink: 0 }}>+{h.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* ── CAREER READINESS CHECKLIST ── */}
      <div style={{ ...PS.card, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} color="#E87C2E" /> Career Readiness Checklist
            {profile.urduNames && <span style={{ fontFamily: "'Noto Nastaliq Urdu',serif", fontSize: '0.8rem', color: '#8B7355', marginLeft: 8 }}>کیرئیر کی تیاری کی چیک لسٹ</span>}
          </h3>
          <div style={{ fontSize: '0.72rem', color: '#8B7355', fontWeight: 600 }}>
            {Math.round(([
              profile.totalAnalysesRun > 0,
              profile.totalProfilesGenerated > 0,
              profile.totalProposalsGenerated > 0,
              profile.savedNegotiations.length > 0,
              profile.closedSkillGaps.length > 0
            ].filter(Boolean).length / 5) * 100)}% Complete
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Run Analysis', urdu: 'تجزیہ چلائیں', done: profile.totalAnalysesRun > 0, page: 'career', desc: 'Identify skill gaps' },
            { label: 'Optimize Bio', urdu: 'بایو بہتر کریں', done: profile.totalProfilesGenerated > 0, page: 'profile', desc: 'SEO for platforms' },
            { label: 'Save Proposal', urdu: 'تجویز محفوظ کریں', done: profile.totalProposalsGenerated > 0, page: 'proposal', desc: 'AI pitch templates' },
            { label: 'Salary Coach', urdu: 'سیلری کوچ', done: profile.savedNegotiations.length > 0, page: 'career', desc: 'Negotiation practice' },
            { label: 'Close Skill Gap', urdu: 'مہارت سیکھیں', done: profile.closedSkillGaps.length > 0, page: 'skills', desc: 'Update tracker' }
          ].map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => !item.done && onNavigate(item.page as any)}
              style={{ 
                padding: '12px 14px', 
                background: item.done ? '#F0FDF4' : '#FDFAF5', 
                border: `1px solid ${item.done ? '#BBF7D0' : '#E8E0D4'}`,
                borderRadius: 12,
                cursor: item.done ? 'default' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.done ? <CheckCircle2 size={16} color="#16A34A" /> : <Circle size={16} color="#E87C2E" />}
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: item.done ? '#166534' : '#1A1410' }}>
                    {profile.urduNames ? item.urdu : item.label}
                  </span>
                </div>
                {!item.done && <ArrowRight size={12} color="#E87C2E" />}
              </div>
              <div style={{ fontSize: '0.68rem', color: item.done ? '#15803D' : '#8B7355', marginLeft: 26 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROFILE INFO CARD (when name set) ── */}
      {profile.name && (
        <div style={{ ...PS.card, marginBottom: 24, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#E87C2E,#F2C94C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', fontWeight: 900, color: '#fff', flexShrink: 0 }}>
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 700, color: '#1A1410', marginBottom: 2 }}>{profile.name}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {profile.targetRole && <span style={{ fontSize: '0.8rem', color: '#5C4B37' }}>🎯 {profile.targetRole}</span>}
              {profile.targetMarket && <span style={{ fontSize: '0.8rem', color: '#5C4B37' }}>🌍 {profile.targetMarket}</span>}
              {profile.workType && <span style={{ fontSize: '0.8rem', color: '#5C4B37' }}>💼 {profile.workType}</span>}
            </div>
          </div>
          {profile.resumeText && (
            <div style={{ ...PS.badge('#0B7D6E'), padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={13} /> Resume saved
            </div>
          )}
          {profile.lastActiveAt && (
            <div style={{ fontSize: '0.73rem', color: '#8B7355' }}>
              Last active: {formatDate(profile.lastActiveAt)}
            </div>
          )}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F0EBE1', borderRadius: 12, padding: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: '1 0 auto', padding: '10px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#1A1410' : '#8B7355',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all .18s',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab.icon}
            {tab.label}
            {'count' in tab && tab.count > 0 && (
              <span style={{ background: '#E87C2E', color: '#fff', borderRadius: 50, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700 }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Saved platform profiles */}
          <div style={PS.card}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Globe size={15} color="#0B7D6E" /> Platform Profiles
              {profile.urduNames && <span style={{ fontFamily: "'Noto Nastaliq Urdu',serif", fontSize: '0.75rem', color: '#8B7355' }}>پلیٹ فارم پروفائلز</span>}
            </h4>
            {Object.keys(profile.savedProfiles).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#8B7355', fontSize: '0.83rem' }}>
                No profiles generated yet. <button onClick={() => onNavigate('profile')} style={{ background: 'none', border: 'none', color: '#E87C2E', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Generate now →</button>
              </div>
            ) : (
              Object.entries(profile.savedProfiles).map(([plat, prof]) => (
                <SavedProfileCard key={plat} platform={plat} profileData={prof} />
              ))
            )}
          </div>

          {/* Saved Proposals Section */}
          <div style={PS.card}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <FileText size={15} color="#7C3AED" /> Saved Proposals
              {profile.urduNames && <span style={{ fontFamily: "'Noto Nastaliq Urdu',serif", fontSize: '0.75rem', color: '#8B7355' }}>محفوظ تجاویز</span>}
            </h4>
            {profile.savedProposals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: '#8B7355', fontSize: '0.8rem', marginBottom: 12 }}>No proposals saved yet. Transform your pitches into winner applications.</p>
                <button onClick={() => onNavigate('proposal')} style={{ ...PS.btnPri, fontSize: '0.75rem', padding: '8px 16px' }}>📝 Write My First Proposal</button>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto', pr: '4px' }}>
                {profile.savedProposals.map(p => (
                  <ProposalCard key={p.id} proposal={p} onDelete={() => handleDeleteProposal(p.id)} urduMode={profile.urduNames} />
                ))}
              </div>
            )}
          </div>

          {/* Saved Negotiations Section */}
          <div style={PS.card}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <MessageSquare size={15} color="#E87C2E" /> Negotiation Vault
              {profile.urduNames && <span style={{ fontFamily: "'Noto Nastaliq Urdu',serif", fontSize: '0.75rem', color: '#8B7355' }}>مذاکراتی اسٹوریج</span>}
            </h4>
            {profile.savedNegotiations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: '#8B7355', fontSize: '0.8rem', marginBottom: 12 }}>Never settle for less. Use our Salary Coach to build strategies.</p>
                <button onClick={() => onNavigate('career')} style={{ ...PS.btnPri, fontSize: '0.75rem', padding: '8px 16px' }}>📈 Open Salary Coach</button>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {profile.savedNegotiations.map(neg => (
                  <NegotiationCard key={neg.id} negotiation={neg} onDelete={() => handleDeleteNegotiation(neg.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Saved Analyses */}
          <div style={PS.card}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Target size={15} color="#E87C2E" /> Career Analyses
            </h4>
            {profile.savedAnalyses.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#8B7355', fontSize: '0.78rem' }}>
                No analyses saved yet. <button onClick={() => onNavigate('career')} style={{ background: 'none', border: 'none', color: '#E87C2E', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Start Analysis →</button>
              </div>
            ) : (
              profile.savedAnalyses.map(ana => (
                <div key={ana.id} style={{ padding: '10px 12px', background: '#FDFAF5', borderRadius: 8, border: '1px solid #E8E0D4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{ana.role}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8B7355' }}>{ana.targetMarket} • {formatDate(ana.createdAt)}</div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#E87C2E', fontWeight: 800 }}>{ana.score}%</div>
                </div>
              ))
            )}
          </div>

          {/* Settings Actions */}
          <div style={PS.card}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Download size={15} color="#8B7355" /> Profile Settings & Exports
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button 
                onClick={toggleUrdu} 
                style={{ ...PS.btnGhost, width: '100%', justifyContent: 'space-between' }}
              >
                <span>🌐 Dashboard Language</span>
                <span style={{ color: '#E87C2E' }}>{profile.urduNames ? 'Urdu Active' : 'English Active'}</span>
              </button>
              <button 
                onClick={toggleLanguage} 
                style={{ ...PS.btnGhost, width: '100%', justifyContent: 'space-between' }}
              >
                <span>🌍 AI Output Language</span>
                <span style={{ color: '#E87C2E' }}>{profile.language === 'en' ? 'English' : 'Urdu'}</span>
              </button>
              <button onClick={exportData} style={{ ...PS.btnGhost, width: '100%' }}><Download size={14} /> Backup Account (JSON)</button>
              <button onClick={() => { if(confirm('Wipe all local data?')) clearProfile(); }} style={{ ...PS.btnGhost, width: '100%', color: '#DC2626', borderColor: 'rgba(220,38,38,0.2)' }}><Trash2 size={14} /> Permanent Account Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs handled by Overview now */}

      {/* ── TAB: SKILLS TRACKER ── */}
      {activeTab === 'skills' && (
        <div>
          <div style={{ ...PS.card, marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>
              Skills I've Learned / Closed
              {profile.urduNames && <span style={{ fontFamily: "'Noto Nastaliq Urdu',serif", fontSize: '0.8rem', marginLeft: 8, color: '#8B7355' }}>میں نے سیکھا</span>}
            </h3>
            <p style={{ color: '#8B7355', fontSize: '0.83rem', marginBottom: 16 }}>
              Track skills you've added since your last career analysis. Each closed gap increases your Roshan Score.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                style={{ ...PS.input, flex: 1 }}
                placeholder="e.g. TypeScript, Next.js, Docker..."
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
              />
              <button onClick={addSkill} style={PS.btnPri}><Plus size={14} /> Mark Learned</button>
            </div>

            {profile.closedSkillGaps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#8B7355', fontSize: '0.83rem', background: '#FDFAF5', borderRadius: 10, border: '1px dashed #E8E0D4' }}>
                No skills marked as learned yet. Run a career analysis first to see your skill gaps.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {profile.closedSkillGaps.map((skill, i) => (
                  <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(11,125,110,.1)', border: '1px solid rgba(11,125,110,.25)', borderRadius: 50, padding: '5px 12px' }}>
                    <CheckCircle2 size={12} color="#0B7D6E" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0B7D6E' }}>{skill}</span>
                    <button onClick={() => removeSkill(skill)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0B7D6E', display: 'flex', alignItems: 'center' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How to improve score */}
          <div style={{ ...PS.card, borderLeft: '4px solid #F2C94C' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Award size={15} color="#CA8A04" /> How to Improve Your Roshan Score
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {[
                { action: 'Run Career Analysis', impact: '+25 Market Fit pts', page: 'career', icon: '🎯' },
                { action: 'Generate Platform Profiles', impact: '+25 Profile Strength pts', page: 'profile', icon: '✨' },
                { action: 'Save 10 Proposals', impact: '+25 Proposal Activity pts', page: 'proposal', icon: '📝' },
                { action: 'Close Skill Gaps', impact: '+25 Skill Coverage pts', page: null, icon: '⚡' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '12px 14px', background: '#FDFAF5', borderRadius: 10, border: '1px solid #E8E0D4' }}>
                  <div style={{ fontSize: '1rem', marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1A1410', marginBottom: 2 }}>{item.action}</div>
                  <div style={{ fontSize: '0.72rem', color: '#0B7D6E', fontWeight: 600 }}>{item.impact}</div>
                  {item.page && <button onClick={() => onNavigate(item.page!)} style={{ marginTop: 6, background: 'none', border: 'none', color: '#E87C2E', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Go →</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: SETTINGS ── */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Language & Display */}
          <div style={PS.card}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>🌐 Language & Display</h4>
            {[
              {
                label: 'Interface Language',
                sub: 'Toggle between English and Urdu',
                value: profile.language === 'ur',
                action: toggleLanguage,
                on: 'اردو',
                off: 'English',
              },
              {
                label: 'Urdu Labels',
                sub: 'Show Urdu names alongside English',
                value: profile.urduNames,
                action: toggleUrdu,
                on: 'On',
                off: 'Off',
              },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 1 ? '1px solid #F0EBE1' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1A1410' }}>{s.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8B7355' }}>{s.sub}</div>
                </div>
                <button
                  onClick={s.action}
                  style={{
                    width: 52, height: 28, borderRadius: 50, border: 'none', cursor: 'pointer',
                    background: s.value ? '#E87C2E' : '#E8E0D4',
                    position: 'relative', transition: 'background .25s',
                    display: 'flex', alignItems: 'center', padding: '0 3px',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    transition: 'transform .25s',
                    transform: s.value ? 'translateX(24px)' : 'translateX(0)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            ))}
          </div>

          {/* Data management */}
          <div style={PS.card}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>💾 Data Management</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '12px 14px', background: '#FDFAF5', borderRadius: 10, border: '1px solid #E8E0D4' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1A1410', marginBottom: 2 }}>Cloud Sync Active</div>
                <div style={{ fontSize: '0.75rem', color: '#8B7355', lineHeight: 1.5 }}>Your profile, proposals, and Roshan Score are stored securely in the cloud. You can access your data from any device by signing in.</div>
              </div>
              <button 
                onClick={async () => await pushUpdate({})} 
                style={{ ...PS.btnPri, justifyContent: 'center' }}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saveStatus === 'saving' ? 'Saving to Firestore...' : 'Force Cloud Sync'}
              </button>
              <button onClick={exportData} style={{ ...PS.btnGhost, justifyContent: 'center' }}>
                <Download size={14} /> Export My Data (JSON)
              </button>
              <button
                onClick={handleClearProfile}
                style={{ padding: '10px 20px', borderRadius: 50, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', border: `1px solid ${confirmClear ? '#DC2626' : '#E8E0D4'}`, background: confirmClear ? 'rgba(220,38,38,.08)' : '#fff', color: confirmClear ? '#DC2626' : '#8B7355', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', transition: 'all .2s', justifyContent: 'center' }}
              >
                <Trash2 size={14} /> {confirmClear ? '⚠️ Click again to confirm clear' : 'Clear All Data'}
              </button>
              {confirmClear && <button onClick={() => setConfirmClear(false)} style={{ ...PS.btnGhost, justifyContent: 'center', fontSize: '0.78rem' }}>Cancel</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
