/**
 * userProfile.ts
 * 
 * Persistent user profile system using localStorage.
 * Stores resume, preferences, proposals, Roshan Score history.
 * Zero dependencies — pure localStorage with typed wrappers.
 */

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export interface SavedProposal {
  id: string;
  platform: string;
  jobTitle: string;
  proposalText: string;
  suggestedRate: string;
  createdAt: string; // ISO timestamp
  tags: string[];
}

export interface SavedProfile {
  platform: string;
  profileText: string;
  seoScore: number;
  strengthScore: number;
  createdAt: string;
}

export interface SavedNegotiation {
  id: string;
  role: string;
  experience: string;
  platform: string;
  offeredRate: string;
  currency: string;
  recommendedRate: string;
  verdict: 'lowball' | 'fair' | 'above';
  openingScript: string;
  createdAt: string;
}

export interface RoshanScoreHistory {
  date: string; // ISO date string
  score: number;
  breakdown: {
    profileStrength: number;   // 0–25: best profile score across platforms
    skillCoverage: number;     // 0–25: how many gaps closed
    proposalActivity: number;  // 0–25: proposals generated
    marketFit: number;         // 0–25: career gap score
    negotiationSkill: number;  // 0–10: bonus for negotiation activity? Or just reuse others
  };
  event: string; // e.g. "Generated Upwork profile", "Closed TypeScript gap"
}

export interface UserProfile {
  // Identity
  name: string;
  targetRole: string;
  targetMarket: string;
  workType: 'Remote' | 'Hybrid' | 'Onsite';
  preferredPlatforms: string[];
  
  // Resume
  resumeText: string;
  resumeFileName: string;
  resumeUpdatedAt: string;

  // Saved work
  savedProposals: SavedProposal[];
  savedProfiles: Record<string, SavedProfile>; // key = platform
  savedNegotiations: SavedNegotiation[];
  savedAnalyses: Array<{
    id: string;
    role: string;
    targetMarket: string;
    score: number;
    summary: string;
    gapsCount: number;
    createdAt: string;
  }>;

  // Skills tracking
  closedSkillGaps: string[];  // skills user has since learned/added
  lastGapScore: number;        // last career analysis score

  // Roshan Score
  roshanScore: number;         // 0–100 current score
  roshanScoreHistory: RoshanScoreHistory[];
  
  // Metadata
  createdAt: string;
  lastActiveAt: string;
  totalProposalsGenerated: number;
  totalProfilesGenerated: number;
  totalAnalysesRun: number;
  
  // Settings
  language: 'en' | 'ur';
  urduNames: boolean; // show Urdu labels alongside English
}

// ─────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  targetRole: '',
  targetMarket: 'United States',
  workType: 'Remote',
  preferredPlatforms: ['Upwork', 'Fiverr'],
  resumeText: '',
  resumeFileName: '',
  resumeUpdatedAt: '',
  savedProposals: [],
  savedProfiles: {},
  savedNegotiations: [],
  savedAnalyses: [],
  closedSkillGaps: [],
  lastGapScore: 0,
  roshanScore: 0,
  roshanScoreHistory: [],
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  totalProposalsGenerated: 0,
  totalProfilesGenerated: 0,
  totalAnalysesRun: 0,
  language: 'en',
  urduNames: false,
};

const STORAGE_KEY = 'roshan_user_profile_v2';

// ─────────────────────────────────────────────────────────
// CORE CRUD
// ─────────────────────────────────────────────────────────

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields don't break old saves
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    const updated = { ...profile, lastActiveAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('[userProfile] Failed to save:', e);
  }
}

export function updateProfile(patch: Partial<UserProfile>): UserProfile {
  const current = loadProfile();
  const updated = { ...current, ...patch };
  saveProfile(updated);
  return updated;
}

export function clearProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─────────────────────────────────────────────────────────
// PROPOSAL MANAGEMENT
// ─────────────────────────────────────────────────────────

function cleanHtml(html: string): string {
  if (!html) return '';
  // Strip HTML tags and decode entities
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

export function saveProposal(data: {
  platform: string;
  jobTitle: string;
  proposalText: string;
  suggestedRate: string;
  tags?: string[];
}): SavedProposal {
  const profile = loadProfile();
  const proposal: SavedProposal = {
    id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    platform: data.platform,
    jobTitle: data.jobTitle || 'Untitled Proposal',
    proposalText: cleanHtml(data.proposalText),
    suggestedRate: data.suggestedRate,
    createdAt: new Date().toISOString(),
    tags: data.tags || [],
  };
  const updated = {
    ...profile,
    savedProposals: [proposal, ...profile.savedProposals].slice(0, 50), // cap at 50
    totalProposalsGenerated: profile.totalProposalsGenerated + 1,
  };
  const withScore = recalculateRoshanScore(updated, `Proposal created for ${data.platform}`);
  saveProfile(withScore);
  return proposal;
}

export function deleteProposal(id: string): void {
  const profile = loadProfile();
  updateProfile({ savedProposals: profile.savedProposals.filter(p => p.id !== id) });
}

// ─────────────────────────────────────────────────────────
// PROFILE MANAGEMENT  
// ─────────────────────────────────────────────────────────

export function saveGeneratedProfile(platform: string, profileText: string, seoScore: number, strengthScore: number): void {
  const profile = loadProfile();
  const savedProfile: SavedProfile = {
    platform, 
    profileText: cleanHtml(profileText), 
    seoScore, 
    strengthScore,
    createdAt: new Date().toISOString(),
  };
  const updated = {
    ...profile,
    savedProfiles: { ...profile.savedProfiles, [platform]: savedProfile },
    totalProfilesGenerated: profile.totalProfilesGenerated + 1,
  };
  const withScore = recalculateRoshanScore(updated, `${platform} profile generated (SEO ${seoScore}%)`);
  saveProfile(withScore);
}

// ─────────────────────────────────────────────────────────
// NEGOTIATION MANAGEMENT
// ─────────────────────────────────────────────────────────

export function saveNegotiation(data: Omit<SavedNegotiation, 'id' | 'createdAt'>): SavedNegotiation {
  const profile = loadProfile();
  const negotiation: SavedNegotiation = {
    id: `neg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...data,
    createdAt: new Date().toISOString(),
  };
  const updated = {
    ...profile,
    savedNegotiations: [negotiation, ...profile.savedNegotiations].slice(0, 30), // cap at 30
    totalAnalysesRun: profile.totalAnalysesRun + 1,
  };
  const withScore = recalculateRoshanScore(updated, `Negotiation strategy saved for ${data.role}`);
  saveProfile(withScore);
  return negotiation;
}

export function deleteNegotiation(id: string): void {
  const profile = loadProfile();
  updateProfile({ savedNegotiations: profile.savedNegotiations.filter(n => n.id !== id) });
}

// ─────────────────────────────────────────────────────────
// SKILL GAP TRACKING
// ─────────────────────────────────────────────────────────

export function recordCareerAnalysis(gapScore: number, missingSkills: string[]): void {
  const profile = loadProfile();
  const updated = {
    ...profile,
    lastGapScore: gapScore,
    totalAnalysesRun: profile.totalAnalysesRun + 1,
  };
  const withScore = recalculateRoshanScore(updated, `Career analysis run — gap score ${gapScore}%`);
  saveProfile(withScore);
}

export function markSkillLearned(skill: string): void {
  const profile = loadProfile();
  if (profile.closedSkillGaps.includes(skill)) return;
  const updated = {
    ...profile,
    closedSkillGaps: [...profile.closedSkillGaps, skill],
  };
  const withScore = recalculateRoshanScore(updated, `Skill closed: ${skill}`);
  saveProfile(withScore);
}

// ─────────────────────────────────────────────────────────
// ROSHAN SCORE ENGINE
// ─────────────────────────────────────────────────────────

export function recalculateRoshanScore(profile: UserProfile, event = 'Profile updated'): UserProfile {
  // 1. Profile Strength (0–25)
  const profiles = Object.values(profile.savedProfiles);
  const bestSEO = profiles.length > 0 ? Math.max(...profiles.map(p => p.seoScore)) : 0;
  const seoPoints = (bestSEO / 100) * 15; // 15 pts max for SEO
  const resumePoints = profile.resumeText ? 5 : 0; // 5 pts for resume
  const quantityPoints = Math.min(Object.keys(profile.savedProfiles).length * 1.5, 5); // 1.5 pts per platform, up to 5
  const profileStrength = Math.round(seoPoints + resumePoints + quantityPoints);

  // 2. Skill Coverage (0–25)
  // 10 skills = 25 points (2.5 pts per skill)
  const skillCoverage = Math.round(Math.min(profile.closedSkillGaps.length * 2.5, 25));

  // 3. Proposal Activity (0–25)
  // 10 proposals = 25 points (2.5 pts per proposal)
  const proposalActivity = Math.round(Math.min(profile.totalProposalsGenerated * 2.5, 25));

  // 4. Market Fit (0–25): last career gap score
  const marketFit = Math.round((profile.lastGapScore / 100) * 25);

  // 5. Negotiation Skill (0–10): bonus for saved negotiations
  // 5 negotiations = 10 points (2 pts per negotiation)
  const negotiationSkill = Math.round(Math.min(profile.savedNegotiations.length * 2, 10));

  const rawScore = profileStrength + skillCoverage + proposalActivity + marketFit + negotiationSkill;
  const score = Math.min(Math.max(rawScore, 0), 100);

  const historyEntry: RoshanScoreHistory = {
    date: new Date().toISOString(),
    score,
    breakdown: { profileStrength, skillCoverage, proposalActivity, marketFit, negotiationSkill },
    event,
  };

  return {
    ...profile,
    roshanScore: score,
    roshanScoreHistory: [historyEntry, ...profile.roshanScoreHistory].slice(0, 30),
  };
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

export function getScoreLevel(score: number): { label: string; urdu: string; color: string; emoji: string } {
  if (score >= 80) return { label: 'Elite', urdu: 'اشرافیہ', color: '#0B7D6E', emoji: '🌟' };
  if (score >= 60) return { label: 'Strong', urdu: 'مضبوط', color: '#E87C2E', emoji: '💪' };
  if (score >= 40) return { label: 'Rising', urdu: 'ابھرتا ہوا', color: '#7C3AED', emoji: '📈' };
  if (score >= 20) return { label: 'Beginner', urdu: 'ابتدائی', color: '#F59E0B', emoji: '🌱' };
  return { label: 'New', urdu: 'نیا', color: '#6B7280', emoji: '✨' };
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}
