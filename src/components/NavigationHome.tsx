import React from 'react';
import { PenLine, Wind, MessageCircleHeart, Compass, Sparkles, Heart, ArrowRight, ShieldCheck } from 'lucide-react';
import { AppView, UserProfile, CycleContext } from '../types';

interface NavigationHomeProps {
  user: UserProfile;
  onNavigate?: (view: AppView) => void;
  onSelectMode?: (view: AppView) => void;
  entryCount?: number;
  totalEntries?: number;
  ventCount?: number;
  tinyWinCount?: number;
  totalTinyWins?: number;
  cycleContext?: CycleContext;
  onOpenCycleSettings?: () => void;
  onSaveQuickThought?: (thought: string) => Promise<any>;
}

export const NavigationHome: React.FC<NavigationHomeProps> = ({
  user,
  onNavigate,
  onSelectMode,
  entryCount = 0,
  totalEntries,
  ventCount = 0,
  tinyWinCount = 0,
  totalTinyWins,
  cycleContext,
  onOpenCycleSettings,
}) => {
  const firstName = (user.displayName || 'Friend').split(' ')[0];
  const navigate = (view: AppView) => {
    if (onNavigate) onNavigate(view);
    if (onSelectMode) onSelectMode(view);
  };

  const finalEntryCount = totalEntries !== undefined ? totalEntries : entryCount;
  const finalWinCount = totalTinyWins !== undefined ? totalTinyWins : tinyWinCount;

  return (
    <div id="navigation-home" className="flex-1 min-h-0 overflow-y-auto bg-stone-50/70 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8 py-4">
        
        {/* Welcome Banner */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-800 text-xs font-medium tracking-wide">
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
            <span>A private space to think out loud</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold  text-stone-900">
            Welcome, {firstName}.
          </h1>
          <p className="text-sm sm:text-base text-stone-600 max-w-md mx-auto leading-relaxed">
            What do you need right now? Choose a space to write, release, talk, or look back.
          </p>

          {/* Gentle Cycle Rhythm Badge if active */}
          {cycleContext && cycleContext.enabled && (
            <div className="pt-1 flex justify-center">
              <button
                onClick={onOpenCycleSettings}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200/60 text-purple-900 text-xs font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span>Day {cycleContext.cycleDay} &bull; {cycleContext.currentPhase} Phase</span>
                <span className="text-[11px] text-purple-700 hidden sm:inline">&mdash; {cycleContext.emotionalNote}</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Core Gateways Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2">
          
          {/* 1. WRITE */}
          <button
            id="card-nav-write"
            onClick={() => navigate('write')}
            className="group relative text-left bg-white/95 border border-stone-200 hover:border-emerald-400/80 hover:shadow-md rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                <PenLine className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-900 transition-colors">
                  Write
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
                  Capture thoughts, structured reflections, daily moments, and clear ideas in a calm, private editor.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-emerald-800">
              <span>Open journal</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* 2. VENT */}
          <button
            id="card-nav-vent"
            onClick={() => navigate('vent')}
            className="group relative text-left bg-white/95 border border-stone-200 hover:border-rose-300 hover:shadow-md rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 group-hover:scale-105 transition-transform">
                <Wind className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-stone-900 group-hover:text-rose-900 transition-colors">
                    Vent Out
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-rose-100/70 text-rose-800 rounded-full">
                    Voice & Text
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
                  Let everything out without filtering. Speak or type freely, then decide whether to let it vanish or explore the feelings underneath.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-rose-800">
              <span>Start venting</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* 3. TALK */}
          <button
            id="card-nav-talk"
            onClick={() => navigate('talk')}
            className="group relative text-left bg-white/95 border border-stone-200 hover:border-purple-300 hover:shadow-md rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
                <MessageCircleHeart className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-stone-900 group-hover:text-purple-900 transition-colors">
                    Talk Out Loud
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-purple-100/70 text-purple-800 rounded-full">
                    "Don't Fix It" Modes
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
                  Converse with a thoughtful companion who can just listen, help you untangle tangled emotions, or brainstorm next steps.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-purple-800">
              <span>Begin dialogue</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* 4. REFLECT */}
          <button
            id="card-nav-reflect"
            onClick={() => navigate('reflect')}
            className="group relative text-left bg-white/95 border border-stone-200 hover:border-stone-400 hover:shadow-md rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center border border-stone-200 group-hover:scale-105 transition-transform">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 group-hover:text-stone-900 transition-colors">
                  Reflect & Grow
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
                  Notice recurring patterns, compare "Then Me vs Now Me", read letters to your future self, and celebrate tiny courageous wins.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-stone-800">
              <span>Explore retrospectives</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        {/* Quiet Footnote / Privacy Affirmation */}
        <div className="bg-stone-100/80 rounded-xl p-4 flex items-center justify-between text-xs text-stone-500 border border-stone-200/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span>Everything you write is privately stored strictly in your personal account. No raw audio is recorded.</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-stone-400 text-[11px]">
            <span>{finalEntryCount} Journal Entries</span>
            <span>&bull;</span>
            <span>{ventCount} Saved Vents</span>
            <span>&bull;</span>
            <span>{finalWinCount} Tiny Wins</span>
          </div>
        </div>

      </div>
    </div>
  );
};
