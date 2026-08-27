import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  Mic,
  MicOff,
  Trash2,
  Lock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  FileText,
  Mail,
  MailWarning,
  ListTodo,
  FileQuestion,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Edit3,
  HeartHandshake,
  Wind,
  X
} from 'lucide-react';
import { VentSession, EmotionPossibility, JournalEntry, UserProfile } from '../types';
import { exploreVentEmotions, transformVentContent, generateAutoTitle } from '../services/geminiService';
import { saveVentSession, saveJournalEntry } from '../services/firestoreService';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface VentOutWorkspaceProps {
  user: UserProfile;
  activeVentSession?: VentSession | null;
  onBackToHome: () => void;
  onSavedToJournal?: (entry: JournalEntry) => void;
  onTransformToJournal?: (entry: JournalEntry) => void;
  onVentBurned?: () => void;
  onDeleteVentSession?: (id: string) => Promise<void>;
}

type VentState = 'drafting' | 'deciding' | 'exploring_emotions' | 'transforming' | 'disappeared' | 'saved_privately';

export const VentOutWorkspace: React.FC<VentOutWorkspaceProps> = ({
  user,
  activeVentSession,
  onBackToHome,
  onSavedToJournal,
  onTransformToJournal,
  onVentBurned,
  onDeleteVentSession,
}) => {
  const [text, setText] = useState(activeVentSession?.content || '');
  const [savedSessionId, setSavedSessionId] = useState<string | null>(activeVentSession?.id || null);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [ventState, setVentState] = useState<VentState>(activeVentSession ? 'deciding' : 'drafting');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exploredEmotions, setExploredEmotions] = useState<EmotionPossibility[]>([]);
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<string[]>([]);
  const [transformedOutput, setTransformedOutput] = useState<string>('');
  const [transformType, setTransformType] = useState<'journal' | 'letter_self' | 'letter_unsent' | 'problem_statement' | 'action_plan'>('journal');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeVentSession) {
      setText(activeVentSession.content);
      setSavedSessionId(activeVentSession.id);
      setVentState('deciding');
      setIsExpanded(false);
    } else {
      setText('');
      setSavedSessionId(null);
      setVentState('drafting');
      setExploredEmotions([]);
      setSelectedEmotionIds([]);
      setTransformedOutput('');
      setIsExpanded(false);
      setStatusMessage(null);
    }
  }, [activeVentSession]);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setText((prev) => (prev ? `${prev} ${finalTranscript.trim()}` : finalTranscript.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError('Microphone permission was not granted by your browser. Click the lock/tune icon in your browser URL address bar to allow microphone access, or open the app in a new tab.');
          setIsRecording(false);
        } else if (event.error === 'no-speech') {
          // No speech detected, ignore silently
        } else {
          setSpeechError(`Speech recognition error: ${event.error}. You can continue typing.`);
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleRecording = async () => {
    if (!recognitionRef.current) {
      setSpeechError('Speech recognition is not supported in this browser.');
      return;
    }

    setSpeechError(null);
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        // Explicitly request microphone stream if supported
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Release the temporary stream tracks
            stream.getTracks().forEach((track) => track.stop());
          } catch (mediaErr: any) {
            console.warn('Microphone permission request result:', mediaErr);
            if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
              setSpeechError('Microphone access was denied. Please allow microphone access in your browser site permissions (or open the app in a new tab) to use Voice Out.');
              return;
            }
          }
        }

        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err: any) {
        console.error('Recording start error:', err);
        setSpeechError('Unable to start speech recognition. Please check your microphone permissions or continue typing.');
      }
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  // Decision 1: Let it disappear completely
  const handleLetItDisappear = async () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    const idToDelete = savedSessionId || activeVentSession?.id;
    if (idToDelete && onDeleteVentSession) {
      await onDeleteVentSession(idToDelete);
    }
    setText('');
    setSavedSessionId(null);
    setVentState('disappeared');
    if (onVentBurned) onVentBurned();
  };

  // Decision 2: Keep it privately (Save raw vent, reusing id if already existing)
  const handleKeepPrivately = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    const idToUse = savedSessionId || activeVentSession?.id || `vent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const session: VentSession = {
      id: idToUse,
      userId: user.uid,
      content: text.trim(),
      wordCount,
      createdAt: activeVentSession?.createdAt || Date.now(),
    };

    await saveVentSession(user.uid, session);
    setSavedSessionId(idToUse);
    setIsLoading(false);
    setVentState('saved_privately');
  };

  // Decision 3: Explore underlying emotions
  const handleExploreEmotions = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setVentState('exploring_emotions');
    try {
      const res = await exploreVentEmotions(text.trim());
      setExploredEmotions(res.emotions || []);
    } catch (err: any) {
      console.error('Emotion exploration failed:', err);
      setStatusMessage('Unable to explore emotions right now. You can still save or transform your text.');
    } finally {
      setIsLoading(false);
    }
  };

  // Decision 4: Transform vent into something constructive
  const handleTriggerTransform = async (type: 'journal' | 'letter_self' | 'letter_unsent' | 'problem_statement' | 'action_plan') => {
    if (!text.trim()) return;
    setTransformType(type);
    setIsLoading(true);
    setVentState('transforming');

    try {
      const res = await transformVentContent({
        ventText: text.trim(),
        transformType: type,
      });
      setTransformedOutput(res.transformedText);
    } catch (err: any) {
      console.error('Vent transformation error:', err);
      setStatusMessage('Transformation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save transformed output as a journal entry linked to source vent
  const handleSaveTransformedToJournal = async () => {
    if (!transformedOutput.trim()) return;
    setIsLoading(true);

    try {
      // 1. Ensure the underlying source vent session exists in private storage
      let sourceVentId = savedSessionId || activeVentSession?.id;
      if (!sourceVentId) {
        sourceVentId = `vent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const session: VentSession = {
          id: sourceVentId,
          userId: user.uid,
          content: text.trim(),
          wordCount,
          createdAt: Date.now(),
        };
        await saveVentSession(user.uid, session);
        setSavedSessionId(sourceVentId);
      }

      // 2. Auto-generate a safe, concise title for the Reflective Journal
      let generatedTitle = '';
      try {
        generatedTitle = await generateAutoTitle(transformedOutput, 'reflective_journal');
      } catch {
        // Fallback
        let titlePrefix = 'Reflective Journal';
        if (transformType === 'letter_self') titlePrefix = 'Letter to Myself';
        if (transformType === 'letter_unsent') titlePrefix = "Letter I Won't Send";
        if (transformType === 'problem_statement') titlePrefix = 'Problem Statement';
        if (transformType === 'action_plan') titlePrefix = 'Tiny Action Plan';
        generatedTitle = `${titlePrefix} (${new Date().toLocaleDateString()})`;
      }

      const sourceDateFormatted = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      // 3. Create and persist the linked Journal Entry
      const entry: JournalEntry = {
        id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: user.uid,
        title: generatedTitle,
        content: transformedOutput.trim(),
        tags: ['vent_transformed', transformType],
        entryType: 'transformed_vent',
        sourceVentId: sourceVentId,
        sourceVentTitle: `Secret Vent · ${sourceDateFormatted}`,
        sourceType: 'secret-vent',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveJournalEntry(user.uid, entry);
      if (onSavedToJournal) onSavedToJournal(entry);
      if (onTransformToJournal) onTransformToJournal(entry);
    } catch (err) {
      console.error('Failed to save transformed journal:', err);
      setStatusMessage('Unable to save journal entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEmotionSelection = (id: string) => {
    setSelectedEmotionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteVentConfirmed = async () => {
    const idToDelete = activeVentSession?.id || savedSessionId;
    if (!idToDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteVentSession) {
        await onDeleteVentSession(idToDelete);
      }
      setText('');
      setSavedSessionId(null);
      setVentState('drafting');
      setIsDeleteModalOpen(false);
      onBackToHome();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="vent-out-workspace" className="flex-1 flex flex-col h-full bg-stone-50 overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between shadow-xs">
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
              <h2 className="text-base sm:text-lg font-semibold text-stone-900 flex items-center gap-1.5">
                <Wind className="h-4 w-4 text-rose-600" />
                <span>Vent Out</span>
              </h2>
              {activeVentSession ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-rose-100/80 text-rose-800 rounded-md">
                  <Lock className="h-3 w-3" />
                  <span>Saved Secret Vent</span>
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">
                  Unfiltered Release
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              {activeVentSession
                ? `Stored privately in your vault from ${new Date(activeVentSession.createdAt).toLocaleDateString()}`
                : 'Speak or write freely. Nothing is judged or analyzed until you ask.'}
            </p>
          </div>
        </div>

        {/* Word count indicator & actions */}
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span>{wordCount} words</span>
          {(activeVentSession || savedSessionId) && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Delete this secret vent"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {isRecording && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Voice Out active</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 w-full flex flex-col">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col pb-6">
        
        {/* 1. DRAFTING STATE */}
        {ventState === 'drafting' && (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            
            {speechError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>{speechError}</span>
                </div>
                <button
                  onClick={() => setSpeechError(null)}
                  className="p-1 text-amber-600 hover:text-amber-900 rounded-md hover:bg-amber-100/60 transition-colors cursor-pointer shrink-0"
                  title="Dismiss message"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Distraction-free Textarea */}
            <div className="flex-1 relative bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-100 transition-all">
              <textarea
                id="input-vent-text"
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Say or write whatever is on your mind. Don't worry about punctuation, coherence, or making sense. Just let it out..."
                className="w-full flex-1 bg-transparent text-sm sm:text-base text-stone-800 placeholder-stone-400 resize-none focus:outline-none leading-relaxed font-sans min-h-[140px]"
                autoFocus
              />

              {/* Bottom controls inside editor */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                
                {/* Voice Out Button */}
                <div className="flex items-center gap-2">
                  <button
                    id="btn-voice-out"
                    onClick={toggleRecording}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isRecording
                        ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                        : 'bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-800'
                    }`}
                    title={speechSupported ? 'Talk to type using speech recognition' : 'Speech not supported'}
                  >
                    {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 text-rose-600" />}
                    <span>{isRecording ? 'Pause Voice' : 'Voice Out'}</span>
                  </button>

                  {text.trim().length > 0 && (
                    <button
                      onClick={() => setText('')}
                      className="text-xs text-stone-400 hover:text-rose-700 px-2 py-1 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* "I'm Done" Button */}
                <button
                  id="btn-vent-done"
                  onClick={() => setVentState('deciding')}
                  disabled={!text.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>I'm Done</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

              </div>
            </div>

            {/* Calming gentle note */}
            <p className="text-center text-xs text-stone-400">
              When you click "I'm Done", you choose what happens next — you can let it vanish forever, keep it privately, or explore what's underneath.
            </p>

          </div>
        )}

        {/* 2. DECISION GATE: "What would you like to do with this?" */}
        {ventState === 'deciding' && (
          <div className="max-w-xl mx-auto w-full space-y-4 pt-1 sm:pt-2 pb-6">
            
            {/* Readable & Expandable Vent Text Card */}
            {text.trim() && (
              <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 transition-all">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                      <Wind className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-stone-900 block">
                        {activeVentSession || savedSessionId ? 'Secret Vent Session' : 'Your Vent Expression'}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {wordCount} words · {activeVentSession || savedSessionId ? 'Saved privately' : 'Unsaved draft'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setVentState('drafting')}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                      title="Edit raw vent text"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>

                    {wordCount > 25 && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-rose-200"
                        title={isExpanded ? 'Collapse view' : 'Expand to view full vent'}
                      >
                        <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Readable text content */}
                <div
                  className={`relative text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-wrap transition-all ${
                    !isExpanded && wordCount > 25 ? 'max-h-24 overflow-hidden' : 'max-h-80 overflow-y-auto pr-1'
                  }`}
                >
                  {text}

                  {/* Bottom fade gradient if truncated */}
                  {!isExpanded && wordCount > 25 && (
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  )}
                </div>

                {/* Click to expand bar if truncated */}
                {!isExpanded && wordCount > 25 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full text-center py-1 text-[11px] font-medium text-rose-700 hover:text-rose-900 hover:underline flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Read entire vent ({wordCount} words)</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            <div className="text-center space-y-1">
              <h3 className="text-xl sm:text-2xl font-bold  text-stone-900">
                What would you like to do with this?
              </h3>
              <p className="text-xs sm:text-sm text-stone-500">
                You are in complete control of your thoughts. Choose a pathway:
              </p>
            </div>

            {/* Decision Options */}
            <div className="space-y-3">
              
              {/* Option A: Let it disappear */}
              <button
                id="btn-decision-disappear"
                onClick={handleLetItDisappear}
                className="w-full text-left p-4 rounded-xl bg-white border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 transition-all group flex items-start gap-3.5 cursor-pointer shadow-xs"
              >
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 shrink-0 group-hover:bg-rose-100 transition-colors">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-900 group-hover:text-rose-900">
                    Let it disappear
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Release it into the air. Wiped from memory immediately with zero storage.
                  </p>
                </div>
              </button>

              {/* Option B: Keep it privately */}
              <button
                id="btn-decision-keep"
                onClick={handleKeepPrivately}
                disabled={isLoading}
                className="w-full text-left p-4 rounded-xl bg-white border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all group flex items-start gap-3.5 cursor-pointer shadow-xs"
              >
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 shrink-0 group-hover:bg-emerald-100 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-900 group-hover:text-emerald-900">
                    Keep it privately
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Save the raw text securely in your private journal vault without modifying it.
                  </p>
                </div>
              </button>

              {/* Option C: Help me understand */}
              <button
                id="btn-decision-understand"
                onClick={handleExploreEmotions}
                disabled={isLoading}
                className="w-full text-left p-4 rounded-xl bg-white border border-stone-200 hover:border-purple-300 hover:bg-purple-50/40 transition-all group flex items-start gap-3.5 cursor-pointer shadow-xs"
              >
                <div className="p-2.5 rounded-lg bg-purple-50 text-purple-800 shrink-0 group-hover:bg-purple-100 transition-colors">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-900 group-hover:text-purple-900">
                    Help me understand what I'm feeling
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Gently uncover 2–4 underlying emotional themes beneath the frustration.
                  </p>
                </div>
              </button>

              {/* Option D: Turn this into something */}
              <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <h4 className="text-sm font-semibold text-stone-900">
                    Turn this into something constructive
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleTriggerTransform('letter_self')}
                    className="p-2.5 rounded-lg bg-stone-50 hover:bg-rose-50 border border-stone-200 text-left text-xs font-medium text-stone-800 hover:text-rose-900 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 text-rose-600" />
                    <span>Letter to Myself</span>
                  </button>

                  <button
                    onClick={() => handleTriggerTransform('letter_unsent')}
                    className="p-2.5 rounded-lg bg-stone-50 hover:bg-amber-50 border border-stone-200 text-left text-xs font-medium text-stone-800 hover:text-amber-900 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <MailWarning className="h-3.5 w-3.5 text-amber-600" />
                    <span>Letter I Won't Send</span>
                  </button>

                  <button
                    onClick={() => handleTriggerTransform('action_plan')}
                    className="p-2.5 rounded-lg bg-stone-50 hover:bg-emerald-50 border border-stone-200 text-left text-xs font-medium text-stone-800 hover:text-emerald-900 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ListTodo className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Tiny Action Plan</span>
                  </button>

                  <button
                    onClick={() => handleTriggerTransform('problem_statement')}
                    className="p-2.5 rounded-lg bg-stone-50 hover:bg-blue-50 border border-stone-200 text-left text-xs font-medium text-stone-800 hover:text-blue-900 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileQuestion className="h-3.5 w-3.5 text-blue-600" />
                    <span>Problem Statement</span>
                  </button>
                </div>
              </div>

            </div>

            <div className="text-center">
              <button
                onClick={() => setVentState('drafting')}
                className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
              >
                Go back to editing
              </button>
            </div>

          </div>
        )}

        {/* 3. EXPLORING EMOTIONS STATE */}
        {ventState === 'exploring_emotions' && (
          <div className="flex-1 space-y-6 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-700" />
                <h3 className="text-lg font-semibold text-stone-900">
                  Tentative Themes Beneath Your Words
                </h3>
              </div>
              <p className="text-xs text-stone-500">
                You know yourself better than any tool does. Do any of these resonate?
              </p>
            </div>

            {isLoading ? (
              <div className="p-12 text-center space-y-3">
                <Loader2 className="h-6 w-6 text-purple-700 animate-spin mx-auto" />
                <p className="text-xs text-stone-500">Gently exploring emotional nuances...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exploredEmotions.map((emo) => {
                  const isSelected = selectedEmotionIds.includes(emo.id);
                  return (
                    <div
                      key={emo.id}
                      onClick={() => toggleEmotionSelection(emo.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50/80 border-purple-300 shadow-xs'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-stone-900">{emo.name}</span>
                            {isSelected && (
                              <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.2 rounded font-medium">
                                Resonates
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed">
                            {emo.tentativeDescription}
                          </p>
                          <p className="text-[11px] text-stone-400 italic">
                            Subtext: {emo.subtext}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 accent-purple-700 cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setVentState('deciding')}
                    className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                  >
                    Back to options
                  </button>

                  <button
                    onClick={() => handleTriggerTransform('journal')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white text-xs font-medium rounded-xl shadow-xs cursor-pointer"
                  >
                    <span>Synthesize into Journal Entry</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. TRANSFORMED OUTPUT STATE */}
        {ventState === 'transforming' && (
          <div className="flex-1 space-y-4 py-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-stone-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-800" />
                <span>Transformed Perspective</span>
              </h3>
              <button
                onClick={() => setVentState('deciding')}
                className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Change transformation
              </button>
            </div>

            {isLoading ? (
              <div className="p-12 bg-white rounded-2xl border border-stone-200 text-center space-y-3">
                <Loader2 className="h-6 w-6 text-emerald-700 animate-spin mx-auto" />
                <p className="text-xs text-stone-500">Drafting constructive transformation...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
                  <div className="markdown-body text-xs sm:text-sm text-stone-800 leading-relaxed space-y-3">
                    <Markdown>{transformedOutput}</Markdown>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleKeepPrivately}
                    className="px-3 py-2 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Keep raw vent only
                  </button>

                  <button
                    id="btn-save-transformed"
                    onClick={handleSaveTransformedToJournal}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Save to My Journal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. DISAPPEARED CONFIRMATION */}
        {ventState === 'disappeared' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
            <div className="h-16 w-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shadow-xs border border-rose-100 animate-fade-in">
              <Wind className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-lg font-semibold text-stone-900">
                Released and Gone
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                Your thoughts have been completely released. Nothing was stored or transmitted. Take a deep breath.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onBackToHome}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-xs cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* 6. SAVED PRIVATELY CONFIRMATION */}
        {ventState === 'saved_privately' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
            <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center shadow-xs border border-emerald-100 animate-fade-in">
              <Lock className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-lg font-semibold text-stone-900">
                Saved Privately
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                Your raw vent is safely stored in your personal vault. Only you have access.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onBackToHome}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium rounded-xl shadow-xs cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        </div>
      </div>

      {/* Delete Confirmation Modal for Active Vent Session */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Secret Vent?"
        description="This secret vent session will be permanently erased from your private vault. This action cannot be undone."
        confirmLabel="Delete Permanently"
        isDeleting={isDeleting}
        onConfirm={handleDeleteVentConfirmed}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
