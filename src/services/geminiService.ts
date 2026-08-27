import { ChatMessage, ReflectionMode, EmotionPossibility, PatternInsight } from '../types';

export interface ReflectParams {
  prompt: string;
  history?: ChatMessage[];
  mode: ReflectionMode;
  journalContext?: string;
  cycleContext?: string;
}

export interface ReflectResponse {
  reply: string;
  modelUsed: string;
  timestamp: string;
}

export interface SummarizeParams {
  content: string;
  title?: string;
}

export interface SummarizeResponse {
  summary: string;
  modelUsed: string;
  timestamp: string;
}

export interface EmotionExploreResponse {
  emotions: EmotionPossibility[];
  modelUsed: string;
  timestamp: string;
}

export interface TransformVentParams {
  ventText: string;
  transformType: 'journal' | 'letter_self' | 'letter_unsent' | 'problem_statement' | 'action_plan';
}

export interface TransformVentResponse {
  transformedText: string;
  transformType: string;
  modelUsed: string;
  timestamp: string;
}

export interface CompareGrowthParams {
  thenText: string;
  nowText: string;
  thenDate?: string;
  nowDate?: string;
}

/**
 * Calls backend `/api/ai/reflect` with resilient multi-model fallback and mode support.
 */
export async function sendReflectionPrompt(params: ReflectParams): Promise<ReflectResponse> {
  const response = await fetch('/api/ai/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Reflection failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Calls backend `/api/ai/emotion-explore` to discover tentative emotional possibilities underneath raw vents.
 */
export async function exploreVentEmotions(ventText: string): Promise<EmotionExploreResponse> {
  const response = await fetch('/api/ai/emotion-explore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ventText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Emotion exploration failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Calls backend `/api/ai/transform-vent` to convert raw vent into letters, action plans, or journal entries.
 */
export async function transformVentContent(params: TransformVentParams): Promise<TransformVentResponse> {
  const response = await fetch('/api/ai/transform-vent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Transformation failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Calls backend `/api/ai/patterns` to extract recurring themes.
 */
export async function generatePatternInsights(summariesOrSnippets: string[]): Promise<{ patterns: PatternInsight[]; message?: string }> {
  const response = await fetch('/api/ai/patterns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ summariesOrSnippets }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Pattern generation failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Calls backend `/api/ai/compare-growth` to compare "Then vs Now".
 */
export async function compareGrowthMoments(params: CompareGrowthParams): Promise<{ comparison: string; modelUsed: string }> {
  const response = await fetch('/api/ai/compare-growth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Growth comparison failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Calls backend `/api/ai/look-back` for retrospective synthesis.
 */
export async function generateLookBackRetrospective(entriesText: string, timeframe?: string): Promise<{ synthesis: string; modelUsed: string }> {
  const response = await fetch('/api/ai/look-back', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entriesText, timeframe }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Look back synthesis failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Calls backend `/api/ai/summarize` for compassionate conversation or journal summary.
 */
export async function generateEntrySummary(params: SummarizeParams): Promise<SummarizeResponse> {
  const response = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Summary failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Calls backend `/api/ai/generate-title` to generate concise, human titles for Talk or Reflective Journal.
 */
export async function generateAutoTitle(text: string, type: 'talk' | 'reflective_journal' = 'talk'): Promise<string> {
  try {
    const response = await fetch('/api/ai/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, type }),
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.title || (type === 'talk' ? 'Reflection Conversation' : 'Reflective Journal Entry');
  } catch (err) {
    console.warn('[Auto-title fallback]:', err);
    // Graceful client fallback
    const words = text.trim().split(/\s+/).slice(0, 5).join(' ');
    if (words) {
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
    return type === 'talk' ? 'Reflection Conversation' : 'Reflective Journal Entry';
  }
}


