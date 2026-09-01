import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  Database,
  Lock,
  ArrowRight,
  Brain,
  BookOpen,
  Wind,
  PenLine,
  Compass,
  MessageCircleHeart,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { signInWithPopup, auth, googleProvider } from '../firebase';

interface AuthLandingProps {}

export const AuthLanding: React.FC<AuthLandingProps> = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Sign In Error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else {
        setError(err?.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stone-50 flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        
        {/* Security / Technology Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200/70 text-rose-900 text-xs font-medium">
            <Shield className="h-3.5 w-3.5 text-rose-700" />
            <span>Encrypted Session &bull; Private Cloud Firestore Vault</span>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold  text-stone-900 leading-tight">
            A quiet sanctuary<br />
            <span className="text-rose-900">to think out loud.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Write privately, vent without fear, talk through complicated emotions, and discover recurring patterns in your life.
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-center gap-2 max-w-md mx-auto">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In CTA */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="btn-google-signin"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{loading ? 'Authenticating...' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Pillar 1: Write */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3 border border-emerald-100">
                <PenLine className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">Write</h3>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Quiet, distraction-free journal with autosave, moods, and tagging.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Autosaved vault</span>
            </div>
          </div>

          {/* Pillar 2: Vent */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center mb-3 border border-rose-100">
                <Wind className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">Vent Out</h3>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Raw expression canvas. Burn completely or transform into insight.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-[11px] font-medium text-rose-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Burn or transform</span>
            </div>
          </div>

          {/* Pillar 3: Talk */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center mb-3 border border-purple-100">
                <MessageCircleHeart className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">Talk</h3>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Multi-turn conversational reflections with "Don't Fix It" and Socratic modes.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-[11px] font-medium text-purple-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Empathetic dialogue</span>
            </div>
          </div>

          {/* Pillar 4: Reflect */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-9 w-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center mb-3 border border-stone-200">
                <Compass className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">Reflect & Grow</h3>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Pattern detector, Then vs. Now comparison, Future Letters, and Tiny Wins.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-[11px] font-medium text-stone-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Longitudinal growth</span>
            </div>
          </div>

        </div>

      </div>

      {/* Security & Privacy Banner Footer */}
      <footer className="bg-white border-t border-stone-200 py-5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-700" />
            <span>Zero Password Handling &bull; Private Subcollections &bull; Server-Side AI Fallback</span>
          </div>
          <div>
            <span>Aetheria &bull; A Private Space to Think Out Loud</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
