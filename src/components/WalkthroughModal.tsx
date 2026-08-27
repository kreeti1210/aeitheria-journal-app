import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Square,
  Shield,
  Layers,
  Database,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Terminal,
  Heart,
  Wind,
  PenLine,
  Compass,
  Lock
} from 'lucide-react';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestCase {
  id: string;
  category: string;
  title: string;
  steps: string[];
  expectedResult: string;
  threatZone: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'TC-AUTH-01',
    category: '1. Identity & Auth',
    title: 'Google Sign-In & Session Isolation',
    steps: [
      'Navigate to the landing page and click "Sign in with Google" (ID: btn-google-signin).',
      'Complete authentication via Google Identity popup.',
      'Verify redirection to private dashboard and display of user avatar and name in header.'
    ],
    expectedResult: 'Firebase auth state resolves user UID; user-isolated Firestore queries initialize.',
    threatZone: 'Input Surfaces & Identity'
  },
  {
    id: 'TC-AUTH-02',
    category: '1. Identity & Auth',
    title: 'Session Teardown & Sign Out',
    steps: [
      'Click the sign-out icon in the top header (ID: btn-signout).',
      'Verify session is destroyed and landing view returns.'
    ],
    expectedResult: 'Firebase Auth token invalidated, private state wiped from memory.',
    threatZone: 'Memory & State'
  },
  {
    id: 'TC-WRITE-01',
    category: '2. Private Writing',
    title: 'Classic Journaling & Real-Time Autosave',
    steps: [
      'Select "Write" mode from the navigation or home hub.',
      'Enter an entry title, select a mood (e.g. Calm), add tags (#reflection), and compose text.',
      'Verify status changes from "Saving..." to "Saved" in the top bar.'
    ],
    expectedResult: 'Document persists to `/users/{uid}/journalEntries/{id}` with sanitized zero-undefined payload.',
    threatZone: 'Memory & State'
  },
  {
    id: 'TC-VENT-01',
    category: '3. Vent Out & Raw Emotions',
    title: 'Ephemeral Burn Decision',
    steps: [
      'Navigate to "Vent" mode (ID: header-nav-vent).',
      'Type unfiltered emotional thoughts or use voice dictation.',
      'Click "Burn & Let Go" (ID: btn-vent-burn).',
      'Confirm the burn dialog animation.'
    ],
    expectedResult: 'Text is zeroized and completely removed from memory without writing to database.',
    threatZone: 'Input Surfaces'
  },
  {
    id: 'TC-VENT-02',
    category: '3. Vent Out & Raw Emotions',
    title: 'Vent Transformation & Emotional Exploration',
    steps: [
      'Write raw thoughts in Vent Out canvas.',
      'Click "Explore Feelings" to detect root feelings, cognitive distortions, and hidden needs.',
      'Click "Transform" to generate constructive insight and save to journal.'
    ],
    expectedResult: 'AI processes raw text and produces structured emotional breakdown.',
    threatZone: 'Tool & API Execution'
  },
  {
    id: 'TC-TALK-01',
    category: '4. Talk & Multi-Turn Reflection',
    title: 'Multi-Turn Conversational Modes',
    steps: [
      'Navigate to "Talk" mode (ID: header-nav-talk).',
      'Select cognitive mode: "Listen & Hold Space", "Socratic", "Cognitive Reframe", or "Brainstorm".',
      'Send a query and verify AI adapts its tone and structure cleanly.'
    ],
    expectedResult: 'Server routes prompt through resilient Gemini fallback ladder and renders clean markdown.',
    threatZone: 'Planning & Reasoning'
  },
  {
    id: 'TC-TALK-02',
    category: '4. Talk & Multi-Turn Reflection',
    title: 'Executive Session Synthesis',
    steps: [
      'In a Talk session with at least 1 turn, click "Executive Summary" (ID: btn-summarize).',
      'Verify structured synthesis is generated and saved to Firestore.'
    ],
    expectedResult: 'Synthesis is embedded in the conversation document in Firestore.',
    threatZone: 'Output Handling'
  },
  {
    id: 'TC-GROWTH-01',
    category: '5. Growth & Reflection Suite',
    title: 'Emotional Pattern Analysis & Then vs Now Comparison',
    steps: [
      'Navigate to "Reflect" mode (ID: header-nav-reflect).',
      'Click "Analyze My Patterns" in the Patterns tab.',
      'Switch to "Then vs. Now" tab and click "Compare Growth".'
    ],
    expectedResult: 'AI synthesizes past journal entries and presents recurring themes and growth metrics.',
    threatZone: 'Planning & Reasoning'
  },
  {
    id: 'TC-GROWTH-02',
    category: '5. Growth & Reflection Suite',
    title: 'Future Letters & Tiny Wins Capsule',
    steps: [
      'In the Reflect suite, open "Future Letters" tab and create a time-locked letter with an unlock date.',
      'Open "Tiny Wins" tab and log a micro-achievement.'
    ],
    expectedResult: 'Letter is locked until unlock timestamp; Tiny Win increments counter and saves to Firestore.',
    threatZone: 'Memory & State'
  },
  {
    id: 'TC-CYCLE-01',
    category: '6. Cycle-Aware Support (Privacy-First)',
    title: 'Cycle Context Adaptation & Settings',
    steps: [
      'Click the Heart icon in the header (ID: btn-cycle-settings).',
      'Enable cycle-aware support, set cycle length, and save profile.',
      'Send a reflection prompt in Talk mode.'
    ],
    expectedResult: 'AI subtly adapts empathy tone to biological cycle phase without unsolicited medical advice.',
    threatZone: 'Input Surfaces & Privacy'
  },
  {
    id: 'TC-SEC-01',
    category: '7. Firestore Security & Zero Secrets',
    title: 'Owner-Bound Access Rules & Environment API Key',
    steps: [
      'Verify `firestore.rules` enforces `request.auth.uid == userId` across all subcollections.',
      'Verify Gemini API key is accessed strictly server-side via `process.env.GEMINI_API_KEY`.'
    ],
    expectedResult: 'Unauthorized cross-user database requests rejected with PERMISSION_DENIED; zero secrets in frontend.',
    threatZone: 'Broken Access Control & Token Leakage'
  }
];

export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({ isOpen, onClose }) => {
  const [completedTests, setCompletedTests] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleTest = (id: string) => {
    setCompletedTests((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const completedCount = Object.values(completedTests).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / TEST_CASES.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-stone-900 text-white flex items-center justify-center">
              <Shield className="h-5 w-5 text-rose-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Functional Stability Walkthrough & Test Suite</h2>
              <p className="text-xs text-stone-500">Comprehensive verification matrix covering all user flows and security boundaries</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700">Verification Progress:</span>
            <span className="px-2 py-0.5 bg-rose-50 text-rose-900 font-bold rounded-md border border-rose-200">
              {completedCount} / {TEST_CASES.length} Tests Checked ({progressPercent}%)
            </span>
          </div>

          <div className="w-48 bg-stone-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-rose-700 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Architecture & Threat Model Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                <Cpu className="h-4 w-4 text-emerald-800" />
                <span>Multi-Model AI Ladder</span>
              </div>
              <p className="text-stone-500 text-[11px] leading-relaxed">
                Automated multi-stage retry ladder with fallback fault tolerance.
              </p>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                <Database className="h-4 w-4 text-rose-700" />
                <span>Owner-Bound Firestore</span>
              </div>
              <p className="text-stone-500 text-[11px] leading-relaxed">
                Rules strictly enforce <code className="bg-stone-100 px-1 py-0.5 rounded">request.auth.uid == userId</code>.
              </p>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                <Lock className="h-4 w-4 text-purple-700" />
                <span>Zero Hardcoded Secrets</span>
              </div>
              <p className="text-stone-500 text-[11px] leading-relaxed">
                Environment-injected server proxy; zero client-side API key exposure.
              </p>
            </div>
          </div>

          {/* Test Case List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Interactive Test Walkthrough Checklist
            </h3>

            <div className="space-y-3">
              {TEST_CASES.map((tc) => {
                const isDone = !!completedTests[tc.id];

                return (
                  <div
                    key={tc.id}
                    onClick={() => toggleTest(tc.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isDone
                        ? 'bg-rose-50/40 border-rose-200 text-stone-800'
                        : 'bg-white border-stone-200 hover:border-stone-300 text-stone-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button className="mt-0.5 shrink-0 text-stone-400 hover:text-rose-700">
                          {isDone ? (
                            <CheckSquare className="h-5 w-5 text-rose-700" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-stone-100 rounded text-stone-600">
                              {tc.id}
                            </span>
                            <span className="text-xs font-bold text-stone-900">{tc.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-medium">
                              {tc.category}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                              Zone: {tc.threatZone}
                            </span>
                          </div>

                          {/* Steps */}
                          <div className="text-xs text-stone-600 space-y-1 pl-1 pt-1">
                            <p className="font-medium text-stone-700">Steps to Execute:</p>
                            <ol className="list-decimal list-inside space-y-0.5 text-stone-600">
                              {tc.steps.map((s, idx) => (
                                <li key={idx} className="leading-relaxed">{s}</li>
                              ))}
                            </ol>
                          </div>

                          {/* Expected Result */}
                          <div className="mt-2 text-xs bg-stone-50 p-2 rounded-lg border border-stone-100">
                            <span className="font-semibold text-stone-700">Expected Result: </span>
                            <span className="text-stone-600">{tc.expectedResult}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs">
          <span className="text-stone-500">
            All interactive elements instrumented with deterministic HTML IDs for automated headless testing.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl transition-all cursor-pointer"
          >
            Close Walkthrough
          </button>
        </div>

      </div>
    </div>
  );
};
