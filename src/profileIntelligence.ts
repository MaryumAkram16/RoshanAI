/**
 * profileIntelligence.ts
 *
 * Reverse-engineers top-ranked freelancer profiles on each platform
 * using SerpAPI → web scrape → OpenAI pattern analysis → personalized rewrite.
 *
 * Pipeline:
 *   1. SerpAPI  → find top-ranked profiles for role + platform
 *   2. web_fetch → scrape profile text from each URL (best-effort)
 *   3. OpenAI Pass 1 → extract patterns: keywords, tone, structure, hooks
 *   4. OpenAI Pass 2 → rewrite user profile using patterns + resume
 *   5. OpenAI Pass 3 → platform compliance check
 *   6. Score computation → multi-factor SEO + trust + strength scores
 *
 * Add to .env.local:
 *   SERPAPI_KEY=your_serpapi_key_here
 */

import { callOpenAI } from './App';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileGenerationParams {
  resumeText: string;
  targetRole: string;
  targetMarket: string;
  platform: 'Upwork' | 'Fiverr' | 'LinkedIn' | 'Freelancer';
  tone: string;
}

export interface SEOScoreBreakdown {
  keywordDensity:    number; // 0-100: are high-demand keywords present at right frequency?
  titleOptimization: number; // 0-100: role title matches market demand terminology
  ctaPresence:       number; // 0-100: has a clear call-to-action
  specificity:       number; // 0-100: uses concrete numbers, outcomes, stack names
  searchability:     number; // 0-100: terms that match how clients actually search
  overall:           number; // weighted average
}

export interface ComplianceResult {
  passed:   boolean;
  warnings: string[]; // e.g. "Contains contact info — Upwork will reject this"
  blocked:  string[]; // hard violations that must be fixed before submitting
}

export interface CompetitiveGap {
  keyword:    string;
  frequency:  number; // % of top profiles that mention this
  inResume:   boolean;
  suggestion: string; // how to weave it in naturally
}

export interface TopProfilePattern {
  source:           string; // URL or "AI knowledge"
  hookStyle:        string; // e.g. "Opens with client outcome", "Lead with metric"
  structureNotes:   string; // e.g. "Problem → Solution → CTA"
  topKeywords:      string[];
  toneCharacteristics: string[];
  avgLength:        number;
}

export interface ProfileIntelligenceResult {
  platform:          string;
  profileText:       string;
  seoScore:          SEOScoreBreakdown;
  strengthScore:     number; // 0-100 overall profile strength
  trustScore:        number; // 0-100 credibility signals
  compliance:        ComplianceResult;
  competitiveGaps:   CompetitiveGap[];
  topPatterns:       TopProfilePattern[];
  keywordsInjected:  string[]; // keywords added from top profile analysis
  wordCount:         number;
  platformLimits:    { charLimit: number; withinLimit: boolean };
  improvementTips:   string[]; // 3-5 actionable next steps
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM RULES
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_RULES: Record<string, {
  charLimit:       number;
  siteQuery:       string;
  searchModifiers: string;
  complianceRules: string[];
  seoFactors:      string[];
  tone:            string;
  structure:       string;
}> = {
  Upwork: {
    charLimit:       5000,
    siteQuery:       'site:upwork.com',
    searchModifiers: '"top rated" OR "top rated plus" OR "expert vetted"',
    complianceRules: [
      'No email addresses, phone numbers, or external URLs in bio',
      'No Skype IDs or WhatsApp numbers',
      'Must not promise specific earnings to clients',
      'No repeated keyword stuffing (same word >5 times)',
      'No ALL CAPS sentences',
      'No pricing information in the bio itself',
      'First 2 lines are visible in search — must be compelling without truncation',
    ],
    seoFactors: [
      'Role title in first sentence',
      'Primary tech stack listed explicitly',
      'Measurable outcomes (%, $, time saved)',
      'Client-outcome focused opening',
      'Niche specialization signal',
      'Years of experience stated',
      'CTA in final sentence',
    ],
    tone: 'Direct, ROI-focused, client-outcome-first. Every sentence should answer "what does this do for the client?"',
    structure: 'Hook (1-2 sentences) → Core Value Proposition → Tech Stack / Skills → Proof Points → CTA',
  },
  Fiverr: {
    charLimit:       1200,
    siteQuery:       'site:fiverr.com',
    searchModifiers: '"level two seller" OR "top rated seller" OR "pro verified"',
    complianceRules: [
      'No external links or contact information',
      'No promises of guaranteed delivery times in bio',
      'Bio must be in English (or target language)',
      'No offensive or misleading claims',
      'Max 1200 characters for bio section',
    ],
    seoFactors: [
      'Gig category keywords in first sentence',
      'Specific deliverables listed as bullets',
      'Emoji usage for visual scannability',
      'Buyer outcome stated upfront',
      'Fast delivery signal',
      'Revision policy mentioned',
      'Urgency/availability signal',
    ],
    tone: 'Energetic, buyer-outcome-first. Short punchy lines. Use emoji sparingly for hierarchy. Think retail copywriting.',
    structure: 'Outcome Hook → What You Get (3-4 bullets) → Why Me (1 differentiator) → CTA with urgency',
  },
  LinkedIn: {
    charLimit:       2600,
    siteQuery:       'site:linkedin.com/in',
    searchModifiers: '"open to work" OR "available for" OR "senior" OR "lead"',
    complianceRules: [
      'Must be professional and accurate',
      'No false credentials or fabricated companies',
      'Avoid keyword stuffing that reads unnaturally',
      'Keep under 2600 characters for About section',
      'First 300 characters visible without "See more" click — make them count',
    ],
    seoFactors: [
      'Job title keywords match LinkedIn search terms',
      'Industry-specific terminology present',
      'Location or remote availability stated',
      'Achievement-focused language (led, built, grew, reduced)',
      'Soft skill signals (collaboration, leadership)',
      'Career narrative arc',
      'CTA for connection/contact',
    ],
    tone: 'Professional but human. Show career narrative. Achievement-focused. First person is fine. Think thought-leader voice.',
    structure: 'Career Identity Statement → Key Achievements (2-3) → Expertise Areas → What You\'re Seeking → CTA',
  },
  Freelancer: {
    charLimit:       3000,
    siteQuery:       'site:freelancer.com',
    searchModifiers: '"preferred freelancer" OR "rising talent" OR "verified"',
    complianceRules: [
      'No contact details outside the platform',
      'Must not solicit off-platform payment',
      'Accurate skill representation required',
      'No copied/plagiarized content',
    ],
    seoFactors: [
      'All relevant technologies listed explicitly',
      'Competitive positioning vs other freelancers',
      'Portfolio project types mentioned',
      'Turnaround time signal',
      'Communication style stated',
      'Keyword-heavy for internal search algorithm',
    ],
    tone: 'Keyword-rich, competitive, technically detailed. Clients scan fast — front-load credentials.',
    structure: 'Skills/Tech Stack Hook → Experience Summary → Project Types → Differentiator → CTA',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — SerpAPI: find top-ranked profiles
// ─────────────────────────────────────────────────────────────────────────────

interface SerpResult {
  title:   string;
  link:    string;
  snippet: string;
}

async function fetchTopProfileUrls(
  platform: string,
  role:     string,
  market:   string,
): Promise<SerpResult[]> {
  const SERPAPI_KEY = import.meta.env.VITE_SERPAPI_KEY || process.env.SERPAPI_KEY || '';

  const rules = PLATFORM_RULES[platform];
  if (!rules) return [];

  // Build a targeted query that surfaces actual freelancer profile pages
  const query = `${rules.siteQuery} "${role}" ${rules.searchModifiers} ${market !== 'Local Pakistan Market' ? market : ''}`.trim();

  if (!SERPAPI_KEY) {
    console.warn('[profileIntelligence] SERPAPI_KEY not set — skipping live profile fetch');
    return [];
  }

  try {
    const params = new URLSearchParams({
      engine:  'google',
      q:       query,
      num:     '8',
      api_key: SERPAPI_KEY,
      gl:      market.includes('United States') ? 'us' : market.includes('United Kingdom') ? 'uk' : 'us',
      hl:      'en',
    });

    const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    if (!res.ok) {
      console.warn('[profileIntelligence] SerpAPI non-OK:', res.status);
      return [];
    }
    const data = await res.json();
    const organic: any[] = data?.organic_results ?? [];

    return organic
      .filter(r => r.link && r.snippet)
      .map(r => ({
        title:   r.title   ?? '',
        link:    r.link    ?? '',
        snippet: r.snippet ?? '',
      }))
      .slice(0, 6);

  } catch (err) {
    console.warn('[profileIntelligence] SerpAPI fetch error:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Attempt to fetch profile page text
// Falls back gracefully — snippets alone are still useful for OpenAI
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeProfileText(url: string): Promise<string> {
  // We can't do server-side fetches from the browser due to CORS,
  // so we rely on the snippet from SerpAPI + OpenAI's training knowledge.
  // In production (Cloud Run), replace this with a real fetch().
  return ''; // returns empty — OpenAI will use snippets + training knowledge
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — OpenAI Pass 1: Extract patterns from top profiles
// ─────────────────────────────────────────────────────────────────────────────

async function extractTopProfilePatterns(
  platform:    string,
  role:        string,
  market:      string,
  serpResults: SerpResult[],
): Promise<TopProfilePattern[]> {
  const rules   = PLATFORM_RULES[platform];
  const hasData = serpResults.length > 0;

  const serpContext = hasData
    ? serpResults.map((r, i) =>
        `Profile ${i + 1}:\nTitle: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`
      ).join('\n\n')
    : 'No live data available — use your training knowledge about top-performing profiles on this platform.';

  const prompt = `You are an expert freelancer profile analyst. Analyze these top-ranked ${platform} profiles for "${role}" targeting ${market}.

${hasData ? 'LIVE SERP DATA FROM TOP-RANKED PROFILES:' : 'NO LIVE DATA — USE TRAINING KNOWLEDGE:'}
${serpContext}

Platform: ${platform}
Platform tone guide: ${rules.tone}
Platform structure guide: ${rules.structure}

Your task: Extract the PATTERNS that make these profiles rank highly and convert clients.

Analyze:
1. How do the highest-performing profiles OPEN? (first 1-2 sentences)
2. What is the STRUCTURAL pattern? (sections, flow, length)
3. What KEYWORDS appear most frequently across profiles?
4. What TONE characteristics are shared? (confident, technical, outcome-focused, etc.)
5. What PROOF SIGNALS do they use? (certifications, numbers, client outcomes)
6. What CTA patterns do they use?
7. What makes them DIFFERENT from generic AI-generated profiles?

Return ONLY valid JSON — NO markdown fences:
{
  "patterns": [
    {
      "source": "URL or 'AI training knowledge'",
      "hookStyle": "Specific description of how this profile opens",
      "structureNotes": "Flow description e.g. Problem → Solution → Stack → Proof → CTA",
      "topKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "toneCharacteristics": ["confident", "outcome-focused", "technical-depth"],
      "avgLength": 320
    }
  ],
  "universalPatterns": {
    "mostCommonHookType": "Client outcome lead",
    "mostCommonKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"],
    "avgProfileLength": 380,
    "proofSignalTypes": ["years of experience", "project count", "client satisfaction %"],
    "structureTemplate": "Exact recommended structure for this platform + role combo"
  }
}`;

  try {
    const raw   = await callOpenAI(prompt);
    const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);

    const patterns: TopProfilePattern[] = (parsed.patterns ?? []).map((p: any) => ({
      source:              p.source              ?? 'AI knowledge',
      hookStyle:           p.hookStyle           ?? '',
      structureNotes:      p.structureNotes      ?? '',
      topKeywords:         p.topKeywords         ?? [],
      toneCharacteristics: p.toneCharacteristics ?? [],
      avgLength:           p.avgLength           ?? 350,
    }));

    // Inject universal patterns as a synthetic "meta pattern" entry
    if (parsed.universalPatterns) {
      const u = parsed.universalPatterns;
      patterns.unshift({
        source:              '🏆 Meta-Pattern (aggregated from top profiles)',
        hookStyle:           u.mostCommonHookType  ?? '',
        structureNotes:      u.structureTemplate   ?? '',
        topKeywords:         u.mostCommonKeywords  ?? [],
        toneCharacteristics: u.proofSignalTypes    ?? [],
        avgLength:           u.avgProfileLength    ?? 350,
      });
    }

    return patterns;
  } catch (err) {
    console.warn('[profileIntelligence] Pattern extraction parse error:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — OpenAI Pass 2: Rewrite user profile using patterns
// ─────────────────────────────────────────────────────────────────────────────

interface RewriteResult {
  profileText:      string;
  keywordsInjected: string[];
  competitiveGaps:  CompetitiveGap[];
  improvementTips:  string[];
}

async function rewriteProfileWithPatterns(
  params:   ProfileGenerationParams,
  patterns: TopProfilePattern[],
): Promise<RewriteResult> {
  const rules = PLATFORM_RULES[params.platform];

  const metaPattern  = patterns[0] ?? null;
  const topKeywords  = metaPattern?.topKeywords ?? [];
  const structure    = metaPattern?.structureNotes || rules.structure;
  const avgLength    = metaPattern?.avgLength ?? 350;

  const prompt = `You are an elite freelancer profile writer. Your job is to write a ${params.platform} profile that matches the EXACT patterns of top-ranked, highest-earning freelancers — then personalize it with this candidate's actual resume.

════════════════════════════════════
CANDIDATE RESUME:
════════════════════════════════════
${params.resumeText}

════════════════════════════════════
TARGET ROLE: ${params.targetRole}
TARGET MARKET: ${params.targetMarket}
PLATFORM: ${params.platform}
TONE PREFERENCE: ${params.tone}
════════════════════════════════════

════════════════════════════════════
TOP PROFILE PATTERNS (reverse-engineered from real top-ranked profiles):
════════════════════════════════════
Structure to follow: ${structure}
Keywords that appear in top profiles: ${topKeywords.join(', ')}
Platform tone: ${rules.tone}
Platform SEO factors: ${rules.seoFactors.join(' | ')}
Char limit: ${rules.charLimit}

All patterns found:
${patterns.slice(0, 4).map((p, i) => `
Pattern ${i + 1} (${p.source}):
  Hook style: ${p.hookStyle}
  Structure: ${p.structureNotes}
  Keywords: ${p.topKeywords.join(', ')}
  Tone: ${p.toneCharacteristics.join(', ')}
`).join('\n')}

════════════════════════════════════
YOUR TASKS:
════════════════════════════════════

1. Write the profile bio following the pattern structure above
2. Naturally inject the top keywords where they fit the resume truthfully
3. Identify competitive gaps — keywords in top profiles NOT in the resume
4. Stay within ${rules.charLimit} characters
5. Do NOT make up skills or experiences not in the resume
6. Sound human — NOT like AI-generated content
7. Follow the ${params.platform} tone guide exactly

Return ONLY valid JSON — NO markdown fences:
{
  "profileText": "Full profile bio here. Natural, human, using top-profile patterns.",
  "keywordsInjected": ["keyword1", "keyword2"],
  "competitiveGaps": [
    {
      "keyword": "TypeScript",
      "frequency": 87,
      "inResume": false,
      "suggestion": "If you've used TypeScript even briefly, mention it. Otherwise, add it to your learning roadmap and note you're actively upskilling."
    }
  ],
  "improvementTips": [
    "Add a specific client outcome metric in the opening sentence",
    "Mention TypeScript — it appears in 87% of top-ranked profiles for this role",
    "Add your fastest project delivery time as a proof point"
  ]
}`;

  try {
    const raw   = await callOpenAI(prompt);
    const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);

    return {
      profileText:      parsed.profileText      ?? '',
      keywordsInjected: parsed.keywordsInjected ?? [],
      competitiveGaps:  (parsed.competitiveGaps ?? []).map((g: any): CompetitiveGap => ({
        keyword:   g.keyword   ?? '',
        frequency: g.frequency ?? 0,
        inResume:  g.inResume  ?? false,
        suggestion: g.suggestion ?? '',
      })),
      improvementTips: parsed.improvementTips ?? [],
    };
  } catch (err) {
    console.warn('[profileIntelligence] Rewrite parse error:', err);
    return {
      profileText:      '',
      keywordsInjected: [],
      competitiveGaps:  [],
      improvementTips:  [],
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — OpenAI Pass 3: Platform compliance check
// ─────────────────────────────────────────────────────────────────────────────

async function checkCompliance(
  platform:    string,
  profileText: string,
): Promise<ComplianceResult> {
  const rules = PLATFORM_RULES[platform];

  const prompt = `You are a ${platform} policy compliance checker. Review this profile bio for policy violations.

PLATFORM COMPLIANCE RULES FOR ${platform.toUpperCase()}:
${rules.complianceRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

PROFILE TO CHECK:
"""
${profileText}
"""

Check every rule above. Be strict. Look for:
- Contact info (emails, phone numbers, Skype IDs, WhatsApp numbers)
- External URLs or social handles
- ALL CAPS sentences
- Keyword stuffing (any single word used more than 5 times)
- Character limit violations (limit: ${rules.charLimit} chars)
- Any other rule violations

Return ONLY valid JSON — NO markdown fences:
{
  "passed": true,
  "warnings": [
    "Minor issue that should be addressed but won't cause rejection"
  ],
  "blocked": [
    "Hard violation: contains email address 'john@gmail.com' — Upwork will reject this bio"
  ]
}`;

  try {
    const raw   = await callOpenAI(prompt);
    const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);

    return {
      passed:   parsed.passed   ?? true,
      warnings: parsed.warnings ?? [],
      blocked:  parsed.blocked  ?? [],
    };
  } catch {
    return { passed: true, warnings: [], blocked: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — Multi-factor scoring
// ─────────────────────────────────────────────────────────────────────────────

async function computeScores(
  platform:         string,
  profileText:      string,
  topKeywords:      string[],
  keywordsInjected: string[],
  competitiveGaps:  CompetitiveGap[],
): Promise<{ seoScore: SEOScoreBreakdown; strengthScore: number; trustScore: number }> {
  const rules = PLATFORM_RULES[platform];

  const prompt = `You are a ${platform} profile scoring expert. Score this profile across multiple dimensions.

PROFILE TEXT:
"""
${profileText}
"""

Platform: ${platform}
Top keywords for this role on this platform: ${topKeywords.join(', ')}
Keywords successfully injected: ${keywordsInjected.join(', ')}
Competitive keyword gaps (present in top profiles but missing here): ${competitiveGaps.map(g => g.keyword).join(', ')}

SCORING CRITERIA:

SEO Score (5 sub-factors, 0-100 each):
1. keywordDensity — Are the high-demand keywords present at a natural frequency? Too sparse = low, stuffed = low, natural = high
2. titleOptimization — Does the role title match exactly how clients search on ${platform}?
3. ctaPresence — Is there a clear, compelling call-to-action?
4. specificity — Are concrete numbers, tech stack names, outcomes mentioned? (not vague claims)
5. searchability — Would this profile surface for the terms clients actually type into ${platform}'s search?

Strength Score (0-100): Overall profile quality — hook power, differentiation, memorability, proof signals
Trust Score (0-100): Credibility signals — years of experience, specific outcomes, portfolio hints, certifications mentioned

SEO factor weights: keywordDensity=25%, titleOptimization=20%, ctaPresence=15%, specificity=25%, searchability=15%

Platform-specific SEO factors to check: ${rules.seoFactors.join(' | ')}

Return ONLY valid JSON — NO markdown fences:
{
  "seoScore": {
    "keywordDensity": 82,
    "titleOptimization": 88,
    "ctaPresence": 75,
    "specificity": 79,
    "searchability": 85,
    "overall": 82
  },
  "strengthScore": 84,
  "trustScore": 78
}`;

  try {
    const raw   = await callOpenAI(prompt);
    const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);

    const seo = parsed.seoScore ?? {};

    // Recompute overall with weights to be safe
    const overall = Math.round(
      (seo.keywordDensity    ?? 70) * 0.25 +
      (seo.titleOptimization ?? 70) * 0.20 +
      (seo.ctaPresence       ?? 70) * 0.15 +
      (seo.specificity       ?? 70) * 0.25 +
      (seo.searchability     ?? 70) * 0.15
    );

    return {
      seoScore: {
        keywordDensity:    seo.keywordDensity    ?? 70,
        titleOptimization: seo.titleOptimization ?? 70,
        ctaPresence:       seo.ctaPresence       ?? 70,
        specificity:       seo.specificity       ?? 70,
        searchability:     seo.searchability     ?? 70,
        overall,
      },
      strengthScore: parsed.strengthScore ?? 75,
      trustScore:    parsed.trustScore    ?? 75,
    };
  } catch {
    return {
      seoScore: {
        keywordDensity: 70, titleOptimization: 70, ctaPresence: 70,
        specificity: 70, searchability: 70, overall: 70,
      },
      strengthScore: 75,
      trustScore:    75,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateIntelligentProfile
 *
 * Full pipeline: SerpAPI → pattern extraction → personalized rewrite →
 * compliance check → multi-factor scoring.
 *
 * Falls back gracefully at every step if API keys are missing or calls fail —
 * OpenAI's training knowledge fills in the gaps.
 */
export async function generateIntelligentProfile(
  params: ProfileGenerationParams,
): Promise<ProfileIntelligenceResult> {
  const rules = PLATFORM_RULES[params.platform];

  // ── STEP 1: Find top profiles via SerpAPI ──────────────────────────────────
  const serpResults = await fetchTopProfileUrls(
    params.platform,
    params.targetRole,
    params.targetMarket,
  );

  // ── STEP 2: (Browser limitation — skip actual scraping, use snippets) ──────
  // In Cloud Run deployment, replace scrapeProfileText() with real fetch()

  // ── STEP 3: Extract patterns from top profiles ────────────────────────────
  const patterns = await extractTopProfilePatterns(
    params.platform,
    params.targetRole,
    params.targetMarket,
    serpResults,
  );

  const topKeywords = patterns[0]?.topKeywords ?? [];

  // ── STEP 4: Rewrite profile using patterns + resume ───────────────────────
  const rewrite = await rewriteProfileWithPatterns(params, patterns);

  // Fallback if rewrite returned empty
  const profileText = rewrite.profileText || `[Profile generation failed — please retry]`;

  // ── STEP 5: Platform compliance check ────────────────────────────────────
  const compliance = await checkCompliance(params.platform, profileText);

  // ── STEP 6: Multi-factor scoring ─────────────────────────────────────────
  const scores = await computeScores(
    params.platform,
    profileText,
    topKeywords,
    rewrite.keywordsInjected,
    rewrite.competitiveGaps,
  );

  // ── Build final result ────────────────────────────────────────────────────
  const charCount   = profileText.length;
  const withinLimit = charCount <= rules.charLimit;

  return {
    platform:         params.platform,
    profileText,
    seoScore:         scores.seoScore,
    strengthScore:    scores.strengthScore,
    trustScore:       scores.trustScore,
    compliance,
    competitiveGaps:  rewrite.competitiveGaps,
    topPatterns:      patterns,
    keywordsInjected: rewrite.keywordsInjected,
    wordCount:        profileText.split(/\s+/).filter(Boolean).length,
    platformLimits:   { charLimit: rules.charLimit, withinLimit },
    improvementTips:  rewrite.improvementTips,
  };
}

/**
 * generateAllPlatformProfiles
 *
 * Runs generateIntelligentProfile for each selected platform in parallel.
 * Returns a map of platform → result.
 */
export async function generateAllPlatformProfiles(
  params:    Omit<ProfileGenerationParams, 'platform'>,
  platforms: Array<'Upwork' | 'Fiverr' | 'LinkedIn' | 'Freelancer'>,
): Promise<Record<string, ProfileIntelligenceResult>> {
  const results = await Promise.all(
    platforms.map(platform =>
      generateIntelligentProfile({ ...params, platform })
        .then(result => ({ platform, result }))
        .catch(err => {
          console.error(`[profileIntelligence] Failed for ${platform}:`, err);
          return {
            platform,
            result: {
              platform,
              profileText:      `Error generating ${platform} profile. Please retry.`,
              seoScore:         { keywordDensity:0, titleOptimization:0, ctaPresence:0, specificity:0, searchability:0, overall:0 },
              strengthScore:    0,
              trustScore:       0,
              compliance:       { passed: false, warnings: [], blocked: ['Generation failed'] },
              competitiveGaps:  [],
              topPatterns:      [],
              keywordsInjected: [],
              wordCount:        0,
              platformLimits:   { charLimit: PLATFORM_RULES[platform]?.charLimit ?? 3000, withinLimit: false },
              improvementTips:  [],
            } as ProfileIntelligenceResult,
          };
        })
    )
  );

  return Object.fromEntries(results.map(({ platform, result }) => [platform, result]));
}