export type AppView = 'home' | 'write' | 'vent' | 'talk' | 'reflect';

export type ReflectionMode =
  | 'listen'
  | 'understand'
  | 'solve'
  | 'express'
  | 'reflection'
  | 'brainstorm'
  | 'summary'
  | 'socratic'
  | 'reframing'
  | 'dont_fix_it'
  | 'gentle_problem_solve';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  initialPrompt: string;
  mode: ReflectionMode;
  tags: string[];
  messages: ChatMessage[];
  summary?: string;
  mood?: string;
  cycleNote?: string;
  createdAt: number;
  updatedAt: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood?: string;
  tags: string[];
  entryType?: 'standard' | 'transformed_vent' | 'letter_self' | 'letter_unsent' | 'action_plan' | 'problem_statement';
  sourceVentId?: string;
  sourceVentTitle?: string;
  sourceType?: 'secret-vent' | 'standard';
  createdAt: number;
  updatedAt: number;
}

export interface EmotionPossibility {
  id: string;
  name: string;
  tentativeDescription: string;
  subtext: string;
  suggestedPrompt: string;
}

export interface VentSession {
  id: string;
  userId: string;
  content: string;
  wordCount: number;
  exploredEmotions?: EmotionPossibility[];
  userSelectedEmotions?: string[];
  transformedInto?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface FutureLetter {
  id: string;
  userId: string;
  title: string;
  content: string;
  deliverAt: number; // Unix timestamp
  isRead: boolean;
  createdAt: number;
}

export interface TinyWin {
  id: string;
  userId: string;
  text: string;
  feeling?: string;
  createdAt: number;
}

export interface CycleProfile {
  userId: string;
  optedIn: boolean;
  enabled?: boolean;
  genderIdentity?: string;
  lastPeriodStart?: string; // YYYY-MM-DD
  lastPeriodDate?: string; // YYYY-MM-DD alias
  cycleLengthDays?: number; // default ~28
  periodLengthDays?: number; // default ~5
  knownPhase?: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown';
  symptoms?: string[];
  notes?: string;
  updatedAt: number;
}

export interface CycleContext {
  enabled: boolean;
  currentPhase: string;
  cycleDay: number;
  emotionalNote: string;
}

export interface PatternInsight {
  id: string;
  userId: string;
  observation: string;
  theme: string;
  sampleCount: number;
  status: 'active' | 'ignored' | 'dismissed';
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

export interface ReflectionModeConfig {
  id: ReflectionMode;
  label: string;
  shortLabel?: string;
  description: string;
  badge: string;
  placeholder: string;
  icon?: any;
}
