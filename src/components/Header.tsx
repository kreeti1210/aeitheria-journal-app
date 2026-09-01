import React from 'react';
import {
  Sparkles,
  LogOut,
  Plus,
  Heart,
  PenLine,
  Wind,
  MessageCircleHeart,
  Compass,
  Home,
  Archive
} from 'lucide-react';
import { UserProfile, AppView } from '../types';

interface HeaderProps {
  user: UserProfile | null;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onSignOut: () => void;
  onNewSession: () => void;
  onOpenCycleSettings: () => void;
  onToggleVault?: () => void;
  vaultCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentView,
  onNavigate,
  onSignOut,
  onNewSession,
  onOpenCycleSettings,
  onToggleVault,
  vaultCount,
}) => {
  return (
    <header id="app-header" className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="w-full h-16 flex items-center justify-between">
        
        {/* Brand Area: Aligned with the w-80 Left Sidebar on desktop */}
        <div className="flex items-center h-full px-4 sm:px-6 lg:w-80 lg:shrink-0 lg:border-r lg:border-stone-200">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-xs group-hover:bg-rose-950 transition-colors">
              <Sparkles className="h-4 w-4 text-rose-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-stone-900 text-base sm:text-lg">Aetheria</span>
                <span className="text-[10px] font-medium tracking-wide px-1.5 py-0.2 bg-rose-50 text-rose-800 rounded border border-rose-200">
                  Private
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Center Nav Tabs */}
        {user && (
          <nav className="hidden md:flex flex-1 items-center justify-center gap-1 px-4 text-xs">
            <button
              id="header-nav-home"
              onClick={() => onNavigate('home')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentView === 'home'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </button>

            <button
              id="header-nav-write"
              onClick={() => onNavigate('write')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentView === 'write'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <PenLine className="h-3.5 w-3.5" />
              <span>Write</span>
            </button>

            <button
              id="header-nav-vent"
              onClick={() => onNavigate('vent')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentView === 'vent'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Wind className="h-3.5 w-3.5" />
              <span>Vent</span>
            </button>

            <button
              id="header-nav-talk"
              onClick={() => onNavigate('talk')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentView === 'talk'
                  ? 'bg-purple-800 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <MessageCircleHeart className="h-3.5 w-3.5" />
              <span>Talk</span>
            </button>

            <button
              id="header-nav-reflect"
              onClick={() => onNavigate('reflect')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                currentView === 'reflect'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Reflect</span>
            </button>
          </nav>
        )}

        {/* Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6">
          
          {/* Responsive Vault Toggle on smaller screens (<lg) */}
          {user && onToggleVault && (
            <button
              id="btn-header-vault"
              onClick={onToggleVault}
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer border border-stone-200"
              title="Open Vault History"
            >
              <Archive className="h-3.5 w-3.5 text-stone-600" />
              <span>Vault</span>
              {vaultCount !== undefined && (
                <span className="px-1.5 py-0.2 bg-white text-stone-700 text-[10px] font-semibold rounded-full border border-stone-200">
                  {vaultCount}
                </span>
              )}
            </button>
          )}

          {/* Cycle Settings (Optional) */}
          {user && (
            <button
              id="btn-cycle-settings"
              onClick={onOpenCycleSettings}
              aria-label="Cycle-Aware Journaling Settings"
              title="Cycle-Aware Settings (Optional & Private)"
              className="p-2 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-stone-200 hover:border-rose-200"
            >
              <Heart className="h-4 w-4 text-rose-500" />
            </button>
          )}

          {/* Start New / Action */}
          {user && (
            <button
              id="btn-new-reflection"
              onClick={onNewSession}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 active:scale-98 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Thought</span>
              <span className="sm:hidden">New</span>
            </button>
          )}

          {user && (
            <div className="flex items-center pl-2 border-l border-stone-200 gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User Avatar'}
                    className="h-8 w-8 rounded-full border border-stone-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-rose-100 text-rose-900 flex items-center justify-center font-medium text-xs">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-medium text-stone-800 leading-tight truncate max-w-[120px]">
                    {user.displayName || 'Journaler'}
                  </p>
                </div>
              </div>

              <button
                id="btn-signout"
                onClick={onSignOut}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
