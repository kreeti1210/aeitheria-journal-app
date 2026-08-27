import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Zap,
  FileText,
  HelpCircle,
  RefreshCw,
  Check,
  Copy,
  AlertCircle,
  CheckCircle2,
  Tag,
  Smile,
  Clock,
  Loader2,
  ChevronDown,
  BookOpen,
  ChevronLeft,
  HeartHandshake,
  Ear
} from 'lucide-react';
import {
  JournalInteraction,
  ChatMessage,
  ReflectionMode,
  SaveStatus,
  ReflectionModeConfig,
  UserProfile,
  CycleProfile
} from '../types';

interface ReflectionWorkspaceProps {
  currentInteraction: JournalInteraction;
  user: UserProfile;
  cycleProfile?: CycleProfile | null;
  cycleContext?: any;
  saveStatus: SaveStatus;
  saveError?: string;
  isGenerating: boolean;
  onSendMessage: (text: string, mode: ReflectionMode, cycleContext?: string) => Promise<void>;
  onGenerateSummary: () => Promise<void>;
  onUpdateMetadata: (updates: Partial<JournalInteraction>) => void;
  onRetrySave: () => void;
  onBackToHome?: () => void;
}

const MODE_CONFIGS: Record<ReflectionMode, ReflectionModeConfig> = {
  dont_fix_it: {
    id: 'dont_fix_it',
    label: "Don't Fix It",
    description: 'Empathetic validation without unsolicited advice or fixing',
    badge: 'Just Listen',
    icon: 'Ear',
    placeholder: 'Tell me everything on your mind. I am here purely to listen and validate, not to fix...',
  },
  listen: {
    id: 'listen',
    label: "Don't Fix It",
    description: 'Empathetic validation without unsolicited advice or fixing',
    badge: 'Just Listen',
    icon: 'Ear',
    placeholder: 'Tell me everything on your mind. I am here purely to listen and validate, not to fix...',
  },
  understand: {
    id: 'understand',
    label: 'Help Me Understand',
    description: 'Gently untangle underlying emotional layers beneath the surface',
    badge: 'Explore Emotions',
    icon: 'Sparkles',
    placeholder: 'What are you feeling right now? Describe the sensation or dilemma...',
  },
  solve: {
    id: 'solve',
    label: 'Help Me Solve It',
    description: 'Actionable clarity and structured options when ready',
    badge: 'Solve It',
    icon: 'Zap',
    placeholder: 'When you are ready, what is the situation you want to gently navigate?',
  },
  gentle_problem_solve: {
    id: 'gentle_problem_solve',
    label: 'Gentle Steps',
    description: 'Empathetic, bite-sized next steps when you feel ready to move forward',
    badge: 'Gentle Steps',
    icon: 'Zap',
    placeholder: 'What small step would help you move forward with ease?',
  },
  express: {
    id: 'express',
    label: 'Help Me Express',
    description: 'Find words for difficult or unspoken feelings',
    badge: 'Express It',
    icon: 'FileText',
    placeholder: 'What is something you wish you could say or express clearly?',
  },
  reflection: {
    id: 'reflection',
    label: 'Deep Reflection',
    description: 'Empathetic unpacking, mental models, and deep emotional clarity',
    badge: 'Deep Reflection',
    icon: 'Sparkles',
    placeholder: 'What is occupying your mind today? Write freely or reflect on a recent event...',
  },
  brainstorm: {
    id: 'brainstorm',
    label: 'Brainstorm',
    description: 'High-leverage ideas and prioritized possibilities',
    badge: 'Brainstorm',
    icon: 'Zap',
    placeholder: 'What challenge or goal do you want to brainstorm pathways for?',
  },
  summary: {
    id: 'summary',
    label: 'Executive Summary',
    description: 'Distill scattered thoughts into core themes and takeaways',
    badge: 'Summary',
    icon: 'FileText',
    placeholder: 'Paste or draft scattered thoughts to synthesize...',
  },
  socratic: {
    id: 'socratic',
    label: 'Socratic Inquiry',
    description: 'Thoughtful questions to uncover core motives',
    badge: 'Socratic',
    icon: 'HelpCircle',
    placeholder: 'State a belief, dilemma, or assumption you want to examine...',
  },
  reframing: {
    id: 'reframing',
    label: 'Cognitive Reframing',
    description: 'Constructive perspective shift with emotional resilience',
    badge: 'Reframing',
    icon: 'RefreshCw',
    placeholder: 'Describe a friction or setback you want to gently reframe...',
  },
};

// Clean unique list of selectable talk modes in one horizontal line (No duplicates)
const SELECTABLE_MODES: { key: ReflectionMode; label: string; description: string }[] = [
  {
    key: 'dont_fix_it',
    label: "Don't Fix It",
    description: 'Empathetic validation without unsolicited advice or fixing',
  },
  {
    key: 'understand',
    label: 'Help Me Understand',
    description: 'Gently untangle underlying emotional layers beneath the surface',
  },
  {
    key: 'solve',
    label: 'Help Me Solve It',
    description: 'Empathetic clarity and structured options',
  },
  {
    key: 'gentle_problem_solve',
    label: 'Gentle Steps',
    description: 'Empathetic, bite-sized next steps when you feel ready',
  },
  {
    key: 'express',
    label: 'Help Me Express',
    description: 'Find words for difficult or unspoken feelings',
  },
  {
    key: 'reflection',
    label: 'Deep Reflection',
    description: 'Empathetic unpacking, mental models, and deep emotional clarity',
  },
  {
    key: 'reframing',
    label: 'Reframing',
    description: 'Constructive perspective shift with emotional resilience',
  },
];

const QUICK_STARTERS = [
  {
    title: "Don't Fix It: Just hear me out",
    prompt: "I've had a really overwhelming day and just need to vent without being told how to fix it or look on the bright side. Please just listen and validate what I'm going through.",
    mode: 'dont_fix_it' as ReflectionMode,
  },
  {
    title: 'Explore what I am feeling',
    prompt: "I feel off or anxious, but I can't quite pinpoint why. Help me ask a few gentle questions to explore what might be under the surface.",
    mode: 'emotion_explore' as ReflectionMode,
  },
  {
    title: 'Unpack a tough decision',
    prompt: "I'm currently deliberating a decision and feel pulled in different directions. Help me identify the core tradeoffs and values at stake.",
    mode: 'reflection' as ReflectionMode,
  },
  {
    title: 'Gentle step forward',
    prompt: "I feel stuck on something and want just ONE small, manageable step I can do in under 5 minutes without getting overwhelmed.",
    mode: 'gentle_problem_solve' as ReflectionMode,
  },
];

const MOOD_OPTIONS = ['Clear', 'Reflective', 'Creative', 'Overwhelmed', 'Focused', 'Grateful', 'Gentle', 'Tired'];

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  currentInteraction,
  user,
  cycleProfile,
  saveStatus,
  saveError,
  isGenerating,
  onSendMessage,
  onGenerateSummary,
  onUpdateMetadata,
  onRetrySave,
  onBackToHome,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentInteraction.messages, isGenerating]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleSend = async (overridePrompt?: string, overrideMode?: ReflectionMode) => {
    const textToSend = (overridePrompt ?? inputText).trim();
    if (!textToSend || isGenerating) return;

    const modeToUse = overrideMode ?? currentInteraction.mode;
    if (!overridePrompt) {
      setInputText('');
    }

    let cycleContext = undefined;
    if (cycleProfile?.optedIn && cycleProfile.symptoms?.length) {
      cycleContext = `User cycle preferences: Common tendencies noted: ${cycleProfile.symptoms.join(', ')}.`;
    }

    await onSendMessage(textToSend, modeToUse, cycleContext);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleAddTag = () => {
    const clean = newTag.trim().replace(/^#/, '');
    if (clean && !currentInteraction.tags?.includes(clean)) {
      const updatedTags = [...(currentInteraction.tags || []), clean];
      onUpdateMetadata({ tags: updatedTags });
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = (currentInteraction.tags || []).filter((t) => t !== tagToRemove);
    onUpdateMetadata({ tags: updatedTags });
  };

  const handleSelectMood = (mood: string) => {
    onUpdateMetadata({ mood });
    setShowMoodDropdown(false);
  };

  const currentModeConfig = MODE_CONFIGS[currentInteraction.mode] || MODE_CONFIGS.reflection;
  const activeModeKey = currentInteraction.mode === 'listen' ? 'dont_fix_it' : currentInteraction.mode;

  return (
    <div id="reflection-workspace" className="flex-1 flex flex-col h-full bg-stone-50 overflow-hidden">
      
      {/* Workspace Top Control Bar */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-2.5 shrink-0 flex flex-col gap-2 shadow-xs">
        
        {/* Row 1: Title, Back Button, Save status & Summarize */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
                title="Back to home"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <input
              id="input-reflection-title"
              type="text"
              value={currentInteraction.title || ''}
              onChange={(e) => onUpdateMetadata({ title: e.target.value })}
              placeholder="Untitled Conversation..."
              className="text-sm sm:text-base font-bold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-rose-400 focus:outline-none w-full truncate transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Firestore Status Badge */}
            <div className="flex items-center gap-1 text-xs font-medium">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Saved</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <button
                  onClick={onRetrySave}
                  className="flex items-center gap-1 text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md border border-red-200 transition-colors cursor-pointer text-[11px]"
                  title={saveError || 'Save failed. Click to retry.'}
                >
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span>Save Error (Retry)</span>
                </button>
              )}
            </div>

            {/* Generate Summary Button */}
            {currentInteraction.messages?.length > 0 && (
              <button
                id="btn-summarize"
                onClick={onGenerateSummary}
                disabled={isGenerating}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 border border-stone-200"
                title="Generate a compassionate synthesis of this entire conversation"
              >
                <BookOpen className="h-3 w-3 text-stone-700" />
                <span>Summary</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Mode Selector in Single Horizontal Line (Change 7) + Mood & Tag on Right */}
        <div className="flex items-center justify-between gap-3 overflow-hidden">
          
          {/* Mode Selector - Single horizontal line with smooth scrolling */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 flex-1 min-w-0">
            {SELECTABLE_MODES.map((modeItem) => {
              const isSelected = activeModeKey === modeItem.key;
              return (
                <button
                  key={modeItem.key}
                  id={`btn-mode-${modeItem.key}`}
                  onClick={() => onUpdateMetadata({ mode: modeItem.key })}
                  className={`px-2.5 py-1 rounded-lg font-medium text-[11px] whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
                  title={modeItem.description}
                >
                  {modeItem.label}
                </button>
              );
            })}
          </div>

          {/* Meta bar: Mood & Tags aligned horizontally */}
          <div className="flex items-center gap-2 text-xs shrink-0 pl-1 border-l border-stone-200">
            
            {/* Mood Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoodDropdown(!showMoodDropdown)}
                className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Smile className="h-3 w-3 text-rose-500" />
                <span>{currentInteraction.mood || 'Mood'}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {showMoodDropdown && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-stone-200 py-1 z-40">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => handleSelectMood(mood)}
                      className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-rose-50 hover:text-rose-900 cursor-pointer"
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1">
              {currentInteraction.tags?.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px] flex items-center gap-1 border border-stone-200"
                >
                  #{t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-red-500 font-bold ml-0.5 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              ))}

              {showTagInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="w-16 px-1.5 py-0.5 text-[11px] border border-rose-300 rounded focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleAddTag}
                    className="text-[10px] px-1.5 py-0.5 bg-stone-900 text-white rounded cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="text-[10px] text-stone-400 hover:text-stone-700 flex items-center gap-0.5 cursor-pointer"
                >
                  <Tag className="h-2.5 w-2.5" />
                  <span>+Tag</span>
                </button>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-6">
        
        {/* Empty State / Quick Starters */}
        {(!currentInteraction.messages || currentInteraction.messages.length === 0) && (
          <div className="max-w-2xl mx-auto py-8">
            <div className="text-center space-y-2 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-700 mx-auto flex items-center justify-center shadow-xs border border-rose-100">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">A Safe Space to Talk</h2>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                Talk out loud without fear of judgment. Choose a mode like <strong>"Don't Fix It"</strong> when you just need to be heard, or pick a starter below.
              </p>
            </div>

            {/* Quick Starter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_STARTERS.map((starter, idx) => (
                <button
                  key={idx}
                  id={`btn-starter-${idx}`}
                  onClick={() => handleSend(starter.prompt, starter.mode)}
                  disabled={isGenerating}
                  className="text-left p-4 rounded-2xl bg-white border border-stone-200 hover:border-rose-300 hover:shadow-sm transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900 group-hover:text-rose-900 transition-colors">
                      {starter.title}
                    </span>
                    <Sparkles className="h-3.5 w-3.5 text-stone-300 group-hover:text-rose-500 transition-colors" />
                  </div>
                  <p className="mt-1.5 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {starter.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Executive Summary Card if present */}
        {currentInteraction.summary && (
          <div className="max-w-3xl mx-auto bg-stone-100/90 border border-stone-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-800" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  Compassionate Session Synthesis
                </h3>
              </div>
              <button
                onClick={() => handleCopyText('summary', currentInteraction.summary!)}
                className="text-xs text-stone-700 hover:text-stone-950 flex items-center gap-1 font-medium cursor-pointer"
              >
                {copiedMessageId === 'summary' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="markdown-body text-xs sm:text-sm text-stone-800 leading-relaxed space-y-2">
              <Markdown>{currentInteraction.summary}</Markdown>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="max-w-3xl mx-auto space-y-5">
          {currentInteraction.messages?.map((message) => {
            const isUser = message.role === 'user';

            return (
              <div
                key={message.id}
                id={`chat-msg-${message.id}`}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="h-8 w-8 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <HeartHandshake className="h-4 w-4 text-rose-300" />
                  </div>
                )}

                {/* Message Body */}
                <div
                  className={`relative max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-stone-900 text-white rounded-tr-xs shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-800 rounded-tl-xs shadow-xs'
                  }`}
                >
                  {/* Top metadata for assistant */}
                  {!isUser && (
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 text-[11px] text-stone-400">
                      <span className="font-medium text-stone-700 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-rose-500" />
                        <span>Supportive Reflection</span>
                      </span>

                      <button
                        onClick={() => handleCopyText(message.id, message.content)}
                        className="text-stone-400 hover:text-stone-800 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Copy reflection"
                      >
                        {copiedMessageId === message.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600 text-[10px]">Copied</span>
                          </>
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Content */}
                  <div className={isUser ? 'text-white whitespace-pre-wrap' : 'text-stone-800'}>
                    {isUser ? (
                      message.content
                    ) : (
                      <div className="markdown-body space-y-2.5 text-xs sm:text-sm">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div
                    className={`mt-2 text-[10px] flex items-center gap-1 ${
                      isUser ? 'text-stone-300 justify-end' : 'text-stone-400'
                    }`}
                  >
                    <Clock className="h-2.5 w-2.5" />
                    <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="h-8 w-8 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center shrink-0 mt-1 font-semibold text-xs border border-rose-200">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator when generating */}
          {isGenerating && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <HeartHandshake className="h-4 w-4 text-rose-300 animate-pulse" />
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-xs p-4 shadow-xs text-xs text-stone-600 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-rose-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-rose-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-rose-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Listening and reflecting with you...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

      </div>

      {/* Composer Bottom Area */}
      <div className="bg-white border-t border-stone-200 p-3 shrink-0 shadow-sm">
        <div className="max-w-3xl mx-auto space-y-1.5">
          
          <div className="relative flex items-end gap-2 bg-stone-50 border border-stone-200 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-rose-200 focus-within:border-rose-400 transition-all">
            <textarea
              id="input-reflection-composer"
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentModeConfig.placeholder}
              className="flex-1 bg-transparent text-xs sm:text-sm text-stone-800 placeholder-stone-400 resize-none focus:outline-none p-1 max-h-32 min-h-[36px]"
            />

            <button
              id="btn-send-message"
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isGenerating}
              className="h-9 w-9 rounded-xl bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Send (Enter)"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 px-1">
            <span className="flex items-center gap-1">
              <span>Current Mode:</span>
              <strong className="text-stone-700 font-medium">{currentModeConfig.label}</strong>
            </span>

            <span>{inputText.length} characters</span>
          </div>

        </div>
      </div>

    </div>
  );
};
