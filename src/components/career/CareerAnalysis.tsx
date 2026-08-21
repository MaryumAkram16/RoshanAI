import React, { useState, useRef } from 'react';
import {
  Target, Loader2, Zap, AlertCircle,
  UploadCloud, FileText, CheckCircle2, BookOpen, Youtube,
  Briefcase, Award, BarChart2,
  Clock, MapPin, ExternalLink, X, RefreshCw, Save
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveCareerAnalysisToFirebase } from '../../lib/firebase';
import { callOpenAI, extractTextFromResume, S } from '../../App';
import { apiFetch } from '../../lib/apiClient';

// Provider credentials are kept on the server; this component retains the same
// feature-level fallbacks when optional live data is unavailable.

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
interface RawJob {
  job_title:           string;
  employer_name:       string;
  job_city:            string;
  job_country:         string;
  job_is_remote:       boolean;
  job_employment_type: string;
  job_apply_link:      string;
  job_google_link:     string;
  job_description:     string;
  job_highlights:      { Qualifications?: string[]; Responsibilities?: string[] };
}

interface SkillRow {
  youHave:         string;   // what the candidate already has (from resume)
  marketRequired:  string;   // what the job market demands (from JSearch data)
  priority:        'Critical' | 'High' | 'Medium' | 'Low';
  timelineToLearn: string;
  hasIt:           boolean;
}

interface JobMatch {
  jobTitle:           string;
  company:            string;
  location:           string;
  isRemote:           boolean;
  employmentType:     string;
  applyLink:          string;
  matchScore:         number;
  atsScore:           number;
  skillMatchScore:    number;
  experienceFitScore: number;
  whyMatch:           string;
}

interface MissingSkillResource {
  skill:        string;
  priority:     'Critical' | 'High' | 'Medium';
  youtubeUrl:   string;
  youtubeTitle: string;
  paidCourse?:  { title: string; platform: string; url: string };
  certificate?: { name: string; url: string };
}

interface AnalysisResult {
  gapScore:       number;
  matchBreakdown: { keywordMatch: number; skillsOverlap: number; experienceFit: number; atsFormat: number };
  skillAnalysis:  SkillRow[];
  topJobs:        JobMatch[];
  missingSkills:  MissingSkillResource[];
  summary:        string;
}

// ─────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────

/** Fetch jobs from JSearch RapidAPI */
async function fetchJSearchJobs(role: string, market: string, workType: string): Promise<RawJob[]> {
  const isRemote = workType.toLowerCase() === 'remote';
  const params = new URLSearchParams({
    query:            `${role} in ${market}`,
    num_pages:        '3',
    results_per_page: '5',
    job_details:      'true',
    date_posted:      'all',
    employment_types: isRemote
      ? 'FULLTIME'
      : workType.toLowerCase() === 'onsite'
        ? 'FULLTIME'
        : 'FULLTIME,PARTTIME,CONTRACTOR',
  });
  if (isRemote) params.set('remote_jobs_only', 'true');

  try {
    const res = await apiFetch(`/api/jobs?${params.toString()}`);
    if (!res.ok) {
      console.warn('[CareerAnalysis] JSearch non-OK:', res.status);
      return [];
    }
    const data = await res.json();
    return (data?.data ?? []) as RawJob[];
  } catch (err) {
    console.warn('[CareerAnalysis] JSearch fetch error:', err);
    return [];
  }
}

/** Fetch top YouTube tutorial for a skill */
async function fetchYouTubeVideo(skill: string): Promise<{ url: string; title: string }> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial for beginners')}`;
  const fallback  = { url: searchUrl, title: `Search "${skill} tutorial" on YouTube` };
  try {
    const res = await apiFetch(`/api/youtube?skill=${encodeURIComponent(skill)}`);
    if (!res.ok) return fallback;
    const data = await res.json();
    if (!data?.url) return fallback;
    return { url: data.url, title: data.title ?? fallback.title };
  } catch {
    return fallback;
  }
}

/** Fetch paid course via SerpAPI (Udemy / Coursera) */
async function fetchPaidCourse(skill: string): Promise<{ title: string; platform: string; url: string }> {
  // Always return a usable link even without SerpAPI key
  const udemyFallback = {
    title:    `${skill} – Complete Beginner to Advanced Course`,
    platform: 'Udemy',
    url:      `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill)}&sort=relevance`,
  };
  try {
    const res = await apiFetch(`/api/serp-jobs?skill=${encodeURIComponent(skill)}`);
    if (!res.ok) return udemyFallback;
    const data  = await res.json();
    const first = (data?.organic_results ?? [])[0];
    if (!first?.link) return udemyFallback;
    const platform = first.link.includes('coursera') ? 'Coursera' : 'Udemy';
    return { title: first.title ?? `${skill} Course`, platform, url: first.link };
  } catch {
    return udemyFallback;
  }
}

/** Build a Google-searchable certificate URL */
function buildCertificateUrl(certName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(certName + ' certification')}`;
}

// ─────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────

const PriorityBadge = ({ p }: { p: string }) => {
  const cfg: Record<string, { bg: string; color: string }> = {
    Critical: { bg: 'rgba(239,68,68,.12)',  color: '#DC2626' },
    High:     { bg: 'rgba(249,115,22,.12)', color: '#EA580C' },
    Medium:   { bg: 'rgba(234,179,8,.12)',  color: '#CA8A04' },
    Low:      { bg: 'rgba(34,197,94,.12)',  color: '#16A34A' },
  };
  const c = cfg[p] ?? cfg.Medium;
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
      {p}
    </span>
  );
};

const ScoreRing = ({ score, size = 110 }: { score: number; size?: number }) => {
  const r     = size / 2 - 9;
  const circ  = 2 * Math.PI * r;
  const color = score >= 70 ? '#0B7D6E' : score >= 45 ? '#E87C2E' : '#DC2626';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8E0D4" strokeWidth="9" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: '1.55rem', fontWeight: 800, fontFamily: "'Playfair Display',serif", color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.6rem', color: '#8B7355', fontWeight: 700, letterSpacing: '0.5px', marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  );
};

// Mini progress bar used in breakdown cards
const MiniBar = ({ val }: { val: number }) => {
  const color = val >= 70 ? '#0B7D6E' : val >= 45 ? '#E87C2E' : '#DC2626';
  return (
    <div style={{ height: 5, background: '#E8E0D4', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${val}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 1.1s ease-out' }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export function CareerAnalysis() {
  const { user, requireAuth } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // ── Upload state ────────────────────────────────────────
  const [dragActive,      setDragActive]      = useState(false);
  const [resumeFile,      setResumeFile]      = useState<File | null>(null);
  const [resumeText,      setResumeText]      = useState<string | null>(null);
  const [showOcrConfirm,  setShowOcrConfirm]  = useState(false);
  const [fileProcessing,  setFileProcessing]  = useState(false);
  const [fileProgress,    setFileProgress]    = useState(0);
  const [processingState, setProcessingState] = useState('');
  const [uploadWarning,   setUploadWarning]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ──────────────────────────────────────────
  const [targetRole,   setTargetRole]   = useState('');
  const [targetMarket, setTargetMarket] = useState('United States');
  const [marketType,   setMarketType]   = useState<'international' | 'local'>('international');
  const [workType,     setWorkType]     = useState<'Remote' | 'Hybrid' | 'Onsite'>('Remote');

  // ── Analysis state ──────────────────────────────────────
  const [loading,     setLoading]     = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result,      setResult]      = useState<AnalysisResult | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [jobsFound,   setJobsFound]   = useState(0);

  const INTL_MARKETS = [
    'United States','United Kingdom','Canada','Australia',
    'Germany','United Arab Emirates','Saudi Arabia','Singapore',
    'Netherlands','Sweden','France','Japan',
  ];

  // ── File handling ────────────────────────────────────────
  const handleFile = (f: File) => {
    const validExts = ['.pdf','.docx','.txt','.rtf','.jpeg','.jpg','.png'];
    const isImage   = f.type.startsWith('image/');
    if (!validExts.some(ext => f.name.toLowerCase().endsWith(ext))) {
      setError('Please upload a PDF, DOCX, TXT, RTF, or image file.');
      return;
    }
    setError(null);
    setUploadWarning(isImage ? 'Image formats may yield less accurate text extraction than PDFs.' : null);
    setFileProcessing(true);
    setFileProgress(0);
    setProcessingState('Reading file…');
    setResumeFile(f);
    setShowOcrConfirm(false);
    setResumeText(null);

    const reader = new FileReader();
    reader.onloadstart = () => { setFileProgress(10); };
    reader.onprogress  = (e) => {
      if (e.lengthComputable) setFileProgress(Math.min(Math.round((e.loaded / e.total) * 85), 85));
    };
    reader.onload = async () => {
      setProcessingState('Extracting text via AI…');
      setFileProgress(90);
      const base64 = (reader.result as string).split(',')[1];
      const name   = f.name.toLowerCase();
      let mimeType = 'text/plain';
      if      (name.endsWith('.pdf'))                        mimeType = 'application/pdf';
      else if (name.endsWith('.docx'))                       mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (name.endsWith('.rtf'))                        mimeType = 'application/rtf';
      else if (name.endsWith('.jpeg') || name.endsWith('.jpg')) mimeType = 'image/jpeg';
      else if (name.endsWith('.png'))                        mimeType = 'image/png';

      try {
        const text = await extractTextFromResume({ mimeType, data: base64 });
        setResumeText(text);
        setShowOcrConfirm(true);
        setFileProgress(100);
      } catch {
        setError('Failed to extract text from resume. Please try again.');
      } finally {
        setFileProcessing(false);
        setProcessingState('');
      }
    };
    reader.onerror = () => {
      setError('File read failed. Please try another file.');
      setFileProcessing(false);
    };
    reader.readAsDataURL(f);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  // ── Main analysis pipeline ───────────────────────────────
  const analyze = async () => {
    if (!resumeText)          { setError('Please upload your resume first.'); return; }
    if (showOcrConfirm)       { setError('Please confirm the extracted resume text before analyzing.'); return; }
    if (!targetRole.trim())   { setError('Please enter a target role.'); return; }

    setLoading(true);
    setError(null);
    setResult(null);
    setJobsFound(0);

    try {
      const market = marketType === 'local' ? 'Pakistan' : targetMarket;

      // ── STEP 1: Fetch live jobs from JSearch ──────────────
      setLoadingStep(`🔍 Fetching live "${targetRole}" jobs in ${market}…`);
      const rawJobs = await fetchJSearchJobs(targetRole, market, workType);
      setJobsFound(rawJobs.length);

      // Build compact job summaries to send to OpenAI
      // Include full descriptions so OpenAI can extract required skills accurately
      const jobSummaries = rawJobs.slice(0, 12).map((j, idx) => ({
        idx,
        title:           j.job_title        || '',
        company:         j.employer_name    || '',
        location:        j.job_city ? `${j.job_city}, ${j.job_country || ''}` : (j.job_country || 'Remote'),
        isRemote:        !!j.job_is_remote,
        employmentType:  j.job_employment_type || '',
        applyLink:       j.job_apply_link   || j.job_google_link || '',
        // Keep first 1000 chars of description for skill extraction
        description:     (j.job_description || '').slice(0, 1000),
        qualifications:  (j.job_highlights?.Qualifications  || []).slice(0, 8).join(' | '),
        responsibilities:(j.job_highlights?.Responsibilities || []).slice(0, 5).join(' | '),
      }));

      // ── STEP 2: OpenAI deep analysis ─────────────────────
      setLoadingStep(`🤖 AI is comparing your resume to ${rawJobs.length > 0 ? rawJobs.length + ' live jobs' : 'market knowledge'}…`);

      const prompt = `You are an expert ATS evaluator and career coach. Analyze the candidate's resume against REAL job market data.

════════════════════════════════════
CANDIDATE RESUME:
════════════════════════════════════
${resumeText}

════════════════════════════════════
ANALYSIS TARGET:
════════════════════════════════════
Target Role:   ${targetRole}
Target Market: ${market}
Work Type:     ${workType}

════════════════════════════════════
LIVE MARKET JOB DATA (${rawJobs.length} jobs fetched from JSearch API):
════════════════════════════════════
${jobSummaries.length > 0
  ? JSON.stringify(jobSummaries, null, 2)
  : 'NO LIVE DATA AVAILABLE — use your training knowledge about typical requirements for this role/market.'}

════════════════════════════════════
YOUR TASKS:
════════════════════════════════════

1. gapScore (integer 0-100):
   - Count skills found in job descriptions/qualifications above that are PRESENT in the resume → matched
   - Count skills found in job descriptions/qualifications above that are ABSENT in the resume → missing
   - gapScore = round(matched / (matched + missing) * 100)
   - If no live data: estimate from your knowledge of the role/market

2. matchBreakdown (4 scores 0-100, MUST differ from each other and reflect real resume quality):
   - keywordMatch: % of important job-description keywords found in resume
   - skillsOverlap: % of required technical skills the candidate already has
   - experienceFit: how well candidate's experience level matches the role seniority
   - atsFormat: resume ATS-friendliness (clear sections, bullets, measurable achievements, no tables)

3. skillAnalysis (MINIMUM 10 rows — CRITICAL RULE):
   - youHave: extract the EXACT skill/tool the candidate lists in their resume (e.g. "React 18", "3 yrs Python"). If they don't have it, write "—"
   - marketRequired: extract the EXACT skill/requirement from the job descriptions above (e.g. "React + TypeScript", "5+ yrs Python"). Do NOT copy from the resume — copy from the JOB DATA above.
   - priority: Critical (appears in >60% of jobs), High (30-60%), Medium (<30%), Low (nice-to-have)
   - timelineToLearn: realistic estimate if missing (e.g. "2-3 weeks", "3 months")
   - hasIt: true ONLY if the skill is clearly present in the RESUME TEXT above

4. topJobs (use the job objects from LIVE MARKET JOB DATA above — do NOT invent jobs):
   - Score each fetched job against the resume: matchScore, atsScore, skillMatchScore, experienceFitScore (0-100)
   - Add a 'whyMatch' string explaining in 1 sentence why this job is a good fit.
   - Keep job title, company, location, isRemote, employmentType, applyLink EXACTLY as in the data
   - Return the top 4 best-matching jobs sorted by matchScore DESC
   - If no live data, return []

5. missingSkills (max 8 — only skills ABSENT from resume but present in job data):
   - priority: Critical / High / Medium only
   - certificate: suggest the most recognized cert (e.g. "AWS Certified Solutions Architect – Associate")
   - Do NOT include skills the candidate already has

6. summary: 2-sentence plain-English summary of the candidate's fit and their single biggest opportunity.

════════════════════════════════════
RETURN ONLY VALID JSON — NO markdown fences, NO explanation:
════════════════════════════════════
{
  "gapScore": 68,
  "matchBreakdown": {
    "keywordMatch": 62,
    "skillsOverlap": 55,
    "experienceFit": 78,
    "atsFormat": 60
  },
  "skillAnalysis": [
    {
      "youHave": "React 18",
      "marketRequired": "React + TypeScript (required in 87% of listings)",
      "priority": "Critical",
      "timelineToLearn": "3-4 weeks",
      "hasIt": true
    },
    {
      "youHave": "—",
      "marketRequired": "Next.js 14 (App Router)",
      "priority": "High",
      "timelineToLearn": "4-6 weeks",
      "hasIt": false
    }
  ],
  "topJobs": [
    {
      "jobTitle": "Senior React Developer",
      "company": "Acme Corp",
      "location": "New York, US",
      "isRemote": true,
      "employmentType": "FULLTIME",
      "applyLink": "https://...",
      "matchScore": 78,
      "atsScore": 82,
      "skillMatchScore": 74,
      "experienceFitScore": 80,
      "whyMatch": "Strong overlap with your React experience, though missing Next.js."
    }
  ],
  "missingSkills": [
    {
      "skill": "TypeScript",
      "priority": "Critical",
      "certificate": "Microsoft Certified: Azure Developer Associate"
    }
  ],
  "summary": "You have a strong React foundation but are missing TypeScript and Next.js which appear in 87% of the ${targetRole} roles in ${market}. Upskilling in TypeScript first would unlock the most opportunities."
}`;

      const raw   = await callOpenAI(prompt);
      const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      let parsed: any;
      try {
        parsed = JSON.parse(clean);
      } catch {
        // Try to extract JSON object if extra text slipped in
        const match = clean.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('OpenAI returned invalid JSON');
        parsed = JSON.parse(match[0]);
      }

      // ── STEP 3: Enrich missing skills with YouTube + paid courses (parallel) ──
      setLoadingStep('📚 Fetching YouTube tutorials and paid courses for skill gaps…');
      const enriched: MissingSkillResource[] = await Promise.all(
        (parsed.missingSkills ?? []).slice(0, 8).map(async (ms: any) => {
          const [yt, course] = await Promise.all([
            fetchYouTubeVideo(ms.skill),
            fetchPaidCourse(ms.skill),
          ]);
          const certName = typeof ms.certificate === 'string' ? ms.certificate : '';
          return {
            skill:       ms.skill,
            priority:    ms.priority,
            youtubeUrl:  yt.url,
            youtubeTitle:yt.title,
            paidCourse:  course,
            certificate: certName
              ? { name: certName, url: buildCertificateUrl(certName) }
              : undefined,
          } as MissingSkillResource;
        })
      );

      setResult({
        gapScore:       parsed.gapScore       ?? 0,
        matchBreakdown: parsed.matchBreakdown ?? { keywordMatch:0, skillsOverlap:0, experienceFit:0, atsFormat:0 },
        skillAnalysis:  parsed.skillAnalysis  ?? [],
        topJobs:        parsed.topJobs        ?? [],
        missingSkills:  enriched,
        summary:        parsed.summary        ?? '',
      });

    } catch (e: any) {
      console.error('[CareerAnalysis] pipeline error:', e);
      setError('Analysis failed. Please check your inputs and try again.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 16px', maxWidth: 1240, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={S.mb(28)}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.5rem, 4vw, 1.9rem)', marginBottom:6 }}>
          Career Gap Analysis
        </h2>
        <p style={{ color:'#8B7355', fontSize:'0.92rem', lineHeight:1.6 }}>
          Upload your resume → live JSearch job data is fetched for your target role &amp; market → AI scores your gap, maps required skills, and builds a personalised learning roadmap.
        </p>
      </div>

      {/* LAYOUT */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:28, alignItems:'flex-start' }}>

        {/* ─── LEFT PANEL ─── */}
        <div style={S.card}>
          <h3 style={{ fontSize:'1rem', fontWeight:700, marginBottom:20 }}>Analysis Setup</h3>

          {/* ── Upload zone ── */}
          <div style={S.mb(18)}>
            <label style={S.label}>Resume (PDF, DOCX, TXT, JPEG, PNG)</label>
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag}
              onDragOver={handleDrag}  onDrop={handleDrop}
              onClick={() => { if (!showOcrConfirm) fileInputRef.current?.click(); }}
              style={{
                border:`2px dashed ${dragActive ? '#E87C2E' : '#E8E0D4'}`,
                borderRadius:12,
                padding: showOcrConfirm ? 0 : '28px 20px',
                textAlign:'center',
                background: dragActive ? 'rgba(232,124,46,.05)' : '#FDFAF5',
                cursor: showOcrConfirm ? 'default' : 'pointer',
                transition:'all .2s', overflow:'hidden',
              }}
            >
              <input
                ref={fileInputRef} type="file"
                accept=".pdf,.docx,.txt,.rtf,.jpeg,.jpg,.png"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                style={{ display:'none' }}
              />

              {/* States */}
              {fileProcessing ? (
                <div style={{ padding:'14px 0' }}>
                  <Loader2 size={28} color="#E87C2E" style={{ margin:'0 auto 10px', animation:'spin 1s linear infinite' }} />
                  <div style={{ fontWeight:600, fontSize:'0.85rem', marginBottom:4 }}>{processingState} {fileProgress}%</div>
                  <div style={{ width:'80%', height:4, background:'#E8E0D4', margin:'8px auto 0', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:`${fileProgress}%`, height:'100%', background:'#E87C2E', transition:'width 0.25s ease-out' }} />
                  </div>
                </div>

              ) : showOcrConfirm ? (
                <div style={{ padding:16, textAlign:'left' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700, color:'#0B7D6E', fontSize:'0.84rem' }}>
                      <CheckCircle2 size={15} /> Extracted — review &amp; confirm
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      style={{ background:'none', border:'none', color:'#8B7355', fontSize:'0.72rem', cursor:'pointer', textDecoration:'underline' }}
                    >Replace file</button>
                  </div>
                  <textarea
                    style={{ ...S.input, minHeight:150, fontSize:'0.77rem', resize:'vertical', background:'#fff' }}
                    value={resumeText ?? ''} onChange={e => setResumeText(e.target.value)}
                  />
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setShowOcrConfirm(false); }}
                      style={{ ...S.btnPri, padding:'6px 16px', fontSize:'0.78rem' }}
                    >
                      <CheckCircle2 size={13} /> Confirm &amp; Use This Text
                    </button>
                  </div>
                </div>

              ) : !resumeFile ? (
                <>
                  <UploadCloud size={28} color="#8B7355" style={{ margin:'0 auto 10px' }} />
                  <div style={{ fontWeight:600, fontSize:'0.88rem', marginBottom:3 }}>Click or drag to upload</div>
                  <div style={{ fontSize:'0.73rem', color:'#8B7355' }}>PDF, DOCX, TXT, or image · max 5 MB</div>
                </>
              ) : (
                <>
                  <FileText size={28} color="#0B7D6E" style={{ margin:'0 auto 10px' }} />
                  <div style={{ fontWeight:600, fontSize:'0.88rem', color:'#0B7D6E', marginBottom:3 }}>{resumeFile.name}</div>
                  <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); setShowOcrConfirm(true); }} style={{ fontSize:'0.73rem', color:'#0B7D6E' }}>
                    View extracted text
                  </a>
                </>
              )}
            </div>
            {uploadWarning && (
              <div style={{ color:'#8B6914', fontSize:'0.79rem', marginTop:8, display:'flex', gap:5, background:'#FFFDF0', padding:'8px 10px', borderRadius:8, border:'1px solid #FFE5B4' }}>
                <AlertCircle size={13} style={{ flexShrink:0, marginTop:1 }} /><span>{uploadWarning}</span>
              </div>
            )}
          </div>

          {/* Target Role */}
          <div style={S.mb(14)}>
            <label style={S.label}>Target Role</label>
            <input style={S.input} value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Senior React Developer" />
          </div>

          {/* Market Type */}
          <div style={S.mb(14)}>
            <label style={S.label}>Target Market</label>
            <div style={{ display:'flex', gap:8, marginBottom:10 }}>
              {(['international','local'] as const).map(mt => (
                <button key={mt} onClick={() => setMarketType(mt)} style={{
                  flex:1, padding:'8px 0', border:'1.5px solid',
                  borderColor: marketType === mt ? '#E87C2E' : '#E8E0D4',
                  borderRadius:8,
                  background: marketType === mt ? 'rgba(232,124,46,.1)' : '#fff',
                  color: marketType === mt ? '#E87C2E' : '#1A1410',
                  cursor:'pointer', fontWeight:600, fontSize:'0.82rem', transition:'all .18s',
                }}>
                  {mt === 'international' ? '🌍 International' : '🇵🇰 Local (Pakistan)'}
                </button>
              ))}
            </div>
            {marketType === 'international' && (
              <select style={S.input} value={targetMarket} onChange={e => setTargetMarket(e.target.value)}>
                {INTL_MARKETS.map(m => <option key={m}>{m}</option>)}
              </select>
            )}
          </div>

          {/* Work Type */}
          <div style={S.mb(24)}>
            <label style={S.label}>Work Type</label>
            <div style={{ display:'flex', gap:8 }}>
              {(['Remote','Hybrid','Onsite'] as const).map(wt => (
                <button key={wt} onClick={() => setWorkType(wt)} style={{
                  flex:1, padding:'8px 0', border:'1.5px solid',
                  borderColor: workType === wt ? '#0B7D6E' : '#E8E0D4',
                  borderRadius:8,
                  background: workType === wt ? 'rgba(11,125,110,.1)' : '#fff',
                  color: workType === wt ? '#0B7D6E' : '#1A1410',
                  cursor:'pointer', fontWeight:600, fontSize:'0.8rem', transition:'all .18s',
                }}>{wt}</button>
              ))}
            </div>
          </div>

          <button
            onClick={analyze}
            disabled={loading}
            style={{ ...S.btnPri, width:'100%', justifyContent:'center', opacity: loading ? 0.7 : 1 }}
          >
            {loading
              ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> Analyzing…</>
              : <><Target size={16} /> Analyze Career Gap</>}
          </button>

          {error && (
            <div style={{ ...S.alertWarn, marginTop:14 }}>
              <AlertCircle size={14} style={{ flexShrink:0 }} /> {error}
            </div>
          )}

          {/* API status hint */}
          <div style={{ marginTop:16, padding:'10px 12px', background:'#F0EBE1', borderRadius:10, fontSize:'0.72rem', color:'#8B7355', lineHeight:1.5 }}>
            <strong style={{ color:'#1A1410' }}>Data sources:</strong><br/>
            ✅ Live job search is routed securely through the server<br/>
            ✅ Tutorial and course lookups use server-side provider keys<br/>
            ℹ️ Optional integrations fall back gracefully when not configured
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div>

          {/* Empty state */}
          {!result && !loading && (
            <div style={{ ...S.card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:500, textAlign:'center', border:'2px dashed #E8E0D4', background:'rgba(255,255,255,.5)' }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:'#F0EBE1', display:'flex', alignItems:'center', justifyContent:'center', color:'#E87C2E', marginBottom:18 }}>
                <BarChart2 size={34} />
              </div>
              <h3 style={{ fontSize:'1.15rem', fontWeight:700, marginBottom:8 }}>Ready to Analyze</h3>
              <p style={{ color:'#8B7355', fontSize:'0.88rem', maxWidth:340, lineHeight:1.65 }}>
                Upload your resume, pick a target role and market, then click <strong>Analyze Career Gap</strong>. We'll fetch live job listings and give you a precision skill gap report.
              </p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ ...S.card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:420, textAlign:'center' }}>
              <Loader2 size={46} style={{ animation:'spin 1s linear infinite', color:'#E87C2E', marginBottom:20 }} />
              <h3 style={{ fontSize:'1.05rem', fontWeight:700, marginBottom:8 }}>Analyzing Market…</h3>
              <p style={{ color:'#8B7355', fontSize:'0.88rem', maxWidth:340 }}>{loadingStep}</p>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

              {/* Jobs fetched banner */}
              <div style={{ padding:'10px 16px', background: jobsFound > 0 ? 'rgba(11,125,110,.08)' : 'rgba(242,201,76,.1)', borderRadius:10, border:`1px solid ${jobsFound > 0 ? 'rgba(11,125,110,.25)' : 'rgba(242,201,76,.3)'}`, fontSize:'0.82rem', color: jobsFound > 0 ? '#0B7D6E' : '#8B6914', display:'flex', alignItems:'center', gap:8 }}>
                {jobsFound > 0
                  ? <><CheckCircle2 size={14} /> <strong>{jobsFound} live jobs</strong> fetched from JSearch and analysed against your resume.</>
                  : <><AlertCircle size={14} /> No live jobs found via JSearch (key may be missing). Analysis based on AI market knowledge.</>}
                <button onClick={analyze} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'inherit', display:'flex', alignItems:'center', gap:4, fontSize:'0.78rem', fontWeight:600, opacity:0.7 }}>
                  <RefreshCw size={12} /> Re-run
                </button>
              </div>

              {/* ── GAP SCORE ── */}
              <div style={{ ...S.card, display:'flex', gap:28, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, flexShrink:0 }}>
                  <ScoreRing score={result.gapScore} size={120} />
                  <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#8B7355', textTransform:'uppercase', letterSpacing:'0.8px' }}>Gap Score</div>
                </div>

                <div style={{ flex:1, minWidth:260 }}>
                  <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.1rem', fontWeight:700, marginBottom:8 }}>
                    {result.gapScore >= 75 ? '🟢 Strong Match' : result.gapScore >= 50 ? '🟡 Moderate Gap' : '🔴 Significant Gap'}
                  </h3>
                  <p style={{ color:'#5C4B37', fontSize:'0.87rem', lineHeight:1.65, marginBottom:16 }}>{result.summary}</p>
                  
                  <button 
                    onClick={async () => {
                      if (!user || !result) {
                        requireAuth("save_analysis", () => {});
                        return;
                      }
                      setSaveStatus('saving');
                      try {
                        const cleanSummary = (text: string) => {
                          const doc = new DOMParser().parseFromString(text, 'text/html');
                          return doc.body.textContent || text;
                        };
                        await saveCareerAnalysisToFirebase(user.uid, {
                          role: targetRole,
                          targetMarket: marketType === 'local' ? 'Pakistan' : 'International',
                          score: result.gapScore,
                          summary: cleanSummary(result.summary),
                          gapsCount: result.missingSkills.length
                        });
                        setSaveStatus('saved');
                        setTimeout(() => setSaveStatus('idle'), 3000);
                      } catch (e) {
                        console.error("Save analysis failed", e);
                        setSaveStatus('idle');
                      }
                    }}
                    disabled={saveStatus !== 'idle'}
                    style={{ 
                      ...S.btnPri, 
                      marginBottom: 20,
                      background: saveStatus === 'saved' ? '#0B7D6E' : 'linear-gradient(135deg,#E87C2E,#F2C94C)',
                      minWidth: 160,
                      justifyContent: 'center'
                    }}
                  >
                    {saveStatus === 'saving' ? <Loader2 size={15} className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle2 size={15} /> : <Save size={15} />}
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved to Profile' : 'Save Analysis to Profile'}
                  </button>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:10 }}>
                    {([
                      { label:'Keyword Match',   val:result.matchBreakdown.keywordMatch,  icon:'🔑' },
                      { label:'Skills Overlap',  val:result.matchBreakdown.skillsOverlap, icon:'⚙️' },
                      { label:'Experience Fit',  val:result.matchBreakdown.experienceFit, icon:'📅' },
                      { label:'ATS Format',      val:result.matchBreakdown.atsFormat,     icon:'📋' },
                    ] as const).map(({ label, val, icon }) => (
                      <div key={label} style={{ background:'#FDFAF5', borderRadius:10, padding:'10px 14px', border:'1px solid #E8E0D4' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:'0.76rem', color:'#8B7355', fontWeight:600 }}>{icon} {label}</span>
                          <span style={{ fontSize:'0.85rem', fontWeight:700, color: val >= 70 ? '#0B7D6E' : val >= 45 ? '#E87C2E' : '#DC2626' }}>{val}%</span>
                        </div>
                        <MiniBar val={val} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── SKILL GAP TABLE ── */}
              <div style={S.card}>
                <h3 style={{ fontSize:'1rem', fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                  <Zap size={17} color="#E87C2E" /> Skill Gap Analysis
                  <span style={{ fontSize:'0.72rem', fontWeight:500, color:'#8B7355', marginLeft:4 }}>
                    (You Have vs. What {marketType === 'local' ? 'Pakistan' : targetMarket} Market Requires)
                  </span>
                </h3>
                <div style={{ overflowX:'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem', minWidth: 600 }}>
                    <thead>
                      <tr style={{ background:'#F0EBE1' }}>
                        {['You Have','Market Requires','Priority','Time to Learn','Status'].map(h => (
                          <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#1A1410', whiteSpace:'nowrap', borderBottom:'2px solid #E8E0D4' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.skillAnalysis.map((row, i) => (
                        <tr key={i} style={{ borderBottom:'1px solid #F0EBE1', background: i % 2 === 0 ? '#fff' : '#FDFAF5' }}>
                          <td style={{ padding:'10px 14px', color:'#1A1410', fontWeight:500 }}>{row.youHave || '—'}</td>
                          <td style={{ padding:'10px 14px', color:'#5C4B37', fontWeight:500 }}>{row.marketRequired}</td>
                          <td style={{ padding:'10px 14px' }}><PriorityBadge p={row.priority} /></td>
                          <td style={{ padding:'10px 14px', color:'#8B7355' }}>
                            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                              <Clock size={12} />{row.timelineToLearn}
                            </span>
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            {row.hasIt
                              ? <span style={{ color:'#0B7D6E', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><CheckCircle2 size={14} /> Have It</span>
                              : <span style={{ color:'#DC2626', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><X size={14} /> Missing</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── TOP JOB MATCHES ── */}
              {result.topJobs.length > 0 && (
                <div style={S.card}>
                  <h3 style={{ fontSize:'1rem', fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                    <Briefcase size={17} color="#0B7D6E" /> Top Job Matches from Live Market
                    <span style={S.badgeLive}>Live</span>
                  </h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {result.topJobs.map((job, i) => (
                      <div key={i} style={{ padding:'16px 18px', background:'#FDFAF5', borderRadius:14, border:'1px solid #E8E0D4' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#1A1410', marginBottom:3 }}>{job.jobTitle}</div>
                            <div style={{ fontSize:'0.8rem', color:'#8B7355', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                              <span style={{ fontWeight:600, color:'#5C4B37' }}>{job.company}</span>
                              <span>·</span>
                              <span style={{ display:'flex', alignItems:'center', gap:3 }}><MapPin size={11} />{job.location}</span>
                              {job.isRemote && <span style={{ ...S.badgeLive, fontSize:'0.65rem' }}>Remote</span>}
                              {job.employmentType && <span style={{ ...S.badgeSec, fontSize:'0.65rem' }}>{job.employmentType}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign:'center', background:'rgba(232,124,46,.1)', borderRadius:10, padding:'8px 14px', flexShrink:0 }}>
                            <div style={{ fontSize:'1.2rem', fontWeight:800, color:'#E87C2E', lineHeight:1 }}>{job.matchScore}%</div>
                            <div style={{ fontSize:'0.6rem', color:'#8B7355', fontWeight:700, marginTop:2 }}>MATCH</div>
                          </div>
                        </div>

                        {/* ATS + Skills bars */}
                        <div style={{ padding:'12px', background:'#fff', borderRadius:10, border:'1px solid #E8E0D4', marginBottom:12 }}>
                          <p style={{ fontSize:'0.82rem', color:'#5C4B37', marginBottom:12, lineHeight:1.5 }}>
                            <strong style={{ color:'#1A1410' }}>Why it’s a match:</strong> {job.whyMatch || `Matches ${job.skillMatchScore}% of your profile skills and is a good fit for your experience level.`}
                          </p>
                          <div style={{ display:'flex', gap:14, flexWrap: 'wrap' }}>
                            {[{ label:'ATS Score', val:job.atsScore }, { label:'Skills Match', val:job.skillMatchScore }, { label:'Exp. Fit', val:job.experienceFitScore || 0 }].map(({ label, val }) => (
                              <div key={label} style={{ flex:'1 1 120px' }}>
                                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', marginBottom:3 }}>
                                  <span style={{ color:'#8B7355' }}>{label}</span>
                                  <span style={{ fontWeight:700, color:'#5C4B37' }}>{val}%</span>
                                </div>
                                <div style={{ height:4, background:'#E8E0D4', borderRadius:2, overflow:'hidden' }}>
                                  <div style={{ width:`${val}%`, height:'100%', background:'#0B7D6E', borderRadius:2 }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {job.applyLink && (
                          <a href={job.applyLink} target="_blank" rel="noopener noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:'0.79rem', fontWeight:600, color:'#0B7D6E', textDecoration:'none', padding:'6px 14px', background:'rgba(11,125,110,.08)', borderRadius:8, border:'1px solid rgba(11,125,110,.2)', transition:'all .18s' }}>
                            Apply Now <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── LEARNING ROADMAP ── */}
              {result.missingSkills.length > 0 && (
                <div style={S.card}>
                  <h3 style={{ fontSize:'1rem', fontWeight:700, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
                    <BookOpen size={17} color="#E87C2E" /> Learning Roadmap — Skill Gaps
                  </h3>
                  <p style={{ color:'#8B7355', fontSize:'0.81rem', marginBottom:20 }}>
                    For each missing skill: a free YouTube tutorial, a paid course link, and the top certification to earn.
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                    {result.missingSkills.map((ms, i) => (
                      <div key={i} style={{ padding:'16px 18px', background:'#FDFAF5', borderRadius:14, border:'1px solid #E8E0D4' }}>

                        {/* Skill header */}
                        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#E87C2E,#F2C94C)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'0.88rem', flexShrink:0 }}>
                            {i + 1}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                            <span style={{ fontWeight:700, fontSize:'0.95rem', color:'#1A1410' }}>{ms.skill}</span>
                            <PriorityBadge p={ms.priority} />
                          </div>
                        </div>

                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

                          {/* YouTube — always shown */}
                          <a href={ms.youtubeUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:'rgba(255,0,0,.04)', borderRadius:10, border:'1px solid rgba(255,0,0,.14)', textDecoration:'none', transition:'background .18s' }}>
                            <Youtube size={22} color="#FF0000" style={{ flexShrink:0 }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:'0.73rem', fontWeight:700, color:'#CC0000', marginBottom:2 }}>FREE — YouTube Tutorial</div>
                              <div style={{ fontSize:'0.77rem', color:'#5C4B37', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ms.youtubeTitle}</div>
                            </div>
                            <ExternalLink size={13} color="#8B7355" style={{ flexShrink:0 }} />
                          </a>

                          {/* Paid course — always shown (fallback to Udemy search) */}
                          {ms.paidCourse && (
                            <a href={ms.paidCourse.url} target="_blank" rel="noopener noreferrer"
                              style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:'rgba(11,125,110,.05)', borderRadius:10, border:'1px solid rgba(11,125,110,.18)', textDecoration:'none', transition:'background .18s' }}>
                              <BookOpen size={20} color="#0B7D6E" style={{ flexShrink:0 }} />
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:'0.73rem', fontWeight:700, color:'#0B7D6E', marginBottom:2 }}>PAID — {ms.paidCourse.platform}</div>
                                <div style={{ fontSize:'0.77rem', color:'#5C4B37', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ms.paidCourse.title}</div>
                              </div>
                              <ExternalLink size={13} color="#8B7355" style={{ flexShrink:0 }} />
                            </a>
                          )}

                          {/* Certificate — CLICKABLE link to Google search */}
                          {ms.certificate && (
                            <a href={ms.certificate.url} target="_blank" rel="noopener noreferrer"
                              style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:'rgba(242,201,76,.08)', borderRadius:10, border:'1px solid rgba(242,201,76,.32)', textDecoration:'none', transition:'background .18s' }}>
                              <Award size={20} color="#CA8A04" style={{ flexShrink:0 }} />
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:'0.73rem', fontWeight:700, color:'#CA8A04', marginBottom:2 }}>CERTIFICATION — Search & Enroll</div>
                                <div style={{ fontSize:'0.77rem', color:'#5C4B37', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ms.certificate.name}</div>
                              </div>
                              <ExternalLink size={13} color="#8B7355" style={{ flexShrink:0 }} />
                            </a>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}