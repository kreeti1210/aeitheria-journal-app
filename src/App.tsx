import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from './firebase';
import { auth } from './firebase';
import {
  AppView,
  JournalInteraction,
  JournalEntry,
  VentSession,
  FutureLetter,
  TinyWin,
  CycleProfile,
  ChatMessage,
  ReflectionMode,
  SaveStatus,
  UserProfile,
  CycleContext
} from './types';
import {
  saveJournalInteraction,
  subscribeUserInteractions,
  deleteJournalInteraction,
  subscribeUserJournalEntries,
  saveJournalEntry,
  deleteJournalEntry,
  subscribeUserVentSessions,
  deleteVentSession,
  subscribeUserFutureLetters,
  subscribeUserTinyWins,
  subscribeUserCycleProfile,
  saveCycleProfile
} from './services/firestoreService';
import {
  sendReflectionPrompt,
  generateEntrySummary,
  generateAutoTitle
} from './services/geminiService';
import { Header } from './components/Header';
import { AuthLanding } from './components/AuthLanding';
import { HistorySidebar } from './components/HistorySidebar';
import { NavigationHome } from './components/NavigationHome';
import { ClassicJournalEditor } from './components/ClassicJournalEditor';
import { VentOutWorkspace } from './components/VentOutWorkspace';
import { ReflectionWorkspace } from './components/ReflectionWorkspace';
import { ReflectSuite } from './components/ReflectSuite';
import { CycleSettingsModal } from './components/CycleSettingsModal';

function createFreshInteraction(userId: string): JournalInteraction {
  const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    userId,
    title: 'Untitled Talk',
    initialPrompt: '',
    mode: 'reflection',
    tags: [],
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function createFreshJournalEntry(userId: string): JournalEntry {
  const id = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    userId,
    title: 'Daily Reflection',
    content: '',
    mood: 'Calm',
    tags: [],
    entryType: 'standard',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [isMobileVaultOpen, setIsMobileVaultOpen] = useState<boolean>(false);

  // Firestore Data State
  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [ventSessions, setVentSessions] = useState<VentSession[]>([]);
  const [futureLetters, setFutureLetters] = useState<FutureLetter[]>([]);
  const [tinyWins, setTinyWins] = useState<TinyWin[]>([]);
  const [cycleProfile, setCycleProfile] = useState<CycleProfile | null>(null);
  const [dbLoading, setDbLoading] = useState<boolean>(false);

  // Active Sessions
  const [activeInteraction, setActiveInteraction] = useState<JournalInteraction | null>(null);
  const [activeJournalEntry, setActiveJournalEntry] = useState<JournalEntry | null>(null);
  const [activeVentSession, setActiveVentSession] = useState<VentSession | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Modals
  const [isCycleModalOpen, setIsCycleModalOpen] = useState<boolean>(false);

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
        setInteractions([]);
        setJournalEntries([]);
        setVentSessions([]);
        setFutureLetters([]);
        setTinyWins([]);
        setCycleProfile(null);
        setActiveInteraction(null);
        setActiveJournalEntry(null);
        setActiveVentSession(null);
        setCurrentView('home');
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to user data collections
  useEffect(() => {
    if (!currentUser?.uid) return;

    setDbLoading(true);

    const unsubInteractions = subscribeUserInteractions(
      currentUser.uid,
      (items) => {
        setInteractions(items);
        setDbLoading(false);
      },
      (err) => console.error('Interactions sub error:', err)
    );

    const unsubJournals = subscribeUserJournalEntries(
      currentUser.uid,
      (items) => setJournalEntries(items),
      (err) => console.error('Journals sub error:', err)
    );

    const unsubVents = subscribeUserVentSessions(
      currentUser.uid,
      (items) => setVentSessions(items),
      (err) => console.error('Vents sub error:', err)
    );

    const unsubLetters = subscribeUserFutureLetters(
      currentUser.uid,
      (items) => setFutureLetters(items),
      (err) => console.error('Letters sub error:', err)
    );

    const unsubWins = subscribeUserTinyWins(
      currentUser.uid,
      (items) => setTinyWins(items),
      (err) => console.error('Wins sub error:', err)
    );

    const unsubCycle = subscribeUserCycleProfile(
      currentUser.uid,
      (profile) => setCycleProfile(profile),
      (err) => console.error('Cycle profile sub error:', err)
    );

    return () => {
      unsubInteractions();
      unsubJournals();
      unsubVents();
      unsubLetters();
      unsubWins();
      unsubCycle();
    };
  }, [currentUser?.uid]);

  // Compute Cycle Context
  const getCycleContext = (): CycleContext | undefined => {
    if (!cycleProfile || (!cycleProfile.optedIn && !cycleProfile.enabled)) {
      return undefined;
    }
    const lastDateStr = cycleProfile.lastPeriodStart || cycleProfile.lastPeriodDate;
    if (!lastDateStr) return undefined;
    const lastDate = new Date(lastDateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const cycleLength = cycleProfile.cycleLengthDays || 28;
    const currentDay = (diffDays % cycleLength) + 1;

    let currentPhase = 'Follicular';
    let emotionalNote = 'Rising energy and cognitive freshness.';

    if (currentDay <= (cycleProfile.periodLengthDays || 5)) {
      currentPhase = 'Menstrual';
      emotionalNote = 'Lower energy, introspective, gentle space needed.';
    } else if (currentDay >= 12 && currentDay <= 16) {
      currentPhase = 'Ovulatory';
      emotionalNote = 'High verbal fluency, communicative clarity, outward confidence.';
    } else if (currentDay > 16) {
      currentPhase = 'Luteal';
      emotionalNote = 'Inner critic may be louder, heightened sensitivity to friction, craving deep quiet.';
    }

    return {
      enabled: true,
      currentPhase,
      cycleDay: currentDay,
      emotionalNote,
    };
  };

  // Navigation handlers - always open fresh sessions on explicit navigation from Home/Header
  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    if (!currentUser) return;

    if (view === 'talk') {
      const fresh = createFreshInteraction(currentUser.uid);
      setActiveInteraction(fresh);
      setSaveStatus('idle');
      setSaveError(undefined);
    } else if (view === 'write') {
      const freshEntry = createFreshJournalEntry(currentUser.uid);
      setActiveJournalEntry(freshEntry);
      setSaveStatus('idle');
      setSaveError(undefined);
    } else if (view === 'vent') {
      setActiveVentSession(null);
    }
  };

  const handleStartNewSession = () => {
    if (!currentUser) return;
    if (currentView === 'write') {
      const newEntry = createFreshJournalEntry(currentUser.uid);
      setActiveJournalEntry(newEntry);
      setSaveStatus('idle');
      setSaveError(undefined);
    } else if (currentView === 'talk') {
      const fresh = createFreshInteraction(currentUser.uid);
      setActiveInteraction(fresh);
      setSaveStatus('idle');
      setSaveError(undefined);
    } else if (currentView === 'vent') {
      setActiveVentSession(null);
      setCurrentView('vent');
    } else {
      // Default: create a fresh talk session
      const fresh = createFreshInteraction(currentUser.uid);
      setActiveInteraction(fresh);
      setCurrentView('talk');
      setSaveStatus('idle');
      setSaveError(undefined);
    }
  };

  // Selecting items from history
  const handleSelectInteraction = (interaction: JournalInteraction) => {
    setActiveInteraction(interaction);
    setCurrentView('talk');
    setSaveStatus('saved');
    setSaveError(undefined);
  };

  const handleSelectJournalEntry = (entry: JournalEntry) => {
    setActiveJournalEntry(entry);
    setCurrentView('write');
    setSaveStatus('saved');
    setSaveError(undefined);
  };

  const handleSelectVentSession = (session: VentSession) => {
    setActiveVentSession(session);
    setCurrentView('vent');
  };

  // Talk: Send message
  const handleSendMessage = async (text: string, mode: ReflectionMode) => {
    if (!currentUser?.uid || !activeInteraction) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const isFirstMessage = activeInteraction.messages.length === 0;
    let updatedTitle = activeInteraction.title;
    if (
      (!updatedTitle || updatedTitle === 'Untitled Talk' || updatedTitle === 'Untitled Reflection') &&
      isFirstMessage
    ) {
      updatedTitle = text.slice(0, 42).trim() + (text.length > 42 ? '...' : '');
    }

    const optimisticMessages = [...activeInteraction.messages, userMessage];
    const optimisticSession: JournalInteraction = {
      ...activeInteraction,
      title: updatedTitle,
      mode,
      messages: optimisticMessages,
      updatedAt: Date.now(),
    };

    setActiveInteraction(optimisticSession);
    setIsGenerating(true);
    setSaveStatus('saving');

    // Asynchronously generate an intelligent, compassionate session title if first message
    if (isFirstMessage) {
      generateAutoTitle(text, 'talk').then((aiTitle) => {
        if (aiTitle && aiTitle.trim() && currentUser?.uid) {
          setActiveInteraction((prev) => {
            if (!prev || prev.id !== optimisticSession.id) return prev;
            const reTitled = { ...prev, title: aiTitle.trim() };
            saveJournalInteraction(currentUser.uid, reTitled);
            return reTitled;
          });
        }
      }).catch((err) => console.warn('Auto-title Talk notice:', err));
    }

    try {
      const cycleInfo = getCycleContext();
      const cycleContextStr = cycleInfo?.enabled
        ? `Day ${cycleInfo.cycleDay} (${cycleInfo.currentPhase} phase). Context note: ${cycleInfo.emotionalNote}`
        : undefined;

      const response = await sendReflectionPrompt({
        prompt: text,
        history: activeInteraction.messages,
        mode,
        journalContext: updatedTitle !== 'Untitled Talk' ? updatedTitle : '',
        cycleContext: cycleContextStr,
      });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: response.reply,
        timestamp: Date.now(),
        modelUsed: response.modelUsed,
      };

      const finalMessages = [...optimisticMessages, assistantMessage];
      const finalSession: JournalInteraction = {
        ...optimisticSession,
        messages: finalMessages,
        updatedAt: Date.now(),
      };

      setActiveInteraction(finalSession);
      const res = await saveJournalInteraction(currentUser.uid, finalSession);
      if (res.success) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
        setSaveError(res.error);
      }
    } catch (err: any) {
      console.error('AI Reflection Error:', err);
      setSaveStatus('error');
      setSaveError(err?.message || 'Error processing reflection.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Talk: Generate executive summary
  const handleGenerateSummary = async () => {
    if (!currentUser?.uid || !activeInteraction || activeInteraction.messages.length === 0) return;

    setIsGenerating(true);
    setSaveStatus('saving');

    try {
      const allText = activeInteraction.messages
        .map((m) => `${m.role === 'user' ? 'Me' : 'Companion'}: ${m.content}`)
        .join('\n\n');

      const summaryResult = await generateEntrySummary({
        content: allText,
        title: activeInteraction.title,
      });

      const updatedSession: JournalInteraction = {
        ...activeInteraction,
        summary: summaryResult.summary,
        updatedAt: Date.now(),
      };

      setActiveInteraction(updatedSession);
      const res = await saveJournalInteraction(currentUser.uid, updatedSession);
      if (res.success) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
        setSaveError(res.error);
      }
    } catch (err: any) {
      console.error('Summary Error:', err);
      setSaveStatus('error');
      setSaveError(err?.message || 'Failed to generate summary.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete handlers
  const handleDeleteInteraction = async (id: string) => {
    if (!currentUser?.uid) return;
    await deleteJournalInteraction(currentUser.uid, id);
    if (activeInteraction?.id === id) {
      const fresh = createFreshInteraction(currentUser.uid);
      setActiveInteraction(fresh);
      setSaveStatus('idle');
    }
  };

  const handleDeleteJournalEntry = async (id: string) => {
    if (!currentUser?.uid) return;
    await deleteJournalEntry(currentUser.uid, id);
    if (activeJournalEntry?.id === id) {
      const fresh = createFreshJournalEntry(currentUser.uid);
      setActiveJournalEntry(fresh);
      setSaveStatus('idle');
    }
  };

  const handleDeleteVentSession = async (id: string) => {
    if (!currentUser?.uid) return;
    await deleteVentSession(currentUser.uid, id);
    if (activeVentSession?.id === id) {
      setActiveVentSession(null);
    }
    // If currently viewing a journal that originated from this deleted vent, reset to fresh entry
    if (activeJournalEntry?.sourceVentId === id) {
      const fresh = createFreshJournalEntry(currentUser.uid);
      setActiveJournalEntry(fresh);
      setSaveStatus('idle');
      setSaveError(undefined);
    }
  };

  // Convert journal entry into a Talk session
  const handleReflectOnJournal = (entry: JournalEntry) => {
    if (!currentUser) return;
    const session = createFreshInteraction(currentUser.uid);
    session.title = `Reflection on "${entry.title || 'Journal'}"`;
    session.initialPrompt = entry.content;
    setActiveInteraction(session);
    setCurrentView('talk');
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-stone-600">Entering safe sanctuary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-stone-50 flex flex-col text-stone-900 font-sans antialiased selection:bg-rose-100 selection:text-rose-900 overflow-hidden">
      
      {/* Top Header */}
      <Header
        user={currentUser}
        currentView={currentView}
        onNavigate={handleNavigate}
        onSignOut={handleSignOut}
        onNewSession={handleStartNewSession}
        onOpenCycleSettings={() => setIsCycleModalOpen(true)}
        onToggleVault={() => setIsMobileVaultOpen((prev) => !prev)}
        vaultCount={interactions.length + journalEntries.length + ventSessions.length}
      />

      {/* Main Container */}
      {!currentUser ? (
        <AuthLanding />
      ) : (
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 w-full relative">
          
          {/* Desktop Left History Sidebar ("Wall Section") - Always visible on lg+ screens */}
          <div className="hidden lg:flex w-80 shrink-0 h-full border-r border-stone-200 bg-white">
            <HistorySidebar
              interactions={interactions}
              journalEntries={journalEntries}
              ventSessions={ventSessions}
              activeId={
                currentView === 'talk'
                  ? activeInteraction?.id || null
                  : currentView === 'write'
                  ? activeJournalEntry?.id || null
                  : currentView === 'vent'
                  ? activeVentSession?.id || null
                  : null
              }
              onSelectInteraction={handleSelectInteraction}
              onSelectJournalEntry={handleSelectJournalEntry}
              onSelectVentSession={handleSelectVentSession}
              onNewReflection={handleStartNewSession}
              onDeleteInteraction={handleDeleteInteraction}
              onDeleteJournalEntry={handleDeleteJournalEntry}
              onDeleteVentSession={handleDeleteVentSession}
              loading={dbLoading}
            />
          </div>

          {/* Mobile / Responsive Drawer for Vault ("Wall Section") - Opens when toggled on smaller screens */}
          {isMobileVaultOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex animate-fade-in">
              <div
                className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
                onClick={() => setIsMobileVaultOpen(false)}
                aria-hidden="true"
              />
              <div className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl z-10 flex flex-col">
                <HistorySidebar
                  interactions={interactions}
                  journalEntries={journalEntries}
                  ventSessions={ventSessions}
                  activeId={
                    currentView === 'talk'
                      ? activeInteraction?.id || null
                      : currentView === 'write'
                      ? activeJournalEntry?.id || null
                      : currentView === 'vent'
                      ? activeVentSession?.id || null
                      : null
                  }
                  onSelectInteraction={(item) => {
                    handleSelectInteraction(item);
                    setIsMobileVaultOpen(false);
                  }}
                  onSelectJournalEntry={(entry) => {
                    handleSelectJournalEntry(entry);
                    setIsMobileVaultOpen(false);
                  }}
                  onSelectVentSession={(session) => {
                    handleSelectVentSession(session);
                    setIsMobileVaultOpen(false);
                  }}
                  onNewReflection={() => {
                    handleStartNewSession();
                    setIsMobileVaultOpen(false);
                  }}
                  onDeleteInteraction={handleDeleteInteraction}
                  onDeleteJournalEntry={handleDeleteJournalEntry}
                  onDeleteVentSession={handleDeleteVentSession}
                  loading={dbLoading}
                  onClose={() => setIsMobileVaultOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Center / Right Dynamic View Area - Always 100% visible and accessible */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 w-full">
            
            {/* View 1: Navigation Home */}
            {currentView === 'home' && (
              <NavigationHome
                user={currentUser}
                onSelectMode={(mode) => handleNavigate(mode)}
                totalEntries={journalEntries.length + interactions.length}
                ventCount={ventSessions.length}
                totalTinyWins={tinyWins.length}
                cycleContext={getCycleContext()}
                onOpenCycleSettings={() => setIsCycleModalOpen(true)}
                onSaveQuickThought={async (thought) => {
                  const entry: JournalEntry = {
                    id: `entry_${Date.now()}_quick`,
                    userId: currentUser.uid,
                    title: 'Quick Capture',
                    content: thought,
                    tags: ['quick-capture'],
                    entryType: 'standard',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };
                  await saveJournalEntry(currentUser.uid, entry);
                }}
              />
            )}

            {/* View 2: Classic Journal Writer */}
            {currentView === 'write' && (
              <ClassicJournalEditor
                user={currentUser}
                currentEntry={activeJournalEntry || createFreshJournalEntry(currentUser.uid)}
                onUpdateEntry={(entry) => setActiveJournalEntry(entry)}
                onBackToHome={() => setCurrentView('home')}
                onReflectWithAI={handleReflectOnJournal}
                onDeleteEntry={handleDeleteJournalEntry}
                onOpenVentSession={(ventId) => {
                  const vs = ventSessions.find((v) => v.id === ventId);
                  if (vs) {
                    handleSelectVentSession(vs);
                  }
                }}
              />
            )}

            {/* View 3: Vent Out Workspace */}
            {currentView === 'vent' && (
              <VentOutWorkspace
                user={currentUser}
                activeVentSession={activeVentSession}
                onBackToHome={() => setCurrentView('home')}
                onVentBurned={() => {
                  setActiveVentSession(null);
                  setCurrentView('home');
                }}
                onTransformToJournal={(entry) => {
                  setActiveJournalEntry(entry);
                  setCurrentView('write');
                }}
                onDeleteVentSession={handleDeleteVentSession}
              />
            )}

            {/* View 4: Talk / Deep AI Dialogue */}
            {currentView === 'talk' && activeInteraction && (
              <ReflectionWorkspace
                currentInteraction={activeInteraction}
                user={currentUser}
                saveStatus={saveStatus}
                saveError={saveError}
                isGenerating={isGenerating}
                onSendMessage={handleSendMessage}
                onGenerateSummary={handleGenerateSummary}
                onUpdateMetadata={(updates) => {
                  const updated = { ...activeInteraction, ...updates, updatedAt: Date.now() };
                  setActiveInteraction(updated);
                  saveJournalInteraction(currentUser.uid, updated);
                }}
                onRetrySave={() => {
                  if (activeInteraction) {
                    saveJournalInteraction(currentUser.uid, activeInteraction);
                  }
                }}
                cycleContext={getCycleContext()}
              />
            )}

            {/* View 5: Growth & Reflection Suite */}
            {currentView === 'reflect' && (
              <ReflectSuite
                user={currentUser}
                journalEntries={journalEntries}
                talkInteractions={interactions}
                futureLetters={futureLetters}
                tinyWins={tinyWins}
                onBackToHome={() => setCurrentView('home')}
              />
            )}

          </div>

        </main>
      )}

      {/* Cycle Settings Modal */}
      {currentUser && (
        <CycleSettingsModal
          isOpen={isCycleModalOpen}
          onClose={() => setIsCycleModalOpen(false)}
          user={currentUser}
          profile={cycleProfile}
          onSaveProfile={async (profile) => {
            setCycleProfile(profile);
            await saveCycleProfile(currentUser.uid, profile);
          }}
          onProfileUpdated={(p) => setCycleProfile(p)}
        />
      )}

    </div>
  );
}
