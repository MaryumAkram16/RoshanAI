import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, ensureUserProfile, FirebaseProfile } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  profile: FirebaseProfile | null;
  loading: boolean;
  authModalOpen: boolean;
  pendingFeature: string | null;
  firebaseReady: boolean;
  openAuthModal: (feature?: string) => void;
  closeAuthModal: () => void;
  requireAuth: (feature: string, callback: () => void) => void;
  completePendingFeature: (navigate?: (path: string) => void) => void;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FirebaseProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<string | null>(null);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setFirebaseReady(false);
      setLoading(false);
      return;
    }
    setFirebaseReady(true);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await ensureUserProfile(currentUser);
        } catch (e) {
          console.error("Error creating/fetching profile", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    // Listen to real-time profile updates
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as FirebaseProfile);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const openAuthModal = (feature?: string) => {
    if (feature) setPendingFeature(feature);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setPendingFeature(null);
    setPendingCallback(null);
  };

  const requireAuth = (feature: string, callback: () => void) => {
    if (user) {
      callback();
    } else {
      setPendingFeature(feature);
      setPendingCallback(() => callback);
      setAuthModalOpen(true);
    }
  };

  const completePendingFeature = (navigate?: (path: string) => void) => {
    if (pendingCallback) {
      pendingCallback();
      setPendingCallback(null);
    }
    setPendingFeature(null);
    setAuthModalOpen(false);
  };

  const signOutUser = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authModalOpen,
        pendingFeature,
        firebaseReady,
        openAuthModal,
        closeAuthModal,
        requireAuth,
        completePendingFeature,
        signOutUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
