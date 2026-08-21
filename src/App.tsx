import React, { useState, useRef } from 'react';
import { Homepage } from './Homepage';
import { UserProfilePage } from './UserProfilePage';
import { useAuth } from './contexts/AuthContext';
import { auth } from './lib/firebase';
import { CareerAnalysis } from './components/career/CareerAnalysis';
import { ProposalGenerator } from './components/career/ProposalGenerator';
import { SalaryCoach } from './components/career/SalaryCoach';
import { analyzeMarket, MarketInsightData } from './marketIntelligence';
import { generateAllPlatformProfiles, generateIntelligentProfile, ProfileIntelligenceResult } from './profileIntelligence';
import { PlatformSelector, PlatformId } from './components/PlatformSelector';
import { PLATFORM_CONFIGS } from './components/PlatformIcons';
import { ProfileComparisonView } from './components/ProfileComparisonView';
import { extractTextFromLocalFile } from './utils/fileParser';
import { useUndoRedo } from './hooks/useUndoRedo';
import {
  Sparkles, Globe, Target, User, Home,
  AlertCircle, RefreshCw, Loader2, Check,
  Copy, CheckCircle2, UploadCloud, FileText,
  Share2, Download, Briefcase, Undo2, Redo2,
  ShieldCheck, ShieldAlert, TrendingUp, TrendingDown,
  Search, Lightbulb, Tag, BarChart2, ChevronDown, ChevronUp, DollarSign,
  Menu, X, Save, Columns, ArrowLeftRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';

// ── AI API ──
// Provider credentials stay on the server. Keeping this interface stable means the
// existing analysis, proposal, profile, and salary-coach pipelines do not change.
export async function extractTextFromResume(fileData: { mimeType: string, data: string }): Promise<string> {
  const prompt = "Extract all the text from this resume accurately. Return ONLY the raw extracted text, with proper formatting and structure. Do not add any introductory or concluding remarks.";
  return await callOpenAI(prompt, fileData);
}

export async function callOpenAI(prompt: string, fileData?: { mimeType: string, data: string }): Promise<string> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, fileData }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'AI service request failed');
  }
  return typeof payload?.text === 'string' ? payload.text : '';
}

// ── STATIC INTELLIGENCE DATA ──
export const INTEL = {
  localSkills: [
    { name: 'React.js', pct: 87 }, { name: 'Node.js', pct: 64 },
    { name: 'PHP/Laravel', pct: 58 }, { name: 'JavaScript', pct: 52 }, { name: 'WordPress', pct: 49 },
  ],
  intlSkills: [
    { name: 'TypeScript', pct: 94 }, { name: 'Next.js', pct: 81 },
    { name: 'React Testing', pct: 73 }, { name: 'GraphQL', pct: 61 }, { name: 'AWS/Cloud', pct: 55 },
  ],
  trending: ['TypeScript +23%', 'Next.js +18%', 'AI Integration +41%', 'Tailwind CSS +31%'],
  declining: ['jQuery -12%', 'WordPress -8%'],
  tone: {
    US: 'direct, ROI-focused, metrics-heavy, technical depth expected',
    UK: 'formal, structured, culture-fit signals important, reliability-focused',
    Local: 'relationship-first, Urdu/English mix fine, flexible, phone availability valued',
  },
};

// ── SHARED STYLES ──
export const S = {
  card: { background: '#fff', borderRadius: 20, padding: 28, border: '1px solid #E8E0D4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' } as React.CSSProperties,
  label: { display: 'block', fontWeight: 600, fontSize: '0.83rem', color: '#1A1410', marginBottom: 6 } as React.CSSProperties,
  input: { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #E8E0D4', background: '#fff', fontFamily: 'inherit', fontSize: '0.9rem', color: '#1A1410', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  btnPri: { padding: '11px 22px', borderRadius: 50, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#E87C2E,#F2C94C)', color: '#fff', boxShadow: '0 4px 14px rgba(232,124,46,.3)', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', transition: 'all .2s' } as React.CSSProperties,
  btnGhost: { padding: '11px 22px', borderRadius: 50, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', border: '1px solid #E8E0D4', background: '#F0EBE1', color: '#1A1410', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' } as React.CSSProperties,
  badgeLive: { background: 'rgba(74,222,128,.15)', color: '#166534', padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700 } as React.CSSProperties,
  badgePri: { background: 'rgba(232,124,46,.1)', color: '#E87C2E', padding: '4px 12px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 600 } as React.CSSProperties,
  badgeSec: { background: 'rgba(11,125,110,.1)', color: '#0B7D6E', padding: '4px 12px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 600 } as React.CSSProperties,
  badgeAcc: { background: 'rgba(242,201,76,.2)', color: '#8B6914', padding: '4px 12px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 600 } as React.CSSProperties,
  alertWarn: { padding: '12px 16px', borderRadius: 12, fontSize: '0.83rem', background: 'rgba(242,201,76,.12)', border: '1px solid rgba(242,201,76,.35)', color: '#7A5C00', display: 'flex', alignItems: 'flex-start', gap: 8 } as React.CSSProperties,
  alertOk: { padding: '12px 16px', borderRadius: 12, fontSize: '0.83rem', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.28)', color: '#166534', display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
  alertLive: { padding: '12px 16px', borderRadius: 12, fontSize: '0.83rem', background: 'rgba(232,124,46,.1)', border: '1px solid rgba(232,124,46,.3)', color: '#E87C2E', display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
  chip: { display: 'inline-flex', alignItems: 'center', gap: 5, background: '#F0EBE1', border: '1px solid #E8E0D4', padding: '4px 12px', borderRadius: 50, fontSize: '0.76rem', fontWeight: 500 } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 } as React.CSSProperties,
  mb: (n: number) => ({ marginBottom: n }) as React.CSSProperties,
};

// ── PROGRESS BAR ──
const ProgBar = ({ label, pct, color }: { label: string; pct: number; color: string; key?: React.Key }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
      <span>{label}</span><span style={{ color, fontWeight: 600 }}>{pct}%</span>
    </div>
    <div style={{ height: 6, background: '#E8E0D4', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  </div>
);

// ══════════════════════════════
// PROFILE GENERATOR (Intelligence-Powered)
// ══════════════════════════════

// Mini SEO sub-factor bar
const SEOBar = ({ label, val, weight }: { label: string; val: number; weight: string }) => {
  const color = val >= 75 ? '#0B7D6E' : val >= 50 ? '#E87C2E' : '#DC2626';
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: '0.76rem', color: '#5C4B37', fontWeight: 500 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.62rem', color: '#8B7355' }}>{weight}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{val}%</span>
        </div>
      </div>
      <div style={{ height: 5, background: '#E8E0D4', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${val}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 1s ease-out' }} />
      </div>
    </div>
  );
};

const ProfileGenerator = () => {
  const authContext = useAuth();
  const [form, setForm] = useState({
    name: '', role: 'Frontend Developer', exp: '3-5 years',
    skills: 'React, TypeScript, Node.js, Tailwind CSS',
    education: '', projects: '',
    market: 'United States (US)', tone: 'Professional',
  });
  const [selectedPlats, setSelectedPlats] = useState<Array<'Upwork' | 'Fiverr' | 'LinkedIn' | 'Freelancer'>>(['Upwork', 'Fiverr', 'LinkedIn', 'Freelancer']);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [results, setResults] = useState<Record<string, ProfileIntelligenceResult>>({});
  const [activePlat, setActivePlat] = useState('');
  const [copied, setCopied] = useState<string>('');
  const [step, setStep] = useState<'form' | 'results'>('form');
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({});
  const [showCompare, setShowCompare] = useState<boolean>(false);
  const [refreshingPlat, setRefreshingPlat] = useState<string | null>(null);
  const [refreshSuccessPlat, setRefreshSuccessPlat] = useState<string | null>(null);

  const [inputMethod, setInputMethod] = useState<'manual' | 'resume'>('manual');
  const [dragActive, setDragActive] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const { value: resumeText, setValue: setResumeText, undo: undoResumeText, redo: redoResumeText, canUndo: canUndoResumeText, canRedo: canRedoResumeText, reset: resetResumeText } = useUndoRedo<string | null>(null);
  const [showOcrConfirm, setShowOcrConfirm] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileProgress, setFileProgress] = useState(0);
  const [processingState, setProcessingState] = useState<string>('');
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (plat: string, section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [plat]: { ...(prev[plat] ?? {}), [section]: !(prev[plat]?.[section]) },
    }));
  };
  const isSectionOpen = (plat: string, section: string) => expandedSections[plat]?.[section] ?? false;

  const buildResumeText = () => {
    if (inputMethod === 'resume') return resumeText ?? '';
    return `Name: ${form.name}\nRole: ${form.role}\nExperience: ${form.exp}\nSkills: ${form.skills}\nEducation: ${form.education}\nProjects: ${form.projects}`;
  };

  const generate = async () => {
    setUploadError(null);
    if (inputMethod === 'resume' && !resumeText) { setUploadError('Please upload and confirm your resume.'); return; }
    if (inputMethod === 'resume' && showOcrConfirm) { setUploadError('Please confirm the extracted resume text first.'); return; }
    if (selectedPlats.length === 0) return;

    setLoading(true);
    setStep('results');

    const market = form.market.replace(' (US)', '').replace(' (UK)', '');

    setLoadingStep(`🔍 Searching top-ranked profiles on SerpAPI for ${selectedPlats.join(', ')}…`);
    try {
      const allResults = await generateAllPlatformProfiles(
        { resumeText: buildResumeText(), targetRole: form.role, targetMarket: market, tone: form.tone },
        selectedPlats,
      );
      setResults(allResults);
      setActivePlat(selectedPlats[0]);
    } catch (e) {
      console.error('Profile generation error:', e);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleSmartRefresh = async (plat: PlatformId) => {
    if (refreshingPlat) return;
    setRefreshingPlat(plat);
    setRefreshSuccessPlat(null);

    const market = form.market.replace(' (US)', '').replace(' (UK)', '');
    try {
      const updated = await generateIntelligentProfile({
        resumeText: buildResumeText(),
        targetRole: form.role,
        targetMarket: market,
        platform: plat,
        tone: form.tone,
      });

      setResults(prev => ({
        ...prev,
        [plat]: updated,
      }));

      setRefreshSuccessPlat(plat);
      setTimeout(() => {
        setRefreshSuccessPlat(prev => (prev === plat ? null : prev));
      }, 3000);
    } catch (err) {
      console.error(`Smart refresh failed for ${plat}:`, err);
    } finally {
      setRefreshingPlat(null);
    }
  };

  const ALL_PLATS: Array<'Upwork' | 'Fiverr' | 'LinkedIn' | 'Freelancer'> = ['Upwork', 'Fiverr', 'LinkedIn', 'Freelancer'];
  const togglePlat = (p: 'Upwork' | 'Fiverr' | 'LinkedIn' | 'Freelancer') =>
    setSelectedPlats(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const copyProfile = (plat: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(plat);
    setTimeout(() => setCopied(''), 2000);
  };

  const exportPDF = (plat: string, data: ProfileIntelligenceResult) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${plat} Profile`, 20, 20);
    doc.setFontSize(10);
    doc.text(`Strength: ${data.strengthScore}% | SEO: ${data.seoScore.overall}% | Trust: ${data.trustScore}%`, 20, 30);
    doc.text(`Compliance: ${data.compliance.passed ? 'PASSED' : 'ISSUES FOUND'}`, 20, 38);
    const splitText = doc.splitTextToSize(data.profileText, 170);
    doc.text(splitText, 20, 50);
    doc.save(`${plat}_Profile_Intelligence.pdf`);
  };

  const shareByEmail = (plat: string, data: ProfileIntelligenceResult) => {
    const subject = encodeURIComponent(`Career Intelligence: Generated Profile for ${plat}`);
    const appLink = window.location.origin;
    const body = encodeURIComponent(
      `Check out my generated ${plat} profile from Roshan AI!\n\n` +
      `Platform: ${plat}\n` +
      `Strength Score: ${data.strengthScore}%\n` +
      `SEO Score: ${data.seoScore.overall}%\n\n` +
      `Profile Summary:\n${data.profileText.substring(0, 300)}...\n\n` +
      `Generate your own career intelligence here: ${appLink}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleFile = (f: File) => {
    const validExts = ['.pdf', '.docx', '.txt', '.rtf', '.jpeg', '.jpg', '.png'];
    const isImage = f.type.startsWith('image/');
    if (!validExts.some(ext => f.name.toLowerCase().endsWith(ext))) {
      setUploadError('Please upload a PDF, DOCX, TXT, RTF, or Image file.'); return;
    }
    setUploadError(null);
    setUploadWarning(isImage ? 'Image formats may yield less accurate text extraction than PDFs.' : null);
    setFileProcessing(true); setFileProgress(10); setProcessingState('Extracting text locally...');
    setResumeFile(f);
    extractTextFromLocalFile(f).then(text => {
      setFileProgress(95);
      if (text) { resetResumeText(text); setShowOcrConfirm(true); }
      else setUploadError('Failed to extract text from resume.');
      setFileProgress(100); setFileProcessing(false); setProcessingState('');
    }).catch(() => { setUploadError('Failed to read file.'); setFileProcessing(false); setProcessingState(''); });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const activeResult = results[activePlat];

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={S.mb(28)}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.5rem, 4vw, 1.9rem)', marginBottom: 6 }}>Platform Profile Generator</h2>
        <p style={{ color: '#8B7355' }}>
          Reverse-engineers top-ranked profiles via SerpAPI → extracts keyword & tone patterns → rewrites your profile to match → compliance checks + multi-factor SEO scoring.
        </p>
      </div>

      {/* ── FORM ── */}
      {(step === 'form' || (step === 'results' && !loading && Object.keys(results).length === 0)) && (
        <div style={S.grid2}>
          <div style={S.card}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 18 }}>Your Information</h3>

            {/* Input method toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['manual', 'resume'] as const).map(m => (
                <button key={m} onClick={() => setInputMethod(m)} style={{ flex: 1, padding: '8px 0', border: '1.5px solid', borderColor: inputMethod === m ? '#E87C2E' : '#E8E0D4', borderRadius: 8, background: inputMethod === m ? 'rgba(232,124,46,.08)' : '#fff', color: inputMethod === m ? '#E87C2E' : '#1A1410', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all .18s' }}>
                  {m === 'manual' ? '✏️ Manual Entry' : '📄 Upload Resume'}
                </button>
              ))}
            </div>

            {inputMethod === 'resume' ? (
              <div style={S.mb(20)}>
                <label style={S.label}>Resume (PDF, DOCX, TXT, RTF, Image)</label>
                <div
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => { if (!showOcrConfirm) fileInputRef.current?.click(); }}
                  style={{ border: `2px dashed ${dragActive ? '#E87C2E' : '#E8E0D4'}`, borderRadius: 12, padding: showOcrConfirm ? 0 : '28px 20px', textAlign: 'center', background: dragActive ? 'rgba(232,124,46,.05)' : '#FDFAF5', cursor: showOcrConfirm ? 'default' : 'pointer', transition: 'all .2s', overflow: 'hidden' }}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.rtf,.jpeg,.jpg,.png" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} style={{ display: 'none' }} />
                  {fileProcessing ? (
                    <div style={{ padding: '14px 0' }}>
                      <Loader2 size={28} color="#E87C2E" style={{ margin: '0 auto 10px', animation: 'spin 1s linear infinite' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{processingState} {fileProgress}%</div>
                      <div style={{ width: '80%', height: 4, background: '#E8E0D4', margin: '8px auto 0', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${fileProgress}%`, height: '100%', background: '#E87C2E' }} />
                      </div>
                    </div>
                  ) : showOcrConfirm ? (
                    <div style={{ padding: 16, textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0B7D6E', fontSize: '0.84rem' }}><CheckCircle2 size={15} /> Extracted — review & confirm</div>
                        <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} style={{ background: 'none', border: 'none', color: '#8B7355', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>Replace file</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                        <p style={{ fontSize: '0.78rem', color: '#8B7355', margin: 0 }}>Review before generating</p>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={e => { e.stopPropagation(); undoResumeText(); }} disabled={!canUndoResumeText} style={{ ...S.btnGhost, padding: '3px 7px', border: 'none', background: 'transparent', opacity: canUndoResumeText ? 1 : 0.4 }}><Undo2 size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); redoResumeText(); }} disabled={!canRedoResumeText} style={{ ...S.btnGhost, padding: '3px 7px', border: 'none', background: 'transparent', opacity: canRedoResumeText ? 1 : 0.4 }}><Redo2 size={14} /></button>
                        </div>
                      </div>
                      <textarea style={{ ...S.input, minHeight: 160, fontSize: '0.78rem', resize: 'vertical', background: '#fff' }} value={resumeText || ''} onChange={e => setResumeText(e.target.value)} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <button onClick={e => { e.stopPropagation(); setShowOcrConfirm(false); }} style={{ ...S.btnPri, padding: '6px 16px', fontSize: '0.78rem' }}><CheckCircle2 size={13} /> Confirm Text</button>
                      </div>
                    </div>
                  ) : !resumeFile ? (
                    <><UploadCloud size={28} color="#8B7355" style={{ margin: '0 auto 10px' }} /><div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Click or drag to upload</div><div style={{ fontSize: '0.73rem', color: '#8B7355', marginTop: 4 }}>PDF, DOCX, TXT, or image · max 5 MB</div></>
                  ) : (
                    <><FileText size={28} color="#0B7D6E" style={{ margin: '0 auto 10px' }} /><div style={{ fontWeight: 600, color: '#0B7D6E', fontSize: '0.88rem' }}>{resumeFile.name}</div></>
                  )}
                </div>
                {uploadWarning && <div style={{ color: '#8B6914', fontSize: '0.79rem', marginTop: 8, background: '#FFFDF0', padding: '8px 10px', borderRadius: 8, border: '1px solid #FFE5B4', display: 'flex', gap: 5 }}><AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />{uploadWarning}</div>}
              </div>
            ) : (
              <>
                {(['name', 'role', 'skills'] as const).map(key => (
                  <div key={key} style={S.mb(13)}>
                    <label style={S.label}>{key === 'name' ? 'Full Name' : key === 'role' ? 'Job Role / Title' : 'Top Skills (comma separated)'}</label>
                    <input style={S.input} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <div style={S.mb(13)}>
                  <label style={S.label}>Years of Experience</label>
                  <select style={S.input} value={form.exp} onChange={e => setForm(p => ({ ...p, exp: e.target.value }))}>
                    {['1-2 years', '3-5 years', '6-9 years', '10+ years'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div style={S.mb(13)}>
                  <label style={S.label}>Education</label>
                  <textarea style={{ ...S.input, minHeight: 70, resize: 'vertical' }} placeholder="e.g. BS Computer Science..." value={form.education} onChange={e => setForm(p => ({ ...p, education: e.target.value }))} />
                </div>
                <div style={S.mb(13)}>
                  <label style={S.label}>Projects</label>
                  <textarea style={{ ...S.input, minHeight: 70, resize: 'vertical' }} placeholder="Briefly describe key projects..." value={form.projects} onChange={e => setForm(p => ({ ...p, projects: e.target.value }))} />
                </div>
              </>
            )}

            <div style={S.mb(13)}>
              <label style={S.label}>Target Market</label>
              <select style={S.input} value={form.market} onChange={e => setForm(p => ({ ...p, market: e.target.value }))}>
                {['United States (US)', 'United Kingdom (UK)', 'Canada', 'Australia', 'Germany', 'Local Pakistan Market'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div style={S.mb(20)}>
              <label style={S.label}>Tone Preference</label>
              <select style={S.input} value={form.tone} onChange={e => setForm(p => ({ ...p, tone: e.target.value }))}>
                {['Professional', 'Conversational', 'Bold & Confident'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>

            {/* ── ENHANCED VISUAL MULTI-SELECT PLATFORM CARDS ── */}
            <PlatformSelector
              selectedPlatforms={selectedPlats}
              onTogglePlatform={togglePlat}
              onSelectAll={() => setSelectedPlats(['Upwork', 'LinkedIn', 'Fiverr', 'Freelancer'])}
              onClearAll={() => setSelectedPlats([])}
            />

            {uploadError && <div style={{ ...S.alertWarn, marginBottom: 14 }}><AlertCircle size={14} />{uploadError}</div>}

            <button onClick={generate} disabled={selectedPlats.length === 0} style={S.btnPri}>
              <Search size={16} /> Analyze Top Profiles & Generate {selectedPlats.length} Profile{selectedPlats.length !== 1 ? 's' : ''}
            </button>
          </div>

          {/* Right side: intelligence preview */}
          <div>
            <div style={{ ...S.card, borderTop: '4px solid #E87C2E', marginBottom: 16 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>🔬 What the Intelligence Pipeline Does</h4>
              {[
                { icon: '🔍', title: 'SerpAPI Profile Search', desc: `Finds top-ranked ${selectedPlats.join('/')} profiles for your role via Google Search` },
                { icon: '🧠', title: 'Pattern Extraction', desc: 'OpenAI analyzes hook styles, keyword frequency, tone, and structural patterns from real top profiles' },
                { icon: '✍️', title: 'Personalized Rewrite', desc: 'Rewrites your profile using those exact patterns, injecting your real skills and experience' },
                { icon: '🛡️', title: 'Compliance Check', desc: 'Platform-specific policy scan — catches contact info, keyword stuffing, char limit violations' },
                { icon: '📊', title: 'Multi-Factor SEO Scoring', desc: 'Keyword density, title optimization, CTA presence, specificity, searchability — all scored separately' },
                { icon: '⚡', title: 'Competitive Gap Analysis', desc: 'Shows keywords in top profiles that you\'re missing, with suggestions on how to weave them in' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 5 ? '1px solid #F0EBE1' : 'none' }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1A1410', marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#8B7355', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Loader2 size={44} style={{ animation: 'spin 1s linear infinite', color: '#E87C2E', margin: '0 auto 16px', display: 'block' }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>Running Intelligence Pipeline…</div>
          <div style={{ color: '#8B7355', fontSize: '0.875rem', maxWidth: 420, margin: '0 auto' }}>{loadingStep || `Searching SerpAPI → extracting patterns → rewriting profiles → compliance check → scoring`}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            {selectedPlats.map(p => {
              const cfg = PLATFORM_CONFIGS[p];
              const Icon = cfg?.icon;
              return (
                <span key={p} style={{ ...S.chip, fontSize: '0.74rem', background: '#fff', borderColor: cfg?.borderColor || '#E8E0D4', color: cfg?.brandColor || '#1A1410', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {Icon && <Icon size={14} color={cfg.brandColor} />}
                  <span>Analyzing {p}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {step === 'results' && !loading && Object.keys(results).length > 0 && (
        <div>
          <div style={{ ...S.alertOk, marginBottom: 24 }}>
            <CheckCircle2 size={16} /> {Object.keys(results).length} intelligence-powered profiles generated — reverse-engineered from top-ranked real profiles
          </div>

          {/* Platform tabs and View Mode Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
            {/* Platform Tabs with Custom Logos */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {Object.keys(results).map(plat => {
                const r = results[plat];
                const hasIssues = !r.compliance.passed || r.compliance.blocked.length > 0;
                const config = PLATFORM_CONFIGS[plat as PlatformId];
                const Icon = config?.icon;
                const isTabActive = activePlat === plat;
                const isThisRefreshing = refreshingPlat === plat;

                return (
                  <button
                    key={plat}
                    onClick={() => setActivePlat(plat)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 50,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: `2px solid ${isTabActive ? (config?.brandColor || '#E87C2E') : '#E8E0D4'}`,
                      background: isTabActive ? (config?.bgColor || 'rgba(232,124,46,.1)') : '#fff',
                      color: isTabActive ? (config?.brandColor || '#E87C2E') : '#1A1410',
                      transition: 'all .18s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: isTabActive ? `0 4px 14px ${config?.brandColor || '#E87C2E'}25` : '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    {isThisRefreshing ? (
                      <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: config?.brandColor || '#E87C2E' }} />
                    ) : (
                      Icon && <Icon size={18} color={isTabActive ? config.brandColor : '#8B7355'} />
                    )}
                    <span>{plat}</span>
                    {hasIssues && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />}
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: isTabActive ? config?.brandColor : '#8B7355',
                        background: isTabActive ? '#fff' : '#F0EBE1',
                        padding: '2px 8px',
                        borderRadius: 50,
                        border: `1px solid ${isTabActive ? config?.brandColor + '30' : 'transparent'}`,
                      }}
                    >
                      {isThisRefreshing ? 'Updating...' : `${r.seoScore.overall}% SEO`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle: Standard vs Side-by-Side Comparison */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FDFAF5', border: '1.5px solid #E8E0D4', padding: 4, borderRadius: 50 }}>
              <button
                type="button"
                onClick={() => setShowCompare(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 50,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: !showCompare ? '#1A1410' : 'transparent',
                  color: !showCompare ? '#fff' : '#5C4B37',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={13} color={!showCompare ? '#F2C94C' : '#8B7355'} /> Standard View
              </button>
              <button
                type="button"
                onClick={() => setShowCompare(true)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 50,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: showCompare ? '#E87C2E' : 'transparent',
                  color: showCompare ? '#fff' : '#5C4B37',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: showCompare ? '0 2px 8px rgba(232,124,46,0.3)' : 'none',
                }}
              >
                <Columns size={13} color={showCompare ? '#fff' : '#E87C2E'} /> Side-by-Side Comparison
              </button>
            </div>
          </div>

          {/* Active Platform Refresh Notification */}
          {refreshingPlat === activePlat && (
            <div
              style={{
                ...S.alertLive,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.84rem' }}>
                  Smart Refresh in progress for <strong>{activePlat}</strong> — re-analyzing top SerpAPI patterns & generating a fresh copy while preserving your other platform profiles.
                </span>
              </div>
            </div>
          )}

          {activeResult && (
            <div style={{ display: 'grid', gridTemplateColumns: showCompare ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'flex-start' }}>

              {/* ── MAIN CONTENT: SIDE-BY-SIDE OR STANDARD PROFILE CARD ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {showCompare ? (
                  /* ── FULL SIDE-BY-SIDE COMPARISON VIEW ── */
                  <ProfileComparisonView
                    originalText={buildResumeText()}
                    optimizedResult={activeResult}
                    platform={activePlat as PlatformId}
                    onCopyOptimized={() => copyProfile(activePlat, activeResult.profileText)}
                    copied={copied === activePlat}
                    onSmartRefresh={() => handleSmartRefresh(activePlat as PlatformId)}
                    isRefreshing={refreshingPlat === activePlat}
                    refreshSuccess={refreshSuccessPlat === activePlat}
                  />
                ) : (
                  /* ── STANDARD PROFILE TEXT CARD ── */
                  <div style={S.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {(() => {
                          const config = PLATFORM_CONFIGS[activePlat as PlatformId];
                          const Icon = config?.icon;
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: config?.bgColor || 'rgba(11,125,110,.1)',
                                color: config?.brandColor || '#0B7D6E',
                                border: `1px solid ${config?.borderColor || 'rgba(11,125,110,.25)'}`,
                                padding: '4px 12px',
                                borderRadius: 50,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                              }}
                            >
                              {Icon && <Icon size={14} color={config?.brandColor} />}
                              {activePlat}
                            </span>
                          );
                        })()}
                        <span style={{ fontSize: '0.75rem', color: '#8B7355' }}>{activeResult.wordCount} words · {activeResult.profileText.length}/{activeResult.platformLimits.charLimit} chars</span>
                        {!activeResult.platformLimits.withinLimit && (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(220,38,38,.1)', color: '#DC2626', padding: '2px 8px', borderRadius: 50, fontWeight: 700 }}>⚠ Over limit</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {/* Smart Refresh for Active Platform */}
                        <button
                          onClick={() => handleSmartRefresh(activePlat as PlatformId)}
                          disabled={refreshingPlat === activePlat}
                          title={`Re-run SerpAPI & AI generation only for ${activePlat}`}
                          style={{
                            background: refreshSuccessPlat === activePlat ? 'rgba(11,125,110,.1)' : 'rgba(232,124,46,.08)',
                            border: `1px solid ${refreshSuccessPlat === activePlat ? '#0B7D6E' : 'rgba(232,124,46,.3)'}`,
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: '0.75rem',
                            cursor: refreshingPlat === activePlat ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            color: refreshSuccessPlat === activePlat ? '#0B7D6E' : '#E87C2E',
                            fontWeight: 700,
                            transition: 'all 0.15s ease',
                            opacity: refreshingPlat === activePlat ? 0.7 : 1,
                          }}
                        >
                          {refreshingPlat === activePlat ? (
                            <Loader2 size={13} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                          ) : refreshSuccessPlat === activePlat ? (
                            <Check size={13} color="#0B7D6E" />
                          ) : (
                            <RefreshCw size={13} />
                          )}
                          <span>{refreshingPlat === activePlat ? `Refreshing ${activePlat}...` : refreshSuccessPlat === activePlat ? 'Refreshed!' : 'Smart Refresh'}</span>
                        </button>

                        <button
                          onClick={() => setShowCompare(true)}
                          style={{
                            background: 'rgba(232,124,46,.08)',
                            border: '1px solid rgba(232,124,46,.3)',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#E87C2E',
                            fontWeight: 700,
                          }}
                        >
                          <Columns size={13} /> Compare with Resume
                        </button>
                        <button onClick={() => copyProfile(activePlat, activeResult.profileText)} style={{ background: 'transparent', border: '1px solid #E8E0D4', borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#8B7355' }}>
                          {copied === activePlat ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                        </button>
                        <button onClick={() => exportPDF(activePlat, activeResult)} style={{ background: 'transparent', border: '1px solid #E8E0D4', borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#8B7355' }}>
                          <Download size={13} /> PDF
                        </button>
                        <button onClick={() => shareByEmail(activePlat, activeResult)} style={{ background: 'transparent', border: '1px solid #E8E0D4', borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#8B7355' }}>
                          <Share2 size={13} /> Share
                        </button>
                      </div>
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.87rem', lineHeight: 1.7, color: '#1A1410', margin: 0, padding: '16px', background: '#FDFAF5', borderRadius: 10, border: '1px solid #E8E0D4' }}>{activeResult.profileText}</pre>
                  </div>
                )}

                {/* Keywords injected */}
                {activeResult.keywordsInjected.length > 0 && (
                  <div style={S.card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Tag size={15} color="#0B7D6E" />
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>Keywords Injected from Top Profiles</h4>
                      <span style={S.badgeLive}>{activeResult.keywordsInjected.length} keywords</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {activeResult.keywordsInjected.map((kw, i) => (
                        <span key={i} style={{ ...S.chip, background: 'rgba(11,125,110,.08)', borderColor: 'rgba(11,125,110,.25)', color: '#0B7D6E', fontWeight: 600 }}>✓ {kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitive gaps */}
                {activeResult.competitiveGaps.length > 0 && (
                  <div style={S.card}>
                    <button onClick={() => toggleSection(activePlat, 'gaps')} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, fontFamily: 'inherit' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={15} color="#E87C2E" />
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1A1410' }}>Competitive Gap Analysis</h4>
                        <span style={S.badgePri}>{activeResult.competitiveGaps.filter(g => !g.inResume).length} gaps</span>
                      </div>
                      {isSectionOpen(activePlat, 'gaps') ? <ChevronUp size={16} color="#8B7355" /> : <ChevronDown size={16} color="#8B7355" />}
                    </button>
                    {isSectionOpen(activePlat, 'gaps') && (
                      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activeResult.competitiveGaps.map((gap, i) => (
                          <div key={i} style={{ padding: '12px 14px', background: gap.inResume ? 'rgba(11,125,110,.05)' : 'rgba(232,124,46,.05)', borderRadius: 10, border: `1px solid ${gap.inResume ? 'rgba(11,125,110,.2)' : 'rgba(232,124,46,.2)'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: gap.inResume ? '#0B7D6E' : '#E87C2E' }}>{gap.keyword}</span>
                              <span style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,.06)', color: '#5C4B37', padding: '2px 8px', borderRadius: 50 }}>{gap.frequency}% of top profiles</span>
                              {gap.inResume
                                ? <span style={{ fontSize: '0.68rem', color: '#0B7D6E', fontWeight: 700 }}>✓ In resume</span>
                                : <span style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: 700 }}>✗ Missing</span>}
                            </div>
                            {!gap.inResume && <p style={{ fontSize: '0.78rem', color: '#5C4B37', margin: 0, lineHeight: 1.5 }}>{gap.suggestion}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Top patterns used */}
                {activeResult.topPatterns.length > 0 && (
                  <div style={S.card}>
                    <button onClick={() => toggleSection(activePlat, 'patterns')} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, fontFamily: 'inherit' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChart2 size={15} color="#0B7D6E" />
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1A1410' }}>Top Profile Patterns Used</h4>
                      </div>
                      {isSectionOpen(activePlat, 'patterns') ? <ChevronUp size={16} color="#8B7355" /> : <ChevronDown size={16} color="#8B7355" />}
                    </button>
                    {isSectionOpen(activePlat, 'patterns') && (
                      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {activeResult.topPatterns.slice(0, 3).map((pat, i) => (
                          <div key={i} style={{ padding: '12px 14px', background: '#FDFAF5', borderRadius: 10, border: '1px solid #E8E0D4' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0B7D6E', marginBottom: 6 }}>{pat.source}</div>
                            {pat.hookStyle && <div style={{ fontSize: '0.77rem', color: '#5C4B37', marginBottom: 4 }}><strong>Hook:</strong> {pat.hookStyle}</div>}
                            {pat.structureNotes && <div style={{ fontSize: '0.77rem', color: '#5C4B37', marginBottom: 6 }}><strong>Structure:</strong> {pat.structureNotes}</div>}
                            {pat.topKeywords.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {pat.topKeywords.slice(0, 6).map((kw, j) => <span key={j} style={{ ...S.chip, fontSize: '0.68rem' }}>{kw}</span>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Improvement tips */}
                {activeResult.improvementTips.length > 0 && (
                  <div style={{ ...S.card, borderLeft: '4px solid #F2C94C' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Lightbulb size={15} color="#CA8A04" />
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>Next Steps to Improve This Profile</h4>
                    </div>
                    <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {activeResult.improvementTips.map((tip, i) => (
                        <li key={i} style={{ fontSize: '0.82rem', color: '#5C4B37', lineHeight: 1.55 }}>{tip}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* ── RIGHT: Scores + Compliance ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Score overview */}
                <div style={S.card}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 16 }}>Profile Intelligence Scores</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Strength', val: activeResult.strengthScore, color: '#E87C2E' },
                      { label: 'SEO', val: activeResult.seoScore.overall, color: '#0B7D6E' },
                      { label: 'Trust', val: activeResult.trustScore, color: '#4A90E2' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ textAlign: 'center', padding: '12px 8px', background: '#FDFAF5', borderRadius: 10, border: '1px solid #E8E0D4' }}>
                        <div style={{ fontSize: '0.65rem', color: '#8B7355', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{val}%</div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={async () => {
                      if (!authContext.user) return;
                      const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
                      const { db } = await import('./lib/firebase');
                      const userRef = doc(db, 'users', authContext.user.uid);
                      
                      const cleanProfileText = (html: string) => {
                        try {
                          const doc = new DOMParser().parseFromString(html, 'text/html');
                          return doc.body.textContent || html;
                        } catch {
                          return html;
                        }
                      };

                      await updateDoc(userRef, {
                        [`savedProfiles.${activePlat}`]: {
                          text: cleanProfileText(activeResult.profileText),
                          seoScore: activeResult.seoScore.overall,
                          strengthScore: activeResult.strengthScore,
                          createdAt: new Date().toISOString()
                        },
                        totalProfilesGenerated: (authContext.user as any).totalProfilesGenerated + 1,
                        updatedAt: Timestamp.now()
                      });
                      alert("Optimized Profile saved to your cloud profile!");
                    }}
                    style={{ ...S.btnPri, width: '100%', justifyContent: 'center', marginBottom: 12, background: 'linear-gradient(135deg,#0B7D6E,#14532d)' }}
                  >
                    <Save size={16} /> Save {activePlat.toUpperCase()} Profile
                  </button>

                  {/* SEO breakdown */}
                  <div style={{ background: '#FDFAF5', borderRadius: 10, padding: '14px', border: '1px solid #E8E0D4' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1A1410', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SEO Sub-Factor Breakdown</div>
                    <SEOBar label="Keyword Density"     val={activeResult.seoScore.keywordDensity}    weight="25%" />
                    <SEOBar label="Title Optimization"  val={activeResult.seoScore.titleOptimization} weight="20%" />
                    <SEOBar label="Specificity"         val={activeResult.seoScore.specificity}        weight="25%" />
                    <SEOBar label="Searchability"       val={activeResult.seoScore.searchability}      weight="15%" />
                    <SEOBar label="CTA Presence"        val={activeResult.seoScore.ctaPresence}        weight="15%" />
                  </div>
                </div>

                {/* Compliance */}
                <div style={{ ...S.card, borderTop: `4px solid ${activeResult.compliance.passed && activeResult.compliance.blocked.length === 0 ? '#4ade80' : '#DC2626'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    {activeResult.compliance.passed && activeResult.compliance.blocked.length === 0
                      ? <ShieldCheck size={16} color="#0B7D6E" />
                      : <ShieldAlert size={16} color="#DC2626" />}
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>Platform Compliance — {activePlat}</h4>
                  </div>

                  {activeResult.compliance.blocked.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', marginBottom: 6 }}>🚫 Hard Violations (must fix)</div>
                      {activeResult.compliance.blocked.map((b, i) => (
                        <div key={i} style={{ fontSize: '0.78rem', color: '#DC2626', padding: '8px 10px', background: 'rgba(220,38,38,.06)', borderRadius: 8, border: '1px solid rgba(220,38,38,.2)', marginBottom: 6, lineHeight: 1.5 }}>{b}</div>
                      ))}
                    </div>
                  )}

                  {activeResult.compliance.warnings.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#CA8A04', textTransform: 'uppercase', marginBottom: 6 }}>⚠️ Warnings (should fix)</div>
                      {activeResult.compliance.warnings.map((w, i) => (
                        <div key={i} style={{ fontSize: '0.78rem', color: '#7A5C00', padding: '8px 10px', background: 'rgba(242,201,76,.08)', borderRadius: 8, border: '1px solid rgba(242,201,76,.3)', marginBottom: 6, lineHeight: 1.5 }}>{w}</div>
                      ))}
                    </div>
                  )}

                  {activeResult.compliance.passed && activeResult.compliance.blocked.length === 0 && activeResult.compliance.warnings.length === 0 && (
                    <div style={{ ...S.alertOk }}>
                      <CheckCircle2 size={14} /> All {activePlat} platform rules passed — safe to publish
                    </div>
                  )}
                </div>

                {/* Character limit meter */}
                <div style={S.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Character Limit</h4>
                    <span style={{ fontSize: '0.75rem', color: activeResult.platformLimits.withinLimit ? '#0B7D6E' : '#DC2626', fontWeight: 700 }}>
                      {activeResult.profileText.length} / {activeResult.platformLimits.charLimit}
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#E8E0D4', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min((activeResult.profileText.length / activeResult.platformLimits.charLimit) * 100, 100)}%`, height: '100%', background: activeResult.platformLimits.withinLimit ? '#0B7D6E' : '#DC2626', borderRadius: 4, transition: 'width 1s ease-out' }} />
                  </div>
                  <div style={{ fontSize: '0.73rem', color: '#8B7355', marginTop: 6 }}>
                    {activeResult.platformLimits.withinLimit
                      ? `${activeResult.platformLimits.charLimit - activeResult.profileText.length} characters remaining`
                      : `${activeResult.profileText.length - activeResult.platformLimits.charLimit} characters over limit — trim before publishing`}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button onClick={() => { setStep('form'); setResults({}); }} style={S.btnGhost}>← Edit Inputs</button>
            <button onClick={generate} style={S.btnPri}><RefreshCw size={15} /> Regenerate All</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════
// INTELLIGENCE LAYER
// ══════════════════════════════
const IntelligenceLayer = () => {
  const [form, setForm] = useState({
    role: 'Frontend Developer',
    industry: '',
    intlMarket: 'United States',
    localMarket: 'Pakistan',
    workType: 'Remote',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [data, setData]       = useState<MarketInsightData | null>(null);

  // Fall back to static INTEL when no live data yet
  const localSkills = data?.localSkills ?? INTEL.localSkills;
  const intlSkills  = data?.intlSkills  ?? INTEL.intlSkills;
  const trending    = data?.trending    ?? INTEL.trending.map(t => {
    const parts = t.split(' '); return { skill: parts[0], growth: parts[1] ?? 'stable' };
  });
  const declining   = data?.declining   ?? INTEL.declining.map(t => {
    const parts = t.split(' '); return { skill: parts[0], growth: parts[1] ?? '' };
  });
  const salaryIntel = data?.salaryIntel ?? null;
  const regionalPreferences = data?.regionalPreferences ?? null;

  // Stable cards shown when no live data loaded yet
  const DEFAULT_REGIONAL = [
    { flag: '🇺🇸', label: 'US Clients',    color: '#0B7D6E', bg: 'rgba(11,125,110,.06)',  border: 'rgba(11,125,110,.2)',  items: ['Direct, ROI-focused proposals', 'Technical depth expected', 'Portfolio + measurable results', 'Quick response time valued'] },
    { flag: '🇬🇧', label: 'UK Clients',    color: '#E87C2E', bg: 'rgba(232,124,46,.06)', border: 'rgba(232,124,46,.2)', items: ['Formal, structured tone', 'Culture-fit questions common', 'Detailed process explanation', 'Reliability signals important'] },
    { flag: '🇵🇰', label: 'Local Clients', color: '#8B6914', bg: 'rgba(242,201,76,.1)',  border: 'rgba(242,201,76,.3)',  items: ['Relationship-first approach', 'Urdu/English mix fine', 'Flexible revision policies', 'Phone availability preferred'] },
  ];

  // Map live regionalPreferences object to card array
  const MARKET_META: Record<string, { flag: string; color: string; bg: string; border: string }> = {
    'United States': { flag: '🇺🇸', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)',  border: 'rgba(11,125,110,.2)'  },
    'United Kingdom': { flag: '🇬🇧', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)', border: 'rgba(11,125,110,.2)'  },
    'Canada':         { flag: '🇨🇦', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)', border: 'rgba(11,125,110,.2)'  },
    'Australia':      { flag: '🇦🇺', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)', border: 'rgba(11,125,110,.2)'  },
    'Germany':        { flag: '🇩🇪', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)', border: 'rgba(11,125,110,.2)'  },
    'United Arab Emirates': { flag: '🇦🇪', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)', border: 'rgba(11,125,110,.2)' },
    'Saudi Arabia':   { flag: '🇸🇦', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)', border: 'rgba(11,125,110,.2)'  },
    'Singapore':      { flag: '🇸🇬', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)', border: 'rgba(11,125,110,.2)'  },
    'Netherlands':    { flag: '🇳🇱', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)', border: 'rgba(11,125,110,.2)'  },
    'Sweden':         { flag: '🇸🇪', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)', border: 'rgba(11,125,110,.2)'  },
    'UK':             { flag: '🇬🇧', color: '#E87C2E', bg: 'rgba(232,124,46,.06)', border: 'rgba(232,124,46,.2)'  },
    'Pakistan':       { flag: '🇵🇰', color: '#8B6914', bg: 'rgba(242,201,76,.1)',  border: 'rgba(242,201,76,.3)'  },
  };

  const handleAnalyse = async () => {
    if (!form.role.trim()) { setError('Please enter a job role.'); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeMarket({
        role:        form.role,
        industry:    form.industry,
        intlMarket:  form.intlMarket,
        localMarket: form.localMarket,
        workType:    form.workType as 'Remote' | 'Hybrid' | 'Onsite',
      });
      setData(result);
    } catch (e: any) {
      setError('Analysis failed — check your API keys or try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={S.mb(28)}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.9rem', marginBottom: 6 }}>Pakistan Intelligence Layer</h2>
        <p style={{ color: '#8B7355' }}>Live market data from JSearch & Google Jobs, synthesized by OpenAI</p>
      </div>

      {/* ── CONFIG FORM ── */}
      <div style={{ ...S.card, marginBottom: 28 }}>
        <h3 style={{ fontSize: '1.2rem', fontFamily: "'Playfair Display',serif", fontWeight: 700, marginBottom: 16 }}>Market Analysis Config</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={S.label}>Job Role</label>
            <input
              type="text"
              placeholder="e.g. Full Stack Developer"
              style={S.input}
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
            />
          </div>
          <div>
            <label style={S.label}>Industry</label>
            <input
              type="text"
              placeholder="e.g. Fintech"
              style={S.input}
              value={form.industry}
              onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
            />
          </div>
          <div>
            <label style={S.label}>International Market</label>
            <select
              style={{ ...S.input, appearance: 'auto' }}
              value={form.intlMarket}
              onChange={e => setForm(p => ({ ...p, intlMarket: e.target.value }))}
            >
              {['United States','United Kingdom','Canada','Australia','Germany','United Arab Emirates','Saudi Arabia','Singapore','Netherlands','Sweden'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Local Market</label>
            <select style={{ ...S.input, appearance: 'auto' }} value={form.localMarket} onChange={e => setForm(p => ({ ...p, localMarket: e.target.value }))}>
              <option>Pakistan</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.label}>Work Type</label>
            <select
              style={{ ...S.input, appearance: 'auto' }}
              value={form.workType}
              onChange={e => setForm(p => ({ ...p, workType: e.target.value }))}
            >
              {['Remote','Hybrid','Onsite'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleAnalyse} disabled={loading} style={S.btnPri}>
          {loading
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analysing Market...</>
            : <><Globe size={16} /> Analyse Market</>}
        </button>

        {error && (
          <div style={{ ...S.alertWarn, marginTop: 16 }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}
        {data && !loading && (
          <div style={{ ...S.alertOk, marginTop: 16 }}>
            <CheckCircle2 size={15} /> Live data loaded for <strong>{form.role}</strong>{form.industry ? ` · ${form.industry}` : ''} — {form.intlMarket} &amp; {form.localMarket}
          </div>
        )}
      </div>

      {/* ── SKILLS ── */}
      <div style={{ ...S.grid2, marginBottom: 20 }}>
        <div style={{ ...S.card, borderTop: '4px solid #0B7D6E' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>🇵🇰 Local Market — {form.localMarket}</h3>
            <span style={S.badgeLive}>{data ? 'Live' : 'Default'}</span>
          </div>
          {localSkills.map(s => <ProgBar key={s.name} label={s.name} pct={s.pct} color="#0B7D6E" />)}
        </div>
        <div style={{ ...S.card, borderTop: '4px solid #E87C2E' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>🌍 International — {form.intlMarket}</h3>
            <span style={S.badgeLive}>{data ? 'Live' : 'Default'}</span>
          </div>
          {intlSkills.map(s => <ProgBar key={s.name} label={s.name} pct={s.pct} color="#E87C2E" />)}
        </div>
      </div>

      {/* ── SALARY ── */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: '1.2rem', fontFamily: "'Playfair Display',serif", fontWeight: 700, marginBottom: 16 }}>
          Salary Intelligence — {form.intlMarket} vs {form.localMarket}
        </h3>
        <div style={S.grid2}>
          <div style={{ ...S.card, borderTop: '4px solid #E87C2E' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 18 }}>International Rates</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {[
                ['Min',     salaryIntel?.intlMin ?? '$25/hr'],
                ['Average', salaryIntel?.intlAvg ?? '$52/hr'],
                ['Top',     salaryIntel?.intlMax ?? '$95/hr'],
              ].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: '#8B7355', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.4rem', color: '#E87C2E' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...S.card, borderTop: '4px solid #0B7D6E' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 18 }}>Local Rates</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {[
                ['Min',     salaryIntel?.localMin ?? '80k PKR'],
                ['Average', salaryIntel?.localAvg ?? '185k PKR'],
                ['Max',     salaryIntel?.localMax ?? '350k PKR'],
              ].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: '#8B7355', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.4rem', color: '#0B7D6E' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TRENDS ── */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: '1.2rem', fontFamily: "'Playfair Display',serif", fontWeight: 700, marginBottom: 16 }}>Market Trends</h3>
        <div style={S.grid2}>
          <div style={{ ...S.card, borderTop: '4px solid #0B7D6E' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 18 }}>Trending Skills</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {trending.map(t => (
                <span key={t.skill} style={{ ...S.chip, color: t.growth === 'stable' ? '#E87C2E' : '#0B7D6E', borderColor: t.growth === 'stable' ? 'rgba(232,124,46,.3)' : 'rgba(11,125,110,.3)' }}>
                  {t.growth === 'stable' ? '→' : '↑'} {t.skill} {t.growth !== 'stable' ? t.growth : ''}
                </span>
              ))}
            </div>
          </div>
          <div style={{ ...S.card, borderTop: '4px solid #E87C2E' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 18 }}>Declining Skills</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {declining.map(t => (
                <span key={t.skill} style={S.chip}>↓ {t.skill} {t.growth}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── REGIONAL PREFERENCES ── */}
      <div style={S.card}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 18 }}>Regional Client Preferences</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {regionalPreferences
            ? Object.entries(regionalPreferences).map(([market, prefs], idx) => {
                const meta = MARKET_META[market] ?? { flag: '🌍', color: '#0B7D6E', bg: 'rgba(11,125,110,.06)', border: 'rgba(11,125,110,.2)' };
                return (
                  <div key={market} style={{ padding: 18, background: meta.bg, borderRadius: 14, border: `1px solid ${meta.border}` }}>
                    <div style={{ fontWeight: 700, color: meta.color, marginBottom: 10 }}>{meta.flag} {market}</div>
                    <ul style={{ fontSize: '0.83rem', color: '#8B7355', paddingLeft: 16, lineHeight: 2.1, margin: 0 }}>
                      {(prefs as string[]).map(item => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                );
              })
            : DEFAULT_REGIONAL.map(r => (
                <div key={r.label} style={{ padding: 18, background: r.bg, borderRadius: 14, border: `1px solid ${r.border}` }}>
                  <div style={{ fontWeight: 700, color: r.color, marginBottom: 10 }}>{r.flag} {r.label}</div>
                  <ul style={{ fontSize: '0.83rem', color: '#8B7355', paddingLeft: 16, lineHeight: 2.1, margin: 0 }}>
                    {r.items.map(i => <li key={i}>{i}</li>)}
                  </ul>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════
// MAIN APP SHELL
// ══════════════════════════════
const NAV = [
  { id: 'home', label: 'Home', icon: <Home size={18} /> },
  { id: 'intelligence', label: 'Intelligence Layer', icon: <Globe size={18} /> },
  { id: 'career', label: 'Career Analysis', icon: <Target size={18} />, badge: 'AI' },
  { id: 'profile', label: 'Profile Generator', icon: <Sparkles size={18} /> },
  { id: 'proposal', label: 'Proposal Generator', icon: <Briefcase size={18} /> },
  { id: 'salary',      label: 'Salary Coach',     icon: <DollarSign size={18} />, badge: '🔥' },
  { id: 'myprofile', label: 'My Profile', icon: <User size={18} />, badge: '★' },
];

const TITLES: Record<string, { t: string; s: string }> = {
  home: { t: 'Roshan AI', s: "Pakistan's first AI career intelligence platform" },
  intelligence: { t: 'Pakistan Intelligence Layer', s: 'Live market data updated every 6 hours' },
  career: { t: 'Career Analysis', s: 'Discover skill gaps, market readiness, and actionable next steps' },
  profile: { t: 'Platform Profile Generator', s: 'Generate 6 optimized profiles simultaneously' },
  proposal: { t: 'Proposal Generator', s: 'Craft hyper-converting bids using your resume & AI' },
  salary: { t: 'Salary Negotiation Coach', s: 'Stop underpricing — know exactly what to say' },
  myprofile: { t: 'My Profile & Roshan Score', s: 'Track your career readiness — persists between sessions' },

};

class ErrorBoundary extends React.Component<any, any> {
  state: { hasError: boolean; error: Error | null };
  props: any;
  
  constructor(props: any) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
          <AlertCircle size={48} color="#E87C2E" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Something went wrong.</h2>
          <p style={{ color: '#8B7355', fontSize: '0.9rem', marginBottom: 20 }}>An unexpected error occurred in the application.</p>
          <pre style={{ textAlign: 'left', background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #E8E0D4', overflowX: 'auto', fontSize: '0.8rem', color: '#DC2626' }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ ...S.btnPri, marginTop: 24 }}>
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { AuthProvider } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';

function InnerApp() {
  const [page, setPage] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const authContext = useAuth(); // Safely called inside AuthProvider

  const navigate = (p: string) => {
    setPage(p);
    setMobileMenuOpen(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif", background: '#FDFAF5', color: '#1A1410', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@400,600,700,900&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        select, input, textarea { font-family: inherit; }
        select:focus, input:focus, textarea:focus { border-color: #E87C2E !important; box-shadow: 0 0 0 3px rgba(232,124,46,.12); }
        button:disabled { opacity: .55; cursor: not-allowed; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #E8E0D4; border-radius: 3px; }
        pre { font-family: "DM Sans", sans-serif !important; }
        
        @media (max-width: 1024px) {
          .sidebar-hidden { transform: translateX(-100%); }
          .sidebar-visible { transform: translateX(0); }
          .main-expanded { margin-left: 0 !important; }
        }
      `}</style>
      <AuthModal />

      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90, backdropFilter: 'blur(4px)' }} 
        />
      )}

      {/* SIDEBAR */}
      <aside className={mobileMenuOpen ? 'sidebar-visible' : 'sidebar-hidden'} style={{ 
        width: 260, 
        background: '#1A1410', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        zIndex: 100, 
        overflowY: 'auto',
        transition: 'transform 0.3s ease-in-out'
      }}>
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0, position: 'relative' }}>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            style={{ position: 'absolute', top: 20, right: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="lg:hidden"
          >
            <X size={20} />
          </button>
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" style={{ marginBottom: 8 }}>
            <defs><linearGradient id="sg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#E87C2E" /><stop offset="1" stopColor="#F2C94C" /></linearGradient></defs>
            <path d="M20 2C10.06 2 2 10.06 2 20s8.06 18 18 18c7.52 0 13.97-4.61 16.63-11.26-7.5 1.34-14.83-3.84-16.63-11.14-.84-3.64.55-7.28 3.33-9.82A18.15 18.15 0 0020 5.52V2z" fill="url(#sg)" />
          </svg>
          <div style={{ color: '#fff', fontFamily: "'Playfair Display',serif", fontSize: '1.25rem', fontWeight: 700 }}>Roshan AI</div>
          <span style={{ fontFamily: "'Noto Nastaliq Urdu',serif", color: '#E87C2E', fontSize: '0.72rem', display: 'block', marginTop: 2 }}>روشن</span>
          <span style={{ color: 'rgba(255,255,255,.3)', fontSize: '0.68rem', marginTop: 4, display: 'block' }}>Illuminate Your Career</span>
        </div>
        
        {/* User Auth Block */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
           {authContext.user ? (
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               {authContext.profile?.photoURL ? (
                 <img src={authContext.profile.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
               ) : (
                 <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E87C2E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                   {authContext.profile?.displayName?.charAt(0) || 'U'}
                 </div>
               )}
               <div style={{ flex: 1, overflow: 'hidden' }}>
                 <div style={{ color: '#FDFBF7', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{authContext.profile?.displayName || 'User'}</div>
                 <button onClick={() => authContext.signOutUser()} style={{ background: 'none', border: 'none', color: '#8B7355', fontSize: '0.7rem', cursor: 'pointer', padding: 0 }}>Sign out</button>
               </div>
             </div>
           ) : (
             <button onClick={() => authContext.openAuthModal()} style={{ width: '100%', padding: '10px', background: 'rgba(232,124,46,.15)', border: '1px solid rgba(232,124,46,.3)', borderRadius: 8, color: '#E87C2E', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all .2s' }}>
               Sign In / Sign Up
             </button>
           )}
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          <div style={{ color: 'rgba(255,255,255,.28)', fontSize: '0.62rem', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '8px 24px 6px', marginTop: 8 }}>Core Features</div>
          {NAV.map(item => (
            <div key={item.id} onClick={() => navigate(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 24px', color: page === item.id ? '#fff' : 'rgba(255,255,255,.55)', cursor: 'pointer', borderLeft: `3px solid ${page === item.id ? '#E87C2E' : 'transparent'}`, background: page === item.id ? 'rgba(232,124,46,.15)' : 'transparent', transition: 'all .18s', fontSize: '0.88rem', fontWeight: 500 }}>
              <span style={{ opacity: page === item.id ? 1 : 0.65 }}>{item.icon}</span>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', background: '#E87C2E', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>{item.badge}</span>}
            </div>
          ))}
        </nav>
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
          <div style={{ background: 'rgba(11,125,110,.2)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '0.72rem' }}>Intelligence live AI</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-expanded" style={{ marginLeft: 260, flex: 1, minHeight: '100vh', overflowY: 'auto' }}>
        {page !== 'home' ? (
          <div style={{ background: 'rgba(253,250,245,.95)', backdropFilter: 'blur(10px)', padding: '16px 24px', borderBottom: '1px solid #E8E0D4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button 
                onClick={() => setMobileMenuOpen(true)}
                style={{ background: 'none', border: 'none', color: '#1A1410', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                className="lg:hidden"
              >
                <Menu size={24} />
              </button>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 600 }}>{TITLES[page]?.t}</div>
                <div style={{ fontSize: '0.78rem', color: '#8B7355', marginTop: 2 }}>{TITLES[page]?.s}</div>
              </div>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setMobileMenuOpen(true)}
            style={{ position: 'fixed', top: 20, left: 20, zIndex: 60, background: '#1A1410', border: 'none', color: '#fff', cursor: 'pointer', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
            className="lg:hidden"
          >
            <Menu size={22} />
          </button>
        )}
        {page === 'home' && <Homepage onNavigate={navigate} />}
        {page === 'intelligence' && <IntelligenceLayer />}
        {page === 'career' && <CareerAnalysis />}
        {page === 'profile' && <ProfileGenerator />}
        {page === 'proposal' && <ProposalGenerator />}
        {page === 'salary'     && <SalaryCoach />}
        {page === 'myprofile' && <UserProfilePage onNavigate={setPage} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}