import React, { useState } from 'react';
import { callOpenAI } from '../../App';
import { INTEL, S } from '../../App';
import {
  Loader2, AlertCircle, CheckCircle2,
  Copy, Check, TrendingUp, MessageSquare,
  DollarSign, Shield, ChevronDown, ChevronUp, Save
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveSalaryCheck, saveNegotiationToFirebase } from '../../lib/firebase';
import { saveNegotiation } from '../../userProfile';
import { auth } from '../../lib/firebase';
import { fetchSalaryFromSERP, SerpSalaryData } from '../../lib/serpAPI';

// ── Types ──
interface NegotiationResult {
  verdict: 'lowball' | 'fair' | 'above';
  verdictLabel: string;
  gapPercent: number;
  recommendedRate: string;
  floorRate: string;
  openingScript: string;
  rebuttals: Array<{ objection: string; response: string }>;
  psychologyTips: string[];
  walkAwaySignals: string[];
}

const PLATFORMS = ['Upwork', 'Fiverr', 'LinkedIn', 'Direct Client', 'Local (Pakistan)'];
const CURRENCIES = ['USD/hr', 'GBP/hr', 'PKR/month', 'PKR/project'];
const EXPERIENCE_LEVELS = ['1–2 years', '3–5 years', '6–9 years', '10+ years'];

// Market rate reference table baked in (from INTEL + known ranges)
const MARKET_RATES: Record<string, Record<string, { intlMin: number; intlAvg: number; localMin: number; localAvg: number }>> = {
  // --- Engineering ---
  'Frontend Developer': {
    '1–2 years':  { intlMin: 18, intlAvg: 32, localMin: 70000,  localAvg: 120000 },
    '3–5 years':  { intlMin: 30, intlAvg: 55, localMin: 120000, localAvg: 220000 },
    '6–9 years':  { intlMin: 50, intlAvg: 80, localMin: 200000, localAvg: 350000 },
    '10+ years':  { intlMin: 75, intlAvg: 110, localMin: 300000, localAvg: 500000 },
  },
  'Backend Developer': {
    '1–2 years':  { intlMin: 20, intlAvg: 35, localMin: 80000,  localAvg: 130000 },
    '3–5 years':  { intlMin: 35, intlAvg: 60, localMin: 130000, localAvg: 250000 },
    '6–9 years':  { intlMin: 55, intlAvg: 85, localMin: 230000, localAvg: 400000 },
    '10+ years':  { intlMin: 80, intlAvg: 120, localMin: 350000, localAvg: 600000 },
  },
  'Full Stack Developer': {
    '1–2 years':  { intlMin: 20, intlAvg: 38, localMin: 80000,  localAvg: 140000 },
    '3–5 years':  { intlMin: 35, intlAvg: 65, localMin: 140000, localAvg: 260000 },
    '6–9 years':  { intlMin: 55, intlAvg: 90, localMin: 220000, localAvg: 400000 },
    '10+ years':  { intlMin: 80, intlAvg: 120, localMin: 350000, localAvg: 600000 },
  },
  'DevOps Engineer': {
    '1–2 years':  { intlMin: 25, intlAvg: 45, localMin: 100000, localAvg: 180000 },
    '3–5 years':  { intlMin: 45, intlAvg: 75, localMin: 180000, localAvg: 320000 },
    '6–9 years':  { intlMin: 70, intlAvg: 100, localMin: 300000, localAvg: 500000 },
    '10+ years':  { intlMin: 95, intlAvg: 140, localMin: 450000, localAvg: 750000 },
  },
  'Cloud Engineer': {
    '1–2 years':  { intlMin: 25, intlAvg: 45, localMin: 100000, localAvg: 180000 },
    '3–5 years':  { intlMin: 45, intlAvg: 75, localMin: 180000, localAvg: 320000 },
    '6–9 years':  { intlMin: 70, intlAvg: 100, localMin: 300000, localAvg: 500000 },
    '10+ years':  { intlMin: 95, intlAvg: 140, localMin: 450000, localAvg: 750000 },
  },
  'Mobile Developer': {
    '1–2 years':  { intlMin: 20, intlAvg: 35, localMin: 75000,  localAvg: 130000 },
    '3–5 years':  { intlMin: 35, intlAvg: 60, localMin: 130000, localAvg: 240000 },
    '6–9 years':  { intlMin: 55, intlAvg: 85, localMin: 210000, localAvg: 380000 },
    '10+ years':  { intlMin: 80, intlAvg: 115, localMin: 320000, localAvg: 550000 },
  },
  'QA Engineer': {
    '1–2 years':  { intlMin: 15, intlAvg: 25, localMin: 50000,  localAvg: 90000 },
    '3–5 years':  { intlMin: 25, intlAvg: 45, localMin: 90000,  localAvg: 160000 },
    '6–9 years':  { intlMin: 40, intlAvg: 65, localMin: 150000, localAvg: 280000 },
    '10+ years':  { intlMin: 60, intlAvg: 85, localMin: 250000, localAvg: 400000 },
  },
  'Database Administrator': {
    '1–2 years':  { intlMin: 20, intlAvg: 30, localMin: 70000,  localAvg: 120000 },
    '3–5 years':  { intlMin: 30, intlAvg: 55, localMin: 120000, localAvg: 220000 },
    '6–9 years':  { intlMin: 50, intlAvg: 80, localMin: 200000, localAvg: 350000 },
    '10+ years':  { intlMin: 75, intlAvg: 110, localMin: 320000, localAvg: 500000 },
  },
  'Blockchain Developer': {
    '1–2 years':  { intlMin: 30, intlAvg: 55, localMin: 120000, localAvg: 220000 },
    '3–5 years':  { intlMin: 55, intlAvg: 90, localMin: 220000, localAvg: 400000 },
    '6–9 years':  { intlMin: 85, intlAvg: 130, localMin: 380000, localAvg: 650000 },
    '10+ years':  { intlMin: 120, intlAvg: 180, localMin: 600000, localAvg: 950000 },
  },
  
  // --- AI/ML ---
  'Machine Learning Engineer': {
    '1–2 years':  { intlMin: 30, intlAvg: 55, localMin: 120000, localAvg: 220000 },
    '3–5 years':  { intlMin: 55, intlAvg: 90, localMin: 220000, localAvg: 400000 },
    '6–9 years':  { intlMin: 85, intlAvg: 130, localMin: 380000, localAvg: 650000 },
    '10+ years':  { intlMin: 120, intlAvg: 180, localMin: 600000, localAvg: 950000 },
  },
  'Data Scientist': {
    '1–2 years':  { intlMin: 25, intlAvg: 45, localMin: 100000, localAvg: 180000 },
    '3–5 years':  { intlMin: 45, intlAvg: 75, localMin: 180000, localAvg: 320000 },
    '6–9 years':  { intlMin: 70, intlAvg: 100, localMin: 300000, localAvg: 500000 },
    '10+ years':  { intlMin: 95, intlAvg: 140, localMin: 450000, localAvg: 750000 },
  },
  'Data Analyst': {
    '1–2 years':  { intlMin: 15, intlAvg: 25, localMin: 60000,  localAvg: 100000 },
    '3–5 years':  { intlMin: 25, intlAvg: 45, localMin: 100000, localAvg: 180000 },
    '6–9 years':  { intlMin: 45, intlAvg: 70, localMin: 180000, localAvg: 300000 },
    '10+ years':  { intlMin: 65, intlAvg: 95, localMin: 280000, localAvg: 450000 },
  },
  'AI Automation Specialist': {
    '1–2 years':  { intlMin: 25, intlAvg: 45, localMin: 90000,  localAvg: 160000 },
    '3–5 years':  { intlMin: 45, intlAvg: 75, localMin: 160000, localAvg: 300000 },
    '6–9 years':  { intlMin: 70, intlAvg: 100, localMin: 280000, localAvg: 480000 },
    '10+ years':  { intlMin: 95, intlAvg: 140, localMin: 450000, localAvg: 700000 },
  },
  'NLP Engineer': {
    '1–2 years':  { intlMin: 30, intlAvg: 50, localMin: 110000, localAvg: 200000 },
    '3–5 years':  { intlMin: 50, intlAvg: 85, localMin: 200000, localAvg: 380000 },
    '6–9 years':  { intlMin: 80, intlAvg: 120, localMin: 350000, localAvg: 600000 },
    '10+ years':  { intlMin: 110, intlAvg: 160, localMin: 550000, localAvg: 850000 },
  },

  // --- Design ---
  'Product Designer': {
    '1–2 years':  { intlMin: 20, intlAvg: 35, localMin: 80000,  localAvg: 140000 },
    '3–5 years':  { intlMin: 35, intlAvg: 60, localMin: 140000, localAvg: 250000 },
    '6–9 years':  { intlMin: 55, intlAvg: 90, localMin: 240000, localAvg: 400000 },
    '10+ years':  { intlMin: 85, intlAvg: 130, localMin: 380000, localAvg: 600000 },
  },
  'Graphic Designer': {
    '1–2 years':  { intlMin: 10, intlAvg: 20, localMin: 40000,  localAvg: 70000 },
    '3–5 years':  { intlMin: 20, intlAvg: 35, localMin: 70000,  localAvg: 130000 },
    '6–9 years':  { intlMin: 35, intlAvg: 55, localMin: 120000, localAvg: 220000 },
    '10+ years':  { intlMin: 50, intlAvg: 75, localMin: 200000, localAvg: 350000 },
  },
  'Motion Designer': {
    '1–2 years':  { intlMin: 15, intlAvg: 25, localMin: 60000,  localAvg: 100000 },
    '3–5 years':  { intlMin: 25, intlAvg: 45, localMin: 100000, localAvg: 180000 },
    '6–9 years':  { intlMin: 45, intlAvg: 70, localMin: 170000, localAvg: 300000 },
    '10+ years':  { intlMin: 65, intlAvg: 95, localMin: 280000, localAvg: 450000 },
  },
  'UI/UX Designer': {
    '1–2 years':  { intlMin: 15, intlAvg: 28, localMin: 60000,  localAvg: 100000 },
    '3–5 years':  { intlMin: 28, intlAvg: 50, localMin: 100000, localAvg: 180000 },
    '6–9 years':  { intlMin: 45, intlAvg: 75, localMin: 170000, localAvg: 300000 },
    '10+ years':  { intlMin: 65, intlAvg: 100, localMin: 260000, localAvg: 450000 },
  },

  // --- Product & Strategy ---
  'Product Manager': {
    '1–2 years':  { intlMin: 25, intlAvg: 40, localMin: 90000,  localAvg: 160000 },
    '3–5 years':  { intlMin: 40, intlAvg: 70, localMin: 160000, localAvg: 300000 },
    '6–9 years':  { intlMin: 65, intlAvg: 100, localMin: 280000, localAvg: 500000 },
    '10+ years':  { intlMin: 95, intlAvg: 140, localMin: 450000, localAvg: 750000 },
  },
  'Project Manager': {
    '1–2 years':  { intlMin: 18, intlAvg: 30, localMin: 70000,  localAvg: 120000 },
    '3–5 years':  { intlMin: 30, intlAvg: 55, localMin: 120000, localAvg: 220000 },
    '6–9 years':  { intlMin: 50, intlAvg: 80, localMin: 200000, localAvg: 350000 },
    '10+ years':  { intlMin: 75, intlAvg: 110, localMin: 320000, localAvg: 550000 },
  },
  'Business Analyst': {
    '1–2 years':  { intlMin: 15, intlAvg: 28, localMin: 60000,  localAvg: 110000 },
    '3–5 years':  { intlMin: 28, intlAvg: 50, localMin: 110000, localAvg: 200000 },
    '6–9 years':  { intlMin: 45, intlAvg: 75, localMin: 180000, localAvg: 320000 },
    '10+ years':  { intlMin: 65, intlAvg: 100, localMin: 300000, localAvg: 500000 },
  },
  'Growth Strategist': {
    '1–2 years':  { intlMin: 20, intlAvg: 35, localMin: 80000,  localAvg: 140000 },
    '3–5 years':  { intlMin: 35, intlAvg: 60, localMin: 140000, localAvg: 260000 },
    '6–9 years':  { intlMin: 55, intlAvg: 90, localMin: 250000, localAvg: 420000 },
    '10+ years':  { intlMin: 85, intlAvg: 130, localMin: 400000, localAvg: 650000 },
  },

  // --- Content & Marketing ---
  'Content Writer': {
    '1–2 years':  { intlMin: 10, intlAvg: 18, localMin: 35000,  localAvg: 60000 },
    '3–5 years':  { intlMin: 18, intlAvg: 32, localMin: 60000,  localAvg: 110000 },
    '6–9 years':  { intlMin: 30, intlAvg: 50, localMin: 100000, localAvg: 180000 },
    '10+ years':  { intlMin: 45, intlAvg: 70, localMin: 160000, localAvg: 280000 },
  },
  'Digital Marketer': {
    '1–2 years':  { intlMin: 12, intlAvg: 22, localMin: 45000,  localAvg: 80000 },
    '3–5 years':  { intlMin: 22, intlAvg: 40, localMin: 80000,  localAvg: 150000 },
    '6–9 years':  { intlMin: 38, intlAvg: 65, localMin: 140000, localAvg: 250000 },
    '10+ years':  { intlMin: 60, intlAvg: 90, localMin: 240000, localAvg: 400000 },
  },
  'SEO Specialist': {
    '1–2 years':  { intlMin: 12, intlAvg: 22, localMin: 45000,  localAvg: 80000 },
    '3–5 years':  { intlMin: 22, intlAvg: 40, localMin: 80000,  localAvg: 150000 },
    '6–9 years':  { intlMin: 38, intlAvg: 65, localMin: 140000, localAvg: 250000 },
    '10+ years':  { intlMin: 60, intlAvg: 90, localMin: 240000, localAvg: 400000 },
  },
  'Social Media Manager': {
    '1–2 years':  { intlMin: 10, intlAvg: 18, localMin: 35000,  localAvg: 65000 },
    '3–5 years':  { intlMin: 18, intlAvg: 30, localMin: 65000,  localAvg: 120000 },
    '6–9 years':  { intlMin: 30, intlAvg: 50, localMin: 110000, localAvg: 200000 },
    '10+ years':  { intlMin: 45, intlAvg: 70, localMin: 180000, localAvg: 320000 },
  },

  // --- Other ---
  'Virtual Assistant': {
    '1–2 years':  { intlMin: 5,  intlAvg: 12, localMin: 30000,  localAvg: 50000 },
    '3–5 years':  { intlMin: 10, intlAvg: 18, localMin: 50000,  localAvg: 90000 },
    '6–9 years':  { intlMin: 16, intlAvg: 28, localMin: 80000,  localAvg: 140000 },
    '10+ years':  { intlMin: 25, intlAvg: 40, localMin: 120000, localAvg: 220000 },
  },
  'Customer Support Specialist': {
    '1–2 years':  { intlMin: 6,  intlAvg: 12, localMin: 35000,  localAvg: 60000 },
    '3–5 years':  { intlMin: 10, intlAvg: 18, localMin: 60000,  localAvg: 100000 },
    '6–9 years':  { intlMin: 16, intlAvg: 28, localMin: 90000,  localAvg: 150000 },
    '10+ years':  { intlMin: 25, intlAvg: 40, localMin: 140000, localAvg: 240000 },
  },
  'E-commerce Manager': {
    '1–2 years':  { intlMin: 12, intlAvg: 25, localMin: 60000,  localAvg: 100000 },
    '3–5 years':  { intlMin: 22, intlAvg: 45, localMin: 100000, localAvg: 180000 },
    '6–9 years':  { intlMin: 40, intlAvg: 70, localMin: 170000, localAvg: 300000 },
    '10+ years':  { intlMin: 60, intlAvg: 95, localMin: 280000, localAvg: 450000 },
  },
  'Video Editor': {
    '1–2 years':  { intlMin: 15, intlAvg: 25, localMin: 50000,  localAvg: 90000 },
    '3–5 years':  { intlMin: 25, intlAvg: 45, localMin: 90000,  localAvg: 160000 },
    '6–9 years':  { intlMin: 42, intlAvg: 65, localMin: 150000, localAvg: 280000 },
    '10+ years':  { intlMin: 60, intlAvg: 90, localMin: 250000, localAvg: 420000 },
  },
  'Copywriter': {
    '1–2 years':  { intlMin: 12, intlAvg: 22, localMin: 45000,  localAvg: 80000 },
    '3–5 years':  { intlMin: 22, intlAvg: 45, localMin: 80000,  localAvg: 150000 },
    '6–9 years':  { intlMin: 42, intlAvg: 70, localMin: 140000, localAvg: 260000 },
    '10+ years':  { intlMin: 65, intlAvg: 100, localMin: 250000, localAvg: 450000 },
  },
};

export const SalaryCoach = () => {
  const { user, requireAuth } = useAuth();
  const [form, setForm] = useState({
    role: 'Frontend Developer',
    customRole: '',
    experience: '3–5 years',
    platform: 'Upwork',
    offeredRate: '',
    currency: 'USD/hr',
    clientLocation: 'United States',
    context: '', // optional: "client said budget is tight" etc.
  });
  const [loading, setLoading] = useState(false);
  const [serpLoading, setSerpLoading] = useState(false);
  const [serpData, setSerpData] = useState<SerpSalaryData | null>(null);
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openRebuttal, setOpenRebuttal] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const analyse = async () => {
    if (!form.offeredRate) { setError('Please enter the rate the client offered.'); return; }
    if (form.role === 'OTHER' && !form.customRole) { setError('Please specify your role.'); return; }
    setError(null);
    setLoading(true);
    setResult(null);

    const roleToUse = form.role === 'OTHER' ? form.customRole : form.role;
    const isLocal = form.currency.includes('PKR');
    const offered = parseFloat(form.offeredRate);

    // Prioritize serpData if available, otherwise fallback to curated MARKET_RATES
    let rates: { intlMin: number, intlAvg: number, localMin: number, localAvg: number } | undefined = undefined;
    if (serpData) {
      rates = {
        intlMin: serpData.intlMin,
        intlAvg: serpData.intlAvg,
        localMin: serpData.localMin,
        localAvg: serpData.localAvg
      };
    } else {
      rates = MARKET_RATES[roleToUse]?.[form.experience];
    }

    const marketContext = rates
      ? isLocal
        ? `Market data for ${roleToUse} (${form.experience}) in Pakistan: minimum fair rate is PKR ${rates.localMin.toLocaleString()}/month, average is PKR ${rates.localAvg.toLocaleString()}/month.`
        : `Market data for ${roleToUse} (${form.experience}) targeting ${form.clientLocation}: minimum fair rate is $${rates.intlMin}/hr, average is $${rates.intlAvg}/hr.`
      : `No specific market data available — use general Pakistan freelancer market knowledge.`;

    const systemPrompt = `You are a Pakistani freelancer salary negotiation coach. Your job is to help Pakistani freelancers (who chronically underprice themselves) stand firm, negotiate confidently, and get paid what they are worth.

${marketContext}

You have deep knowledge of:
- Pakistani freelancer market on Upwork, Fiverr, LinkedIn, and local clients
- The psychology of client lowballing tactics
- How to frame value without sounding desperate
- Cultural context: Pakistani freelancers often feel they must accept low offers due to currency parity pressures — your job is to counter this mindset with data and confidence

ALWAYS respond in JSON with this exact schema:
{
  "verdict": "lowball" | "fair" | "above",
  "verdictLabel": "string (e.g. 'This is a serious lowball — 40% below market')",
  "gapPercent": number (negative = below market, positive = above),
  "recommendedRate": "string (e.g. '$45/hr' or 'PKR 220,000/month')",
  "floorRate": "string (absolute minimum they should accept)",
  "openingScript": "string (2–3 paragraph word-for-word reply the freelancer should send RIGHT NOW — confident, professional, backed by value not desperation)",
  "rebuttals": [
    { "objection": "client pushback phrase", "response": "exact words to say back" }
  ] (4–5 common objections for this specific situation),
  "psychologyTips": ["string"] (3–4 mindset tips specific to this negotiation),
  "walkAwaySignals": ["string"] (3 signals that mean this client is not worth pursuing)
}

Respond ONLY with valid JSON. No markdown, no preamble.`;

    const userPrompt = `Freelancer profile:
- Role: ${roleToUse}
- Experience: ${form.experience}
- Platform: ${form.platform}
- Client location: ${form.clientLocation}
- Currency: ${form.currency}

The client offered: ${form.offeredRate} ${form.currency}
${form.context ? `Additional context from the freelancer: "${form.context}"` : ''}

Analyse this offer against market rates. Generate a negotiation strategy.`;

    try {
      const raw = await callOpenAI(`${systemPrompt}\n\n${userPrompt}`);
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed: NegotiationResult = JSON.parse(clean);
      setResult(parsed);

      const currentUser = auth.currentUser;
      if (currentUser) {
        saveSalaryCheck(currentUser.uid, {
          role: form.role,
          experience: form.experience,
          offeredRate: form.offeredRate,
          currency: form.currency,
          verdict: parsed.verdict
        }).catch(err => console.error("Failed to save salary check:", err));
      }
    } catch (e) {
      setError('Failed to generate negotiation strategy. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeSalary = () => {
    requireAuth("salary", () => {
      analyse();
    });
  };

  const copyScript = () => {
    if (result) {
      navigator.clipboard.writeText(result.openingScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveStrategy = async () => {
    if (!result || !user) return;
    setSaveStatus('saving');
    
    const roleToUse = form.role === 'OTHER' ? form.customRole : form.role;
    
    const cleanText = (html: string) => {
      try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || html;
      } catch {
        return html;
      }
    };

    const data = {
      role: roleToUse,
      experience: form.experience,
      platform: form.platform,
      offeredRate: form.offeredRate,
      currency: form.currency,
      recommendedRate: result.recommendedRate,
      verdict: result.verdict,
      openingScript: cleanText(result.openingScript),
    };

    try {
      // Save to Firebase
      await saveNegotiationToFirebase(user.uid, data);
      
      // Also save to LocalStorage for offline/redundancy
      saveNegotiation(data);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error("Failed to save strategy:", e);
      setError("Failed to save strategy to your profile.");
      setSaveStatus('idle');
    }
  };

  const verdictColor = result
    ? result.verdict === 'lowball' ? '#DC2626'
    : result.verdict === 'above' ? '#0B7D6E'
    : '#E87C2E'
    : '#E87C2E';

  const verdictBg = result
    ? result.verdict === 'lowball' ? 'rgba(220,38,38,.08)'
    : result.verdict === 'above' ? 'rgba(11,125,110,.08)'
    : 'rgba(232,124,46,.08)'
    : '';

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={S.mb(28)}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.5rem, 4vw, 1.9rem)', marginBottom: 6 }}>
          Salary Negotiation Coach
        </h2>
        <p style={{ color: '#8B7355' }}>
          Paste what the client offered → get a word-for-word negotiation script backed by real market data. Built for Pakistani freelancers who deserve to stop underpricing themselves.
        </p>
      </div>

      <div style={S.grid2}>
        {/* ── LEFT: FORM ── */}
        <div style={S.card}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 18 }}>The Situation</h3>

          <div style={S.mb(13)}>
            <label style={S.label}>Your Role</label>
            <select
              style={S.input}
              value={form.role}
              onChange={e => {
                setForm(p => ({ ...p, role: e.target.value, customRole: '' }));
                setSerpData(null);
              }}
            >
              <optgroup label="Engineering">
                <option>Frontend Developer</option>
                <option>Backend Developer</option>
                <option>Full Stack Developer</option>
                <option>DevOps Engineer</option>
                <option>Cloud Engineer</option>
                <option>Mobile Developer</option>
                <option>QA Engineer</option>
                <option>Database Administrator</option>
                <option>Blockchain Developer</option>
              </optgroup>
              
              <optgroup label="AI/ML">
                <option>Machine Learning Engineer</option>
                <option>Data Scientist</option>
                <option>Data Analyst</option>
                <option>AI Automation Specialist</option>
                <option>NLP Engineer</option>
              </optgroup>
              
              <optgroup label="Design">
                <option>Product Designer</option>
                <option>Graphic Designer</option>
                <option>Motion Designer</option>
                <option>UI/UX Designer</option>
              </optgroup>
              
              <optgroup label="Product & Strategy">
                <option>Product Manager</option>
                <option>Project Manager</option>
                <option>Business Analyst</option>
                <option>Growth Strategist</option>
              </optgroup>
              
              <optgroup label="Content & Marketing">
                <option>Content Writer</option>
                <option>Digital Marketer</option>
                <option>SEO Specialist</option>
                <option>Social Media Manager</option>
              </optgroup>
              
              <optgroup label="Other">
                <option>Virtual Assistant</option>
                <option>Customer Support Specialist</option>
                <option>E-commerce Manager</option>
                <option>Video Editor</option>
                <option>Copywriter</option>
              </optgroup>
              
              <option value="OTHER">Other (specify below)</option>
            </select>
          </div>

          {form.role === 'OTHER' && (
            <div style={S.mb(13)}>
              <label style={S.label}>What's your role?</label>
              <input
                style={S.input}
                type="text"
                placeholder="e.g. 'Web3 Developer', 'AI Prompt Engineer', 'Shopify Developer'"
                value={form.customRole}
                onChange={e => setForm(p => ({ ...p, customRole: e.target.value }))}
              />
              
              {form.customRole && (
                <button
                  onClick={async () => {
                    setSerpLoading(true);
                    setError(null);
                    try {
                      const data = await fetchSalaryFromSERP(
                        form.customRole,
                        form.experience,
                        form.clientLocation
                      );
                      setSerpData(data);
                    } catch (err: any) {
                      console.error("SERP Error encountered:", err);
                      const msg: string = err?.message || 'Unknown error occurred.';
                      if (
                        msg.toLowerCase().includes('missing api key') ||
                        msg.toLowerCase().includes('invalid api key') ||
                        msg.toLowerCase().includes('vite_serpapi_key')
                      ) {
                        setError('Salary data service is unavailable. Please try again later.');
                      } else if (msg.toLowerCase().includes('no valid salary')) {
                        setError('Market data found but no salary figures could be parsed. Try a different role name.');
                      } else if (msg.toLowerCase().includes('no search results')) {
                        setError('No search results returned for this role. Try a broader role name.');
                      } else if (msg.toLowerCase().includes('all proxies failed')) {
                        setError('Network error: could not reach SerpAPI. Check your connection and try again.');
                      } else {
                        setError(`Could not fetch market data: ${msg}`);
                      }
                    } finally {
                      setSerpLoading(false);
                    }
                  }}
                  disabled={serpLoading}
                  style={{ ...S.btnGhost, marginTop: 8, padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  {serpLoading ? 'Fetching market data...' : 'Get Market Data'}
                </button>
              )}
            </div>
          )}

          <div style={S.mb(13)}>
            <label style={S.label}>Years of Experience</label>
            <select style={S.input} value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))}>
              {EXPERIENCE_LEVELS.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 13 }}>
            <div>
              <label style={S.label}>Client's Offer</label>
              <input
                style={S.input}
                type="number"
                placeholder="e.g. 15"
                value={form.offeredRate}
                onChange={e => setForm(p => ({ ...p, offeredRate: e.target.value }))}
              />
            </div>
            <div>
              <label style={S.label}>Currency</label>
              <select style={S.input} value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={S.mb(13)}>
            <label style={S.label}>Platform</label>
            <select style={S.input} value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div style={S.mb(13)}>
            <label style={S.label}>Client Location</label>
            <select style={S.input} value={form.clientLocation} onChange={e => setForm(p => ({ ...p, clientLocation: e.target.value }))}>
              {['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'UAE', 'Pakistan'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={S.mb(20)}>
            <label style={S.label}>Extra Context <span style={{ fontWeight: 400, color: '#8B7355' }}>(optional)</span></label>
            <textarea
              style={{ ...S.input, minHeight: 70, resize: 'vertical' }}
              placeholder={`e.g. "Client said their budget is fixed", "They want 40 hrs/week", "It's a long-term contract"`}
              value={form.context}
              onChange={e => setForm(p => ({ ...p, context: e.target.value }))}
            />
          </div>

          {error && <div style={{ ...S.alertWarn, marginBottom: 14 }}><AlertCircle size={14} />{error}</div>}

          <button onClick={handleAnalyzeSalary} disabled={loading} style={S.btnPri}>
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analysing offer…</>
              : <><TrendingUp size={16} /> Generate Negotiation Strategy</>}
          </button>
        </div>

        {/* ── RIGHT: Quick market reference ── */}
        <div>
          <div style={{ ...S.card, borderTop: '4px solid #E87C2E', marginBottom: 16 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14 }}>
              📊 Market Reference — {form.role === 'OTHER' ? form.customRole || 'Custom Role' : form.role}
            </h4>
            
            {/* Show SERP data if available */}
            {serpData && (
              <div style={{ padding: '12px', background: 'rgba(11,125,110,.08)', borderRadius: 10, marginBottom: 14, border: '1px solid rgba(11,125,110,.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#0B7D6E', fontWeight: 700, marginBottom: 8 }}>
                  📡 LIVE FROM GOOGLE SEARCH
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#8B7355' }}>International (Avg)</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B7D6E' }}>
                      ${serpData.intlMin}–${serpData.intlAvg}/hr
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#8B7355' }}>Pakistan (Avg)</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8B6914' }}>
                      PKR {(serpData.localAvg / 1000).toFixed(0)}k/mo
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#8B7355', marginTop: 8 }}>
                  Based on {serpData.dataPoints}+ listings • Updated {new Date(serpData.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            )}
            
            {/* Show curated data */}
            {MARKET_RATES[form.role === 'OTHER' ? '' : form.role] ? (
              Object.entries(MARKET_RATES[form.role]).map(([exp, rates]) => (
                <div key={exp} style={{
                  padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                  background: exp === form.experience ? 'rgba(232,124,46,.08)' : '#FDFAF5',
                  border: `1px solid ${exp === form.experience ? 'rgba(232,124,46,.3)' : '#E8E0D4'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: exp === form.experience ? 700 : 500, color: exp === form.experience ? '#E87C2E' : '#1A1410' }}>
                      {exp} {exp === form.experience && '← you'}
                    </span>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.62rem', color: '#8B7355' }}>Intl min → avg</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0B7D6E' }}>${rates.intlMin}–${rates.intlAvg}/hr</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.62rem', color: '#8B7355' }}>Local avg</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8B6914' }}>{(rates.localAvg / 1000).toFixed(0)}k PKR</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: '#8B7355', fontSize: '0.84rem' }}>
                {serpData ? 'Using live market data above.' : 'Market data not available — AI will use general knowledge.'}
              </div>
            )}
          </div>

          <div style={{ ...S.alertWarn }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Pakistani freelancers on average price themselves <strong>35–45% below</strong> market rate for equivalent skills. This tool uses actual Upwork/Fiverr market data to show you what you're leaving on the table.</span>
          </div>
        </div>
      </div>

      {/* ── RESULTS ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#E87C2E', margin: '0 auto 16px', display: 'block' }} />
          <div style={{ fontWeight: 600 }}>Analysing the offer against market data…</div>
          <div style={{ color: '#8B7355', fontSize: '0.85rem', marginTop: 6 }}>Building your negotiation script</div>
        </div>
      )}

      {result && !loading && (
        <div style={{ marginTop: 32 }}>
          {/* Verdict banner */}
          <div style={{ padding: '20px 24px', borderRadius: 16, background: verdictBg, border: `2px solid ${verdictColor}`, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: verdictColor }}>{result.verdictLabel}</div>
              <div style={{ fontSize: '0.83rem', color: '#5C4B37', marginTop: 4 }}>
                Gap: <strong>{Math.abs(result.gapPercent)}% {result.gapPercent < 0 ? 'below' : 'above'} market</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#8B7355', textTransform: 'uppercase', fontWeight: 700 }}>Ask for</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B7D6E' }}>{result.recommendedRate}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#8B7355', textTransform: 'uppercase', fontWeight: 700 }}>Floor (min)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#E87C2E' }}>{result.floorRate}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
                <button 
                  onClick={() => requireAuth("save_negotiation", handleSaveStrategy)}
                  disabled={saveStatus !== 'idle'}
                  style={{ 
                    ...S.btnPri, 
                    padding: '8px 16px', 
                    fontSize: '0.8rem', 
                    background: saveStatus === 'saved' ? '#0B7D6E' : 'linear-gradient(135deg,#E87C2E,#F2C94C)',
                    minWidth: 120
                  }}
                >
                  {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle2 size={14} /> : <Save size={14} />}
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Strategy'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* Script */}
            <div style={{ gridColumn: '1 / -1', ...S.card, borderLeft: '4px solid #0B7D6E' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={16} color="#0B7D6E" />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Your Opening Reply — Send This Now</h4>
                </div>
                <button onClick={copyScript} style={{ background: 'transparent', border: '1px solid #E8E0D4', borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#8B7355' }}>
                  {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <div style={{ background: '#FDFAF5', borderRadius: 10, padding: 20, border: '1px solid #E8E0D4', fontSize: '0.88rem', lineHeight: 1.8, color: '#1A1410', whiteSpace: 'pre-wrap' }}>
                {result.openingScript}
              </div>
            </div>

            {/* Rebuttals */}
            <div style={{ gridColumn: '1 / -1', ...S.card }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Shield size={16} color="#E87C2E" />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>When They Push Back — Your Rebuttals</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.rebuttals.map((r, i) => (
                  <div key={i} style={{ borderRadius: 10, border: '1px solid #E8E0D4', overflow: 'hidden' }}>
                    <button
                      onClick={() => setOpenRebuttal(openRebuttal === i ? null : i)}
                      style={{ width: '100%', padding: '12px 16px', background: openRebuttal === i ? 'rgba(232,124,46,.06)' : '#FDFAF5', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#DC2626' }}>"{r.objection}"</span>
                      {openRebuttal === i ? <ChevronUp size={15} color="#8B7355" /> : <ChevronDown size={15} color="#8B7355" />}
                    </button>
                    {openRebuttal === i && (
                      <div style={{ padding: '12px 16px', background: '#fff', fontSize: '0.85rem', color: '#1A1410', lineHeight: 1.7, borderTop: '1px solid #E8E0D4' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0B7D6E', marginBottom: 6, textTransform: 'uppercase' }}>Your response:</div>
                        {r.response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Psychology tips */}
            <div style={S.card}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14 }}>🧠 Mindset for This Negotiation</h4>
              <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.psychologyTips.map((tip, i) => (
                  <li key={i} style={{ fontSize: '0.83rem', color: '#5C4B37', lineHeight: 1.6 }}>{tip}</li>
                ))}
              </ol>
            </div>

            {/* Walk away signals */}
            <div style={{ ...S.card, borderTop: '4px solid #DC2626' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14 }}>🚩 Walk Away If They Say This</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.walkAwaySignals.map((sig, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: 'rgba(220,38,38,.05)', borderRadius: 8, border: '1px solid rgba(220,38,38,.15)', fontSize: '0.83rem', color: '#5C4B37', lineHeight: 1.55 }}>
                    {sig}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};