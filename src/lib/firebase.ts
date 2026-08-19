import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User, updateProfile as updateAuthProfile } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json'; // using the provided json

const app = initializeApp(firebaseConfig);
export const auth = getAuth();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface FirebaseProfile {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  provider: string;
  
  // Identity
  name?: string;
  targetRole: string;
  targetMarket: string;
  workType?: 'Remote' | 'Hybrid' | 'Onsite';
  preferredPlatforms?: string[];
  
  // Resume
  resumeText?: string;
  resumeFileName?: string;
  resumeUpdatedAt?: string;

  // Saved work
  savedProposals?: any[];
  savedProfiles?: Record<string, any>; // key = platform

  // Skills tracking
  closedSkillGaps?: string[];  // skills user has since learned/added
  lastGapScore?: number;        // last career analysis score

  roshanScore: number;
  roshanScoreHistory?: any[];

  salaryAnalysesRun: number;
  totalProposalsGenerated?: number;
  totalProfilesGenerated?: number;
  totalAnalysesRun?: number;
  language?: 'en' | 'ur';
  urduNames?: boolean;

  savedSalaryChecks: Array<{
    role: string;
    experience: string;
    offeredRate: string;
    currency: string;
    verdict: "lowball" | "fair" | "above";
    createdAt: string;
  }>;
  savedNegotiations?: Array<{
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
  }>;
  savedAnalyses?: Array<{
    id: string;
    role: string;
    targetMarket: string;
    score: number;
    summary: string;
    gapsCount: number;
    createdAt: string;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  lastActiveAt?: string;
}

/**
 * Calculate Roshan Score based on user and profile data.
 */
export function calculateRoshanScore(user: User, salaryAnalysesRun: number = 0): number {
  let score = 38; // Base
  if (user.emailVerified) score += 12;
  if (user.displayName) score += 10;
  if (user.photoURL) score += 10;
  
  const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
  if (isGoogle) score += 8;

  score += Math.min(salaryAnalysesRun * 2, 22); // Max up to 100 total
  return Math.min(score, 100);
}

/**
 * Ensure user document exists on sign in
 */
export async function ensureUserProfile(user: User): Promise<FirebaseProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  
  const provider = user.providerData[0]?.providerId || 'password';
  const score = calculateRoshanScore(user, snap.exists() ? snap.data().salaryAnalysesRun || 0 : 0);

  if (!snap.exists()) {
    const newProfile: FirebaseProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'New User',
      photoURL: user.photoURL,
      provider,
      targetRole: 'Frontend Developer',
      targetMarket: 'Pakistan + Global',
      roshanScore: score,
      salaryAnalysesRun: 0,
      savedSalaryChecks: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now()
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  } else {
    // Update last login
    await updateDoc(userRef, {
      lastLoginAt: Timestamp.now(),
      roshanScore: score, // recalculate on login
      displayName: user.displayName || snap.data().displayName,
      photoURL: user.photoURL || snap.data().photoURL
    });
    const updatedSnap = await getDoc(userRef);
    return updatedSnap.data() as FirebaseProfile;
  }
}

/**
 * Save a salary check to user's profile and increment stats
 */
export async function saveSalaryCheck(uid: string, check: {
  role: string;
  experience: string;
  offeredRate: string;
  currency: string;
  verdict: "lowball" | "fair" | "above";
}) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const currentRun = userSnap.data().salaryAnalysesRun || 0;
  const newRun = currentRun + 1;
  const userScore = userSnap.data().roshanScore || 38;
  const newScore = Math.min(userScore + 2, 100);

  const checkData = {
    ...check,
    createdAt: new Date().toISOString()
  };

  await updateDoc(userRef, {
    savedSalaryChecks: arrayUnion(checkData),
    salaryAnalysesRun: newRun,
    roshanScore: newScore,
    updatedAt: Timestamp.now()
  });
}

/**
 * Save a full negotiation strategy to user's profile
 */
export async function saveNegotiationToFirebase(uid: string, negotiation: {
  role: string;
  experience: string;
  platform: string;
  offeredRate: string;
  currency: string;
  recommendedRate: string;
  verdict: 'lowball' | 'fair' | 'above';
  openingScript: string;
}) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const negData = {
    ...negotiation,
    id: `neg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString()
  };

  const currentRun = userSnap.data().salaryAnalysesRun || 0;
  const newRun = currentRun + 1;
  const userScore = userSnap.data().roshanScore || 38;
  const newScore = Math.min(userScore + 2, 100);

  await updateDoc(userRef, {
    savedNegotiations: arrayUnion(negData),
    salaryAnalysesRun: newRun,
    roshanScore: newScore,
    updatedAt: Timestamp.now()
  });
}

/**
 * Save a career analysis report to user's profile
 */
export async function saveCareerAnalysisToFirebase(uid: string, analysis: {
  role: string;
  targetMarket: string;
  score: number;
  summary: string;
  gapsCount: number;
}) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const analysisData = {
    ...analysis,
    id: `ana_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString()
  };

  const currentRun = userSnap.data().careerAnalysesRun || 0;
  const newRun = currentRun + 1;
  const userScore = userSnap.data().roshanScore || 38;
  const newScore = Math.min(userScore + 5, 100); // Higher weight for career analysis

  await updateDoc(userRef, {
    savedAnalyses: arrayUnion(analysisData),
    careerAnalysesRun: newRun,
    lastGapScore: analysis.score,
    roshanScore: newScore,
    updatedAt: Timestamp.now()
  });
}

/**
 * Save a proposal to user's profile
 */
export async function saveProposalToFirebase(uid: string, proposal: {
  platform: string;
  jobTitle: string;
  proposalText: string;
  suggestedRate: string;
  tags?: string[];
}) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const propData = {
    ...proposal,
    id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString()
  };

  const currentRun = userSnap.data().totalProposalsGenerated || 0;
  const newRun = currentRun + 1;
  const userScore = userSnap.data().roshanScore || 38;
  const newScore = Math.min(userScore + 2, 100);

  await updateDoc(userRef, {
    savedProposals: arrayUnion(propData),
    totalProposalsGenerated: newRun,
    roshanScore: newScore,
    updatedAt: Timestamp.now()
  });
}

/**
 * Update any part of the user's profile in Firestore
 */
export async function updateUserProfile(uid: string, updates: Partial<FirebaseProfile>) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}
