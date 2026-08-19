import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { X, Mail, Lock, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';
import { S } from '../App';

export function AuthModal() {
  const { authModalOpen, closeAuthModal, completePendingFeature, firebaseReady } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      completePendingFeature();
    } catch (e: any) {
      setError(e.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(cred.user, { displayName: name });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      completePendingFeature();
    } catch (e: any) {
      // make errors friendlier
      let msg = e.message;
      if (msg.includes('auth/invalid-email')) msg = 'Invalid email address.';
      if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) msg = 'Invalid email or password.';
      if (msg.includes('auth/email-already-in-use')) msg = 'An account with this email already exists.';
      
      setError(msg || 'Authentication failed');
      setLoading(false);
    }
  };

  if (!firebaseReady) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,20,16,0.6)', backdropFilter: 'blur(4px)' }}>
        <div style={{ background: '#2C2B29', color: '#FDFBF7', padding: 32, borderRadius: 16, width: 400, maxWidth: '90%', position: 'relative' }}>
          <button onClick={closeAuthModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#8B7355', cursor: 'pointer' }}>
            <X size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, color: '#E87C2E' }}>
            <AlertCircle size={24} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Firebase Not Configured</h2>
          </div>
          <p style={{ color: '#cec8c0', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Firebase environment variables are missing. Please wait for the setup to finish or check your .env.local file to use authentication.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,20,16,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}>
      {/* Dark Theme Modal */}
      <div style={{ background: '#1A1410', color: '#FDFBF7', borderRadius: 20, width: 420, maxWidth: '100%', position: 'relative', overflow: 'hidden', border: '1px solid #3d332b', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <button onClick={closeAuthModal} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#a3988c', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s' }}>
          <X size={16} />
        </button>

        <div style={{ padding: '32px 32px 0' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, marginBottom: 6 }}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: '#a3988c', fontSize: '0.9rem', marginBottom: 24 }}>
            {mode === 'signin' ? 'Sign in to access your intelligence reports and tracking.' : 'Join Roshan to start tracking your market readiness.'}
          </p>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{ width: '100%', background: '#fff', color: '#1A1410', border: 'none', padding: '12px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 20 }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/></g></svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#3d332b' }}></div>
            <div style={{ fontSize: '0.8rem', color: '#8B7355', textTransform: 'uppercase', letterSpacing: 1 }}>or email</div>
            <div style={{ flex: 1, height: 1, background: '#3d332b' }}></div>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} style={{ padding: '0 32px 32px' }}>
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {mode === 'signup' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cec8c0', marginBottom: 6 }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={16} color="#8B7355" style={{ position: 'absolute', left: 14, top: 12 }} />
                <input
                  required
                  type="text"
                  placeholder="Ali Khan"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid #3d332b', padding: '10px 14px 10px 40px', borderRadius: 8, color: '#FDFBF7', fontSize: '0.95rem' }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cec8c0', marginBottom: 6 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#8B7355" style={{ position: 'absolute', left: 14, top: 12 }} />
              <input
                required
                type="email"
                placeholder="ali@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid #3d332b', padding: '10px 14px 10px 40px', borderRadius: 8, color: '#FDFBF7', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cec8c0', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#8B7355" style={{ position: 'absolute', left: 14, top: 12 }} />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid #3d332b', padding: '10px 14px 10px 40px', borderRadius: 8, color: '#FDFBF7', fontSize: '0.95rem' }}
              />
            </div>
            {mode === 'signup' && <div style={{ fontSize: '0.75rem', color: '#8B7355', marginTop: 6 }}>Must be at least 6 characters</div>}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#0B7D6E', color: '#FDFBF7', border: 'none', padding: '12px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Checking credentials...</> : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 32px', borderTop: '1px solid #3d332b', textAlign: 'center', fontSize: '0.85rem', color: '#a3988c' }}>
          {mode === 'signin' ? (
            <>Don't have an account? <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: '#E87C2E', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: '#E87C2E', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
