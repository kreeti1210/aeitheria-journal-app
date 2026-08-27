import React, { useState } from 'react';
import Markdown from 'react-markdown';
import {
  Compass,
  Sparkles,
  GitCompare,
  History,
  Mail,
  Award,
  Plus,
  Trash2,
  Calendar,
  Lock,
  Unlock,
  Loader2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Smile,
  Heart
} from 'lucide-react';
import {
  JournalEntry,
  JournalInteraction,
  FutureLetter,
  TinyWin,
  PatternInsight,
  UserProfile
} from '../types';
import {
  generatePatternInsights,
  compareGrowthMoments,
  generateLookBackRetrospective
} from '../services/geminiService';
import {
  saveFutureLetter,
  deleteFutureLetter,
  saveTinyWin,
  deleteTinyWin,
  savePatternInsight
} from '../services/firestoreService';

interface ReflectSuiteProps {
  user: UserProfile;
  journalEntries: JournalEntry[];
  talkInteractions?: JournalInteraction[];
  futureLetters: FutureLetter[];
  tinyWins: TinyWin[];
  patternInsights?: PatternInsight[];
  onBackToHome: () => void;
  onSelectJournalEntry?: (entry: JournalEntry) => void;
}

type ReflectTab = 'patterns' | 'then_now' | 'look_back' | 'future_letters' | 'tiny_wins';

export const ReflectSuite: React.FC<ReflectSuiteProps> = ({
  user,
  journalEntries,
  talkInteractions = [],
  futureLetters,
  tinyWins,
  patternInsights = [],
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<ReflectTab>('patterns');

  // Patterns state
  const [isScanningPatterns, setIsScanningPatterns] = useState(false);
  const [patternStatusMessage, setPatternStatusMessage] = useState<string | null>(null);

  // Then vs Now state
  const [thenEntryId, setThenEntryId] = useState<string>('');
  const [nowEntryId, setNowEntryId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Look Back Retrospective state
  const [retrospective, setRetrospective] = useState<string | null>(null);
  const [isGeneratingRetro, setIsGeneratingRetro] = useState(false);
  const [timeframe, setTimeframe] = useState('Past month');

  // Letters to Future Me state
  const [newLetterTitle, setNewLetterTitle] = useState('');
  const [newLetterContent, setNewLetterContent] = useState('');
  const [newLetterDays, setNewLetterDays] = useState<number>(30);
  const [isWritingLetter, setIsWritingLetter] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<FutureLetter | null>(null);

  // Tiny Wins state
  const [newWinText, setNewWinText] = useState('');
  const [newWinFeeling, setNewWinFeeling] = useState('Courageous');

  // Action: Scan Patterns
  const handleScanPatterns = async () => {
    if (journalEntries.length < 2) {
      setPatternStatusMessage('Write at least 2 journal entries to observe meaningful recurring patterns.');
      return;
    }

    setIsScanningPatterns(true);
    setPatternStatusMessage(null);

    try {
      const snippets = journalEntries.map(
        (e) => `[${new Date(e.createdAt).toLocaleDateString()} - ${e.title}]: ${e.content.slice(0, 400)}`
      );
      const res = await generatePatternInsights(snippets);

      if (res.patterns && res.patterns.length > 0) {
        for (const p of res.patterns) {
          const insight: PatternInsight = {
            id: `pat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: user.uid,
            theme: p.theme || 'Recurring Theme',
            observation: p.observation,
            sampleCount: p.sampleCount || 2,
            status: 'active',
            createdAt: Date.now(),
          };
          await savePatternInsight(user.uid, insight);
        }
      } else {
        setPatternStatusMessage(res.message || 'No obvious repeating patterns observed yet. Keep writing authentically.');
      }
    } catch (err: any) {
      setPatternStatusMessage('Unable to scan patterns right now. Please try again.');
    } finally {
      setIsScanningPatterns(false);
    }
  };

  // Action: Compare Then vs Now
  const handleCompareThenNow = async () => {
    const thenEntry = journalEntries.find((e) => e.id === thenEntryId);
    const nowEntry = journalEntries.find((e) => e.id === nowEntryId);

    if (!thenEntry || !nowEntry) return;

    setIsComparing(true);
    setComparisonResult(null);

    try {
      const res = await compareGrowthMoments({
        thenText: thenEntry.content,
        nowText: nowEntry.content,
        thenDate: new Date(thenEntry.createdAt).toLocaleDateString(),
        nowDate: new Date(nowEntry.createdAt).toLocaleDateString(),
      });
      setComparisonResult(res.comparison);
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setIsComparing(false);
    }
  };

  // Action: Generate Look Back
  const handleGenerateLookBack = async () => {
    if (journalEntries.length === 0) return;
    setIsGeneratingRetro(true);
    try {
      const compiled = journalEntries
        .slice(0, 10)
        .map((e) => `Entry (${new Date(e.createdAt).toLocaleDateString()}): ${e.title}\n${e.content}`)
        .join('\n\n---\n\n');
      const res = await generateLookBackRetrospective(compiled, timeframe);
      setRetrospective(res.synthesis);
    } catch (err) {
      console.error('Retrospective generation failed:', err);
    } finally {
      setIsGeneratingRetro(false);
    }
  };

  // Action: Save Future Letter
  const handleSaveFutureLetter = async () => {
    if (!newLetterContent.trim()) return;

    const deliverAt = Date.now() + newLetterDays * 24 * 60 * 60 * 1000;
    const letter: FutureLetter = {
      id: `letter_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.uid,
      title: newLetterTitle.trim() || `Letter to Future Me (${newLetterDays} days)`,
      content: newLetterContent.trim(),
      deliverAt,
      isRead: false,
      createdAt: Date.now(),
    };

    await saveFutureLetter(user.uid, letter);
    setNewLetterTitle('');
    setNewLetterContent('');
    setIsWritingLetter(false);
  };

  // Action: Save Tiny Win
  const handleSaveTinyWin = async () => {
    if (!newWinText.trim()) return;

    const win: TinyWin = {
      id: `win_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.uid,
      text: newWinText.trim(),
      feeling: newWinFeeling,
      createdAt: Date.now(),
    };

    await saveTinyWin(user.uid, win);
    setNewWinText('');
  };

  return (
    <div id="reflect-suite" className="flex-1 flex flex-col h-full bg-stone-50 overflow-hidden">
      
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            title="Back to home"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-stone-900">
                Reflect & Retrospect
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md">
                Growth Insights
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              Notice patterns, celebrate quiet resilience, and track your unfolding journey.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'patterns'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Patterns
          </button>
          <button
            onClick={() => setActiveTab('then_now')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'then_now'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Then vs Now
          </button>
          <button
            onClick={() => setActiveTab('look_back')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'look_back'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Look Back
          </button>
          <button
            onClick={() => setActiveTab('future_letters')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'future_letters'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Future Letters ({futureLetters.length})
          </button>
          <button
            onClick={() => setActiveTab('tiny_wins')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tiny_wins'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Tiny Wins ({tinyWins.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 w-full">
        <div className="max-w-4xl mx-auto space-y-6 pb-8">
        
        {/* ================= TAB 1: PATTERNS I'VE NOTICED ================= */}
        {activeTab === 'patterns' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <Compass className="h-4 w-4 text-purple-700" />
                  <span>Patterns I've Noticed</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Recurring emotional themes and energy cycles observed from your journal entries.
                </p>
              </div>
              <button
                onClick={handleScanPatterns}
                disabled={isScanningPatterns || journalEntries.length < 2}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-purple-800 hover:bg-purple-900 text-white text-xs font-medium rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                {isScanningPatterns ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>{isScanningPatterns ? 'Scanning entries...' : 'Scan for Patterns'}</span>
              </button>
            </div>

            {patternStatusMessage && (
              <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-600">
                {patternStatusMessage}
              </div>
            )}

            {/* Patterns list */}
            {patternInsights.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-2">
                <Compass className="h-8 w-8 text-stone-300 mx-auto" />
                <h4 className="text-sm font-semibold text-stone-700">No patterns recorded yet</h4>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  As you write more entries, you can scan for gentle observations about work, rest, and relationships.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {patternInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-900 px-2 py-0.5 bg-purple-50 rounded-md">
                        {insight.theme}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(insight.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-stone-800 leading-relaxed">
                      {insight.observation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: THEN ME VS NOW ME ================= */}
        {activeTab === 'then_now' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-emerald-800" />
                  <span>Then Me vs Now Me</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Select two moments in time to observe your evolving perspective and resilience.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    "Then Me" (Past Entry)
                  </label>
                  <select
                    value={thenEntryId}
                    onChange={(e) => setThenEntryId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">Select past journal entry...</option>
                    {journalEntries.map((e) => (
                      <option key={e.id} value={e.id}>
                        {new Date(e.createdAt).toLocaleDateString()} - {e.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    "Now Me" (Recent Entry)
                  </label>
                  <select
                    value={nowEntryId}
                    onChange={(e) => setNowEntryId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">Select current journal entry...</option>
                    {journalEntries.map((e) => (
                      <option key={e.id} value={e.id}>
                        {new Date(e.createdAt).toLocaleDateString()} - {e.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCompareThenNow}
                  disabled={!thenEntryId || !nowEntryId || isComparing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {isComparing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  <span>{isComparing ? 'Comparing shifts...' : 'Generate Growth Comparison'}</span>
                </button>
              </div>
            </div>

            {/* Comparison Output */}
            {comparisonResult && (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3 animate-fade-in">
                <h4 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-2">
                  Growth & Perspective Synthesis
                </h4>
                <div className="markdown-body text-xs sm:text-sm text-stone-800 leading-relaxed space-y-3">
                  <Markdown>{comparisonResult}</Markdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: LOOK BACK AT ME ================= */}
        {activeTab === 'look_back' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <History className="h-4 w-4 text-amber-700" />
                  <span>Look Back at Me</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Synthesize the core themes, challenges overcome, and recurring questions across your entries.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none"
                >
                  <option value="Past 2 weeks">Past 2 weeks</option>
                  <option value="Past month">Past month</option>
                  <option value="Past quarter">Past quarter</option>
                  <option value="All journal entries">All entries</option>
                </select>

                <button
                  onClick={handleGenerateLookBack}
                  disabled={isGeneratingRetro || journalEntries.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {isGeneratingRetro ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  <span>{isGeneratingRetro ? 'Synthesizing...' : 'Generate Retrospective'}</span>
                </button>
              </div>
            </div>

            {retrospective && (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3 animate-fade-in">
                <h4 className="text-sm font-semibold text-stone-900 border-b border-stone-100 pb-2">
                  {timeframe} Retrospective
                </h4>
                <div className="markdown-body text-xs sm:text-sm text-stone-800 leading-relaxed space-y-3">
                  <Markdown>{retrospective}</Markdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: LETTERS TO FUTURE ME ================= */}
        {activeTab === 'future_letters' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-rose-600" />
                  <span>Letters to Future Me</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Write messages, reminders, or questions to be unlocked on a future date.
                </p>
              </div>

              {!isWritingLetter && (
                <button
                  onClick={() => setIsWritingLetter(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium rounded-xl shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Write New Letter</span>
                </button>
              )}
            </div>

            {/* Letter composer form */}
            {isWritingLetter && (
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 animate-fade-in">
                <input
                  type="text"
                  placeholder="Letter Title (e.g., Remember how brave you were today)..."
                  value={newLetterTitle}
                  onChange={(e) => setNewLetterTitle(e.target.value)}
                  className="w-full text-sm font-semibold p-2 border-b border-stone-200 focus:outline-none focus:border-rose-400"
                />

                <textarea
                  rows={4}
                  placeholder="Dear Future Me..."
                  value={newLetterContent}
                  onChange={(e) => setNewLetterContent(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-stone-50 border border-stone-200 rounded-xl resize-none focus:outline-none focus:border-rose-300"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    <span>Unlock in:</span>
                    <select
                      value={newLetterDays}
                      onChange={(e) => setNewLetterDays(Number(e.target.value))}
                      className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                    >
                      <option value={7}>7 Days (Next week)</option>
                      <option value={30}>30 Days (Next month)</option>
                      <option value={90}>90 Days (3 months)</option>
                      <option value={180}>6 Months</option>
                      <option value={365}>1 Year</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsWritingLetter(false)}
                      className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveFutureLetter}
                      disabled={!newLetterContent.trim()}
                      className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium rounded-xl shadow-xs cursor-pointer disabled:opacity-40"
                    >
                      Seal Letter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Letter Cards Grid */}
            {futureLetters.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-2">
                <Mail className="h-8 w-8 text-stone-300 mx-auto" />
                <h4 className="text-sm font-semibold text-stone-700">No sealed letters</h4>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Write a kind note or reminder to your future self. It will remain quietly sealed until the date arrives.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {futureLetters.map((letter) => {
                  const isLocked = Date.now() < letter.deliverAt;
                  const deliverDateStr = new Date(letter.deliverAt).toLocaleDateString();

                  return (
                    <div
                      key={letter.id}
                      onClick={() => setSelectedLetter(letter)}
                      className="p-4 bg-white border border-stone-200 hover:border-rose-300 rounded-2xl shadow-xs cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] ${
                            isLocked ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                            <span>{isLocked ? `Sealed until ${deliverDateStr}` : 'Ready to Open'}</span>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFutureLetter(user.uid, letter.id);
                            }}
                            className="text-stone-300 hover:text-red-500 transition-colors"
                            title="Delete letter"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <h4 className="text-sm font-semibold text-stone-900 truncate">
                          {letter.title}
                        </h4>
                        <p className="text-xs text-stone-400">
                          Written on {new Date(letter.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Letter Viewer Modal if clicked */}
            {selectedLetter && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-scale-up">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-bold text-stone-900 text-base">
                      {selectedLetter.title}
                    </h3>
                    <button
                      onClick={() => setSelectedLetter(null)}
                      className="text-stone-400 hover:text-stone-700 text-sm font-bold"
                    >
                      &times;
                    </button>
                  </div>
                  <p className="text-xs text-stone-400">
                    Written {new Date(selectedLetter.createdAt).toLocaleDateString()} &bull; Deliver date: {new Date(selectedLetter.deliverAt).toLocaleDateString()}
                  </p>
                  <div className="p-4 bg-stone-50 rounded-xl text-xs sm:text-sm text-stone-800 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                    {selectedLetter.content}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setSelectedLetter(null)}
                      className="px-4 py-1.5 bg-stone-900 text-white text-xs font-medium rounded-xl cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: TINY WINS ================= */}
        {activeTab === 'tiny_wins' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-700" />
                  <span>Tiny Wins</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Small moments of emotional courage, quiet boundaries held, or tiny steps taken today.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  placeholder="What is one tiny win you accomplished today?"
                  value={newWinText}
                  onChange={(e) => setNewWinText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTinyWin()}
                  className="flex-1 text-xs sm:text-sm p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-600"
                />

                <select
                  value={newWinFeeling}
                  onChange={(e) => setNewWinFeeling(e.target.value)}
                  className="text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                >
                  <option value="Courageous">Courageous</option>
                  <option value="Peaceful">Peaceful</option>
                  <option value="Grounded">Grounded</option>
                  <option value="Relieved">Relieved</option>
                  <option value="Proud">Proud</option>
                </select>

                <button
                  onClick={handleSaveTinyWin}
                  disabled={!newWinText.trim()}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  Add Win
                </button>
              </div>
            </div>

            {/* Wins list */}
            {tinyWins.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-2">
                <Award className="h-8 w-8 text-stone-300 mx-auto" />
                <h4 className="text-sm font-semibold text-stone-700">No tiny wins logged yet</h4>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Even drinking a glass of water, resting when tired, or saying "no" to an overwhelming task is a victory.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tinyWins.map((win) => (
                  <div
                    key={win.id}
                    className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-xs flex items-center justify-between gap-3 hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-stone-900">
                          {win.text}
                        </p>
                        <span className="text-[10px] text-stone-400 flex items-center gap-1.5">
                          <span>{new Date(win.createdAt).toLocaleDateString()}</span>
                          {win.feeling && (
                            <>
                              <span>&bull;</span>
                              <span className="text-emerald-700 font-medium">{win.feeling}</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTinyWin(user.uid, win.id)}
                      className="text-stone-300 hover:text-red-500 transition-colors p-1"
                      title="Remove win"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        </div>
      </div>
    </div>
  );
};
