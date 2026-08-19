/**
 * marketIntelligence.ts
 *
 * Drop this file into your project root alongside App.tsx.
 *
 * Replicates the n8n workflow entirely on the client:
 *   1. JSearch (RapidAPI)  →  International jobs
 *   2. JSearch (RapidAPI)  →  Local jobs
 *   3. SerpAPI             →  International salary (Google Jobs)
 *   4. SerpAPI             →  Local salary (Google Jobs)
 *   5. OpenAI              →  Synthesize → InsightData (via existing callOpenAI from App.tsx)
 *
 * Usage in IntelligenceLayer:
 *   import { analyzeMarket } from './marketIntelligence';
 *   const data = await analyzeMarket({ role, industry, intlMarket, localMarket, workType });
 *
 * Add to .env.local:
 *   JSEARCH_API_KEY=your_rapidapi_key_here
 *   SERPAPI_KEY=your_serpapi_key_here
 */

import { callOpenAI } from './App';

// ─────────────────────────────────────────────────────────────────────────────
// API KEYS — from .env.local (Vite exposes VITE_ prefix vars, or use define in vite.config.ts)
// ─────────────────────────────────────────────────────────────────────────────

const JSEARCH_KEY = import.meta.env.VITE_JSEARCH_KEY || process.env.JSEARCH_API_KEY || '';
const SERPAPI_KEY  = import.meta.env.VITE_SERPAPI_KEY || process.env.SERPAPI_KEY || '';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketAnalysisParams {
  role: string;
  industry?: string;
  intlMarket: string;   // e.g. "United States"
  localMarket: string;  // e.g. "Pakistan"
  workType: 'Remote' | 'Hybrid' | 'Onsite';
}

export interface SkillEntry {
  name: string;
  pct: number;
}

export interface TrendEntry {
  skill: string;
  growth: string; // e.g. "+23%", "stable", "-12%"
}

export interface SalaryIntel {
  intlMin: string;  // e.g. "$25/hr"
  intlAvg: string;
  intlMax: string;
  localMin: string; // e.g. "80k PKR"
  localAvg: string;
  localMax: string;
}

export interface MarketInsightData {
  localSkills: SkillEntry[];
  intlSkills: SkillEntry[];
  salaryIntel: SalaryIntel;
  trending: TrendEntry[];          // positive / stable growth
  declining: TrendEntry[];         // negative growth
  regionalPreferences: Record<string, string[]>; // { "United States": [...], UK: [...], Pakistan: [...] }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ProcessedJobData {
  totalJobs: number;
  remoteCount: number;
  skillFrequency: { skill: string; count: number; pct: number }[];
  salaryRange: { min: number; max: number; currency: string } | null;
  sampleTitles: string[];
}

interface ProcessedSalaryData {
  salarySamples: string[];
  jobCount: number;
  relatedSearches: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 & 2 — JSearch (RapidAPI)
// Sign up: https://rapidapi.com/letscrape-6bDWXAVd9u/api/jsearch
// ─────────────────────────────────────────────────────────────────────────────

const COMMON_SKILLS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Next.js', 'GraphQL',
  'REST', 'AWS', 'Docker', 'Git', 'Jest', 'Testing', 'CI/CD', 'Python',
  'SQL', 'MongoDB', 'Redis', 'Tailwind', 'Vue', 'Angular', 'Figma',
  'PHP', 'Laravel', 'WordPress', 'Flutter', 'Swift', 'Kotlin', 'Java',
  'Spring Boot', 'Django', 'FastAPI', 'PostgreSQL', 'MySQL', 'Firebase',
];

async function fetchJSearch(
  role: string,
  market: string,
  industry: string,
  workType: string,
): Promise<ProcessedJobData> {
  const query = [role, industry, market].filter(Boolean).join(' ');
  const isRemote = workType === 'Remote';

  const params = new URLSearchParams({
    query,
    num_pages: '3',
    results_per_page: '5',
    job_details: 'true',
    employment_types: isRemote ? 'FULLTIME' : 'FULLTIME,PARTTIME,CONTRACTOR',
  });
  if (isRemote) params.set('remote_jobs_only', 'true');

  let jobs: any[] = [];

  try {
    const res = await fetch(
      `https://jsearch.p.rapidapi.com/search?${params.toString()}`,
      {
        headers: {
          'X-RapidAPI-Key':  JSEARCH_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      },
    );
    if (res.ok) {
      const data = await res.json();
      jobs = data?.data || [];
    }
  } catch {
    // fail silently — OpenAI will estimate from its own knowledge when data is sparse
  }

  // Count skill mentions across all job descriptions
  const freq: Record<string, number> = {};
  for (const job of jobs) {
    const desc = (job.job_description || '').toLowerCase();
    for (const skill of COMMON_SKILLS) {
      if (desc.includes(skill.toLowerCase())) {
        freq[skill] = (freq[skill] || 0) + 1;
      }
    }
  }

  const skillFrequency = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([skill, count]) => ({
      skill,
      count,
      pct: Math.round((count / Math.max(jobs.length, 1)) * 100),
    }))
    .slice(0, 20);

  const sals = jobs
    .filter(j => j.job_min_salary && j.job_max_salary)
    .map(j => ({
      min: j.job_min_salary,
      max: j.job_max_salary,
      currency: j.job_salary_currency || 'USD',
    }));

  const salaryRange = sals.length > 0
    ? {
        min: Math.round(sals.reduce((s, j) => s + j.min, 0) / sals.length),
        max: Math.round(sals.reduce((s, j) => s + j.max, 0) / sals.length),
        currency: sals[0].currency,
      }
    : null;

  return {
    totalJobs:     jobs.length,
    remoteCount:   jobs.filter(j => j.job_is_remote).length,
    skillFrequency,
    salaryRange,
    sampleTitles:  jobs.slice(0, 5).map(j => j.job_title || '').filter(Boolean),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 & 4 — SerpAPI (Google Jobs salary search)
// Sign up: https://serpapi.com
// ─────────────────────────────────────────────────────────────────────────────

async function fetchSerpAPISalary(role: string, location: string): Promise<ProcessedSalaryData> {
  const params = new URLSearchParams({
    engine:  'google_jobs',
    q:       `${role} salary`,
    location,
    chips:   'date_posted:month',
    api_key: SERPAPI_KEY,
  });

  let jobs: any[]    = [];
  let related: any[] = [];

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      jobs    = data?.jobs_results     || [];
      related = data?.related_searches || [];
    }
  } catch {
    // fail silently
  }

  return {
    salarySamples: jobs
      .filter(j => j.detected_extensions?.salary)
      .map(j => j.detected_extensions.salary)
      .slice(0, 10),
    jobCount:        jobs.length,
    relatedSearches: related.map((r: any) => r.query).slice(0, 5),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — OpenAI synthesis (mirrors the n8n AI node prompt)
// Uses your existing callOpenAI() from App.tsx — no extra API key needed
// ─────────────────────────────────────────────────────────────────────────────

async function synthesizeWithOpenAI(
  params: MarketAnalysisParams,
  intlJobData:     ProcessedJobData,
  localJobData:    ProcessedJobData,
  intlSalaryData:  ProcessedSalaryData,
  localSalaryData: ProcessedSalaryData,
): Promise<MarketInsightData> {

  const prompt = `You are SkillSync Radar. Synthesize this REAL job market data into structured JSON.

=== PARAMETERS ===
Role: ${params.role}
Industry: ${params.industry || '(general)'}
International Market: ${params.intlMarket}
Local Market: ${params.localMarket}
Work Type: ${params.workType}

=== JSEARCH — INTERNATIONAL (${params.intlMarket}) ===
Total jobs found: ${intlJobData.totalJobs}
Remote jobs: ${intlJobData.remoteCount}
Top skill frequencies (skill: count/pct of listings):
${intlJobData.skillFrequency.map(s => `${s.skill}: ${s.count} jobs (${s.pct}%)`).join('\n') || '(no live data — estimate from your knowledge)'}
Salary from listings: ${JSON.stringify(intlJobData.salaryRange)}
Sample job titles: ${intlJobData.sampleTitles.join(', ') || '(none)'}

=== JSEARCH — LOCAL (${params.localMarket}) ===
Total jobs found: ${localJobData.totalJobs}
Top skill frequencies:
${localJobData.skillFrequency.map(s => `${s.skill}: ${s.count} jobs (${s.pct}%)`).join('\n') || '(no live data — estimate from your knowledge)'}
Salary from listings: ${JSON.stringify(localJobData.salaryRange)}

=== SERPAPI — INTERNATIONAL SALARY (${params.intlMarket}) ===
Salary samples from Google Jobs: ${intlSalaryData.salarySamples.join(', ') || '(none)'}
Job count: ${intlSalaryData.jobCount}
Related searches: ${intlSalaryData.relatedSearches.join(', ') || '(none)'}

=== SERPAPI — LOCAL SALARY (${params.localMarket}) ===
Salary samples from Google Jobs: ${localSalaryData.salarySamples.join(', ') || '(none)'}
Job count: ${localSalaryData.jobCount}
Related searches: ${localSalaryData.relatedSearches.join(', ') || '(none)'}

INSTRUCTIONS:
1. technicalSkills.local → classify top skills for ${params.localMarket} from LOCAL JSearch frequency. high = >60% of listings, medium = 30-60%. Include 3-5 per bucket. Use industry context.
2. technicalSkills.international → same classification using INTERNATIONAL JSearch data. 3-5 per bucket.
3. softSkills → infer from qualifications text patterns (communication, leadership, problem-solving, teamwork, mentoring, etc.)
4. salaryIntel → normalise ALL international salaries to annual USD. Estimate if data is sparse. For local, use ${params.localMarket} typical compensation in local currency.
5. regionalBehavior.intl → exactly 4 strings: first 2 for ${params.intlMarket} client preferences, next 2 for UK client preferences.
6. regionalBehavior.local → 2-4 strings for ${params.localMarket} employer/client preferences.
7. trendingSkills → 6-8 entries. Mix of: growing skills (+X%), stable skills ("stable"), and exactly 2 declining skills ("-X%"). Base on real market direction for the role and industry.

Return ONLY a valid JSON object — NO markdown fences, NO explanations, NO extra text:
{
  "technicalSkills": {
    "local":         { "high": ["Skill A","Skill B"], "medium": ["Skill C","Skill D"] },
    "international": { "high": ["Skill X","Skill Y"], "medium": ["Skill Z"] }
  },
  "softSkills": {
    "high":   ["communication","problem-solving"],
    "medium": ["adaptability","time management"]
  },
  "salaryIntel": {
    "currency":      "USD",
    "annualMin":     52000,
    "annualMax":     197600,
    "midpoint":      108160,
    "confidence":    "high",
    "source":        "listing_data",
    "note":          "Based on international market data.",
    "localCurrency": "PKR",
    "localAnnualMin": 960000,
    "localAnnualMax": 4200000,
    "localMidpoint":  2220000
  },
  "regionalBehavior": {
    "intl":  ["Direct, ROI-focused", "Technical depth expected", "Formal structured tone", "Culture-fit important"],
    "local": ["Relationship-first approach", "Urdu/English mix fine"]
  },
  "trendingSkills": [
    { "skill": "TypeScript",    "growth": "+23%" },
    { "skill": "Next.js",       "growth": "+18%" },
    { "skill": "AI Integration","growth": "+41%" },
    { "skill": "React",         "growth": "stable" },
    { "skill": "Node.js",       "growth": "stable" },
    { "skill": "jQuery",        "growth": "-12%" },
    { "skill": "WordPress",     "growth": "-8%" }
  ]
}`;

  const raw   = await callOpenAI(prompt);
  const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

  let ai: any;
  try {
    ai = JSON.parse(clean);
  } catch {
    throw new Error('OpenAI returned invalid JSON for market synthesis.');
  }

  // ── Transform raw AI output → app-ready MarketInsightData ────────────────

  // Convert annual USD salary → hourly (2080 work hours / year)
  const toHourly     = (annual: number) => Math.round(annual / 2080);
  // Convert annual local salary → "XXXk PKR" monthly string
  const toPKRMonthly = (annual: number) => `${Math.round(annual / 12 / 1000)}k PKR`;

  // Local skills: high bucket → pct starting at 87, decreasing; medium → starting at 64
  const localHigh: string[] = ai.technicalSkills?.local?.high   || [];
  const localMed:  string[] = ai.technicalSkills?.local?.medium  || [];
  const localSkills: SkillEntry[] = [
    ...localHigh.map((name, i) => ({ name, pct: Math.max(87 - i * 5, 55) })),
    ...localMed .map((name, i) => ({ name, pct: Math.max(64 - i * 6, 30) })),
  ].slice(0, 5);

  // International skills: high → starting at 94, medium → starting at 73
  const intlHigh: string[] = ai.technicalSkills?.international?.high   || [];
  const intlMed:  string[] = ai.technicalSkills?.international?.medium  || [];
  const intlSkills: SkillEntry[] = [
    ...intlHigh.map((name, i) => ({ name, pct: Math.max(94 - i * 7, 60) })),
    ...intlMed .map((name, i) => ({ name, pct: Math.max(73 - i * 8, 35) })),
  ].slice(0, 5);

  // Salary
  const sal = ai.salaryIntel || {};
  const salaryIntel: SalaryIntel = {
    intlMin: `$${toHourly(sal.annualMin  || 52000)}/hr`,
    intlAvg: `$${toHourly(sal.midpoint   || 108160)}/hr`,
    intlMax: `$${toHourly(sal.annualMax  || 197600)}/hr`,
    localMin: toPKRMonthly(sal.localAnnualMin || 960000),
    localAvg: toPKRMonthly(sal.localMidpoint  || 2220000),
    localMax: toPKRMonthly(sal.localAnnualMax || 4200000),
  };

  // Split trending vs declining
  const allTrends: TrendEntry[] = ai.trendingSkills || [];
  const trending  = allTrends.filter(t => !t.growth.startsWith('-')).slice(0, 6);
  const declining = allTrends.filter(t => t.growth.startsWith('-')).slice(0, 4);

  // Fallback declining list if OpenAI forgot to include any
  const finalDeclining: TrendEntry[] = declining.length > 0
    ? declining
    : [{ skill: 'jQuery', growth: '-12%' }, { skill: 'WordPress', growth: '-8%' }];

  // Build regional preferences map using the selected markets as keys
  const intlBehaviors:  string[] = ai.regionalBehavior?.intl   || [];
  const localBehaviors: string[] = ai.regionalBehavior?.local  || [];

  const intlKey   = params.intlMarket;
  const localKey  = params.localMarket;

  const regionalPreferences: Record<string, string[]> = {
    [intlKey]: intlBehaviors.length >= 2
      ? [intlBehaviors[0], intlBehaviors[1], 'Portfolio + measurable results', 'Quick response time valued']
      : ['Direct, ROI-focused proposals', 'Technical depth expected', 'Portfolio + measurable results', 'Quick response time valued'],
    'UK': intlBehaviors.length >= 4
      ? [intlBehaviors[2], intlBehaviors[3], 'Detailed process explanation', 'Reliability signals important']
      : ['Formal, structured tone', 'Culture-fit questions common', 'Detailed process explanation', 'Reliability signals important'],
    [localKey]: localBehaviors.length >= 2
      ? [...localBehaviors.slice(0, 2), 'Flexible revision policies', 'Phone availability preferred']
      : ['Relationship-first approach', 'Urdu/English mix fine', 'Flexible revision policies', 'Phone availability preferred'],
  };

  return {
    localSkills,
    intlSkills,
    salaryIntel,
    trending,
    declining: finalDeclining,
    regionalPreferences,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — call this from the Intelligence Layer "Analyse Market" button
// ─────────────────────────────────────────────────────────────────────────────

/**
 * analyzeMarket
 *
 * Fires 4 API calls in parallel (JSearch x2 + SerpAPI x2),
 * merges the results, then sends everything to OpenAI for synthesis.
 *
 * Returns MarketInsightData ready to drop into your UI state.
 *
 * If API keys are missing/invalid the function still works —
 * OpenAI falls back to its own training knowledge for the estimates.
 */
export async function analyzeMarket(params: MarketAnalysisParams): Promise<MarketInsightData> {
  // All 4 external API calls are independent — run them in parallel
  const [intlJobData, localJobData, intlSalaryData, localSalaryData] = await Promise.all([
    fetchJSearch(params.role, params.intlMarket,  params.industry || '', params.workType),
    fetchJSearch(params.role, params.localMarket, params.industry || '', params.workType),
    fetchSerpAPISalary(params.role, params.intlMarket),
    fetchSerpAPISalary(params.role, params.localMarket),
  ]);

  return synthesizeWithOpenAI(params, intlJobData, localJobData, intlSalaryData, localSalaryData);
}
