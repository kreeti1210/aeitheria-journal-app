import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy initialization of Gemini SDK
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// 2. Gemini Model Resilience & Fallback Ladder
// Uses primary gemini-3.7-flash with graceful fallbacks to gemini-3.1-flash-lite and gemini-flash-latest
const MODEL_FALLBACK_LADDER = [
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

interface FallbackOptions {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
}

async function generateContentWithFallback(options: FallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      const config: any = {
        systemInstruction: options.systemInstruction,
        temperature: options.temperature ?? 0.7,
      };

      if (options.responseMimeType) {
        config.responseMimeType = options.responseMimeType;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: options.contents,
        config,
      });

      const responseText = response.text || '';
      return {
        text: responseText,
        modelUsed: modelName,
      };
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${modelName} encountered an issue (${err?.status || err?.code || err?.message || 'Error'}). Trying next model in ladder...`);
      lastError = err;
    }
  }

  throw new Error(`All Gemini fallback models exhausted. Last error: ${lastError?.message || 'Unknown error'}`);
}

// 3. API Routes

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Aetheria - A Private Space to Think Out Loud',
    timestamp: new Date().toISOString(),
    primaryModel: MODEL_FALLBACK_LADDER[0],
  });
});

// Reflection & Multi-turn Conversation endpoint ("Don't Fix It" modes supported)
app.post('/api/ai/reflect', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { prompt, history = [], mode = 'listen', journalContext = '', cycleContext = '' } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'A valid "prompt" string is required.' });
      return;
    }

    if (prompt.length > 30000) {
      res.status(400).json({ error: 'Prompt exceeds maximum character length.' });
      return;
    }

    // Base System Prompt: Grounded, warm, non-diagnostic, privacy-first
    let systemInstruction = `You are a warm, calm, non-judgmental, and emotionally intelligent AI companion in Aetheria ("A private space to think out loud").
Your mission is to help the user unpack their thoughts, observe patterns, and reflect clearly without ever pretending to be a doctor, therapist, or human.

CRITICAL BOUNDARIES:
- NEVER diagnose mental health conditions, clinical disorders, or hormonal imbalances.
- You are not a medical provider. Always maintain supportive, exploratory, and humble tone.
- If the user expresses imminent self-harm or severe crisis, gently provide immediate help lines (e.g. 988 Suicide & Crisis Lifeline in US/Canada, text HOME to 741741, or local emergency services) with compassion.
- Format responses in clean, beautifully structured Markdown.`;

    // Dynamic Mode Tuning ("Don't Fix It" Architecture)
    if (mode === 'listen') {
      systemInstruction += `\n\nACTIVE MODE: "JUST LISTEN" (Do Not Fix It)
- Priority: Listen, validate, and reflect back what you heard in user's own words.
- DO NOT offer advice, problem-solving, unsolicited steps, or silver linings.
- Acknowledge the weight of what they are experiencing. Ask one gentle clarifying or grounding reflection question if appropriate.`;
    } else if (mode === 'understand') {
      systemInstruction += `\n\nACTIVE MODE: "HELP ME UNDERSTAND"
- Priority: Gently untangle thoughts and explore underlying emotions, motives, and tensions.
- Offer tentative interpretations using phrases like "It sounds like one layer might be...", "You might be noticing...".
- Reinforce user agency: they know themselves best.`;
    } else if (mode === 'solve') {
      systemInstruction += `\n\nACTIVE MODE: "HELP ME SOLVE IT"
- Priority: Actionable clarity, practical pathways, and structured options.
- Break down the challenge into 2-3 manageable steps or clear decision trade-offs.`;
    } else if (mode === 'express') {
      systemInstruction += `\n\nACTIVE MODE: "HELP ME EXPRESS IT"
- Priority: Assist user in articulating unspoken thoughts, drafting words they struggle to say, or composing a private unsent letter.`;
    } else if (mode === 'brainstorm') {
      systemInstruction += `\n\nACTIVE MODE: "ACTIONABLE BRAINSTORM"
- Offer diverse, unconventional, high-leverage ideas categorized into immediate actions, medium-term options, and bold experiments.`;
    } else if (mode === 'summary') {
      systemInstruction += `\n\nACTIVE MODE: "EXECUTIVE SYNTHESIS"
- Distill the user's reflection into core themes, primary tensions, emotional tone, and key insights.`;
    } else if (mode === 'socratic') {
      systemInstruction += `\n\nACTIVE MODE: "SOCRATIC INQUIRY"
- Ask 3 penetrating, perspective-shifting questions to examine assumptions beneath the surface.`;
    } else if (mode === 'reframing') {
      systemInstruction += `\n\nACTIVE MODE: "COGNITIVE REFRAMING"
- Offer a resilient, growth-oriented perspective without toxic positivity or dismissing valid pain.`;
    }

    if (cycleContext && typeof cycleContext === 'string') {
      systemInstruction += `\n\nOPTIONAL USER CONTEXT (Cycle Awareness):
${cycleContext}
(Note: Treat cycle information strictly as gentle non-prescriptive context if relevant, using non-definitive phrasing such as "Some people notice energy changes around this time...", and never claim their emotions are solely caused by hormones).`;
    }

    // Build multi-turn contents format
    const contents: any[] = [];

    if (journalContext && typeof journalContext === 'string') {
      contents.push({
        role: 'user',
        parts: [{ text: `[Context / Active Topic]:\n${journalContext}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: `Understood. I will hold this context in mind as we talk.` }],
      });
    }

    if (Array.isArray(history)) {
      for (const turn of history) {
        if (turn && typeof turn === 'object' && turn.role && turn.content) {
          const role = turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user';
          contents.push({
            role,
            parts: [{ text: String(turn.content) }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: prompt.trim() }],
    });

    const result = await generateContentWithFallback({
      contents,
      systemInstruction,
      temperature: 0.65,
    });

    res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/ai/reflect Error]:', error);
    res.status(500).json({
      error: error?.message || 'Failed to process AI reflection request.',
    });
  }
});

// 4. Emotion Exploration Endpoint (Tentative possibilities from Vent Out)
app.post('/api/ai/emotion-explore', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { ventText } = body;

    if (!ventText || typeof ventText !== 'string' || ventText.trim().length === 0) {
      res.status(400).json({ error: 'Valid "ventText" string is required.' });
      return;
    }

    const systemInstruction = `You are an emotionally perceptive assistant helping a user explore the nuanced feelings underneath their raw vent.
Generate 2 to 4 tentative emotional possibilities.
Rules:
- NEVER diagnose any condition.
- Use humble, tentative language (e.g., "A feeling of having too much on your shoulders", "Frustration when effort feels invisible").
- Do not assume you know better than the user.
- Output MUST be valid JSON conforming to this schema:
[
  {
    "id": "emo_1",
    "name": "Overwhelm from Invisible Expectations",
    "tentativeDescription": "It sounds like you might be carrying demands that others don't fully see.",
    "subtext": "Tension between wanting to do well and feeling drained",
    "suggestedPrompt": "Explore what boundaries feel most crossed right now"
  }
]`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: `Here is the user's raw thoughts:\n\n${ventText}` }] }],
      systemInstruction,
      temperature: 0.4,
      responseMimeType: 'application/json',
    });

    let emotions = [];
    try {
      emotions = JSON.parse(result.text);
    } catch {
      emotions = [
        {
          id: 'emo_1',
          name: 'Unspoken Tension',
          tentativeDescription: 'You might be feeling caught between conflicting expectations.',
          subtext: 'Holding back feelings to keep peace',
          suggestedPrompt: 'What is the hardest thing to say out loud right now?',
        },
      ];
    }

    res.json({
      emotions,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/ai/emotion-explore Error]:', error);
    res.status(500).json({
      error: error?.message || 'Failed to explore emotions.',
    });
  }
});

// 5. Vent Transformation Endpoint ("Turn This Into Something")
app.post('/api/ai/transform-vent', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { ventText, transformType } = body;

    if (!ventText || typeof ventText !== 'string' || ventText.trim().length === 0) {
      res.status(400).json({ error: 'Valid "ventText" string is required.' });
      return;
    }

    let targetGoal = '';
    if (transformType === 'letter_self') {
      targetGoal = 'Transform this raw expression into a compassionate, grounded Letter to Myself. Write in first person ("Dear me,..."), validate what was felt with warm understanding, and offer gentle self-kindness.';
    } else if (transformType === 'letter_unsent') {
      targetGoal = 'Transform this raw emotion into a clear, honest "Letter I Won\'t Send". Help express the full boundary, hurt, or truth cleanly without holding back, designed solely for personal clarity and cathartic release.';
    } else if (transformType === 'problem_statement') {
      targetGoal = 'Extract and define the core problem statement underneath this vent: What is actually happening, why it matters so much right now, and what is within personal control vs outside control.';
    } else if (transformType === 'action_plan') {
      targetGoal = 'Distill this raw vent into a realistic, low-friction "Tiny Action Plan": 2-3 very small, concrete steps that can restore momentum or relief today.';
    } else {
      targetGoal = 'Synthesize this vent into an intimate, reflective personal journal entry. Write in a thoughtful, authentic, first-person journal voice ("Today I felt...", "What is really going on is..."). It should read like an honest, beautifully written personal diary entry that brings clarity and emotional resolution, exactly like a natural conversational journal or daily thought entry without stiff corporate headers.';
    }

    const systemInstruction = `You are a thoughtful, authentic personal journaling companion.
Your task: ${targetGoal}
Guidelines:
- Write naturally, warmly, and fluidly in the user's own authentic reflective voice.
- Avoid robotic AI tropes, stiff corporate summaries, or clinical meta-analysis.
- Ensure the tone matches a deep, genuine journal entry with natural paragraph transitions and honest introspection.
- Format with clean, readable Markdown and paragraphs.`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: `Raw vent content:\n\n${ventText}` }] }],
      systemInstruction,
      temperature: 0.5,
    });

    res.json({
      transformedText: result.text,
      transformType,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/ai/transform-vent Error]:', error);
    res.status(500).json({
      error: error?.message || 'Failed to transform vent.',
    });
  }
});

// 6. Pattern Identification Endpoint ("Patterns I've Noticed")
app.post('/api/ai/patterns', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { summariesOrSnippets = [] } = body;

    if (!Array.isArray(summariesOrSnippets) || summariesOrSnippets.length === 0) {
      res.json({
        patterns: [],
        message: 'More journal entries are needed to observe recurring patterns.',
      });
      return;
    }

    const entriesCompilation = summariesOrSnippets.slice(0, 15).join('\n---\n');

    const systemInstruction = `You are an insightful, cautious pattern-recognition companion for a personal journal.
Analyze these entry summaries/snippets to identify 2-3 gentle, constructive patterns.
Rules:
- NEVER diagnose. Use humble phrasing like "You seem to notice energy dips when...", "A recurring desire for creative freedom appears when...".
- Each pattern must include an observation, a theme, and an encouraging question to explore.
- Return strictly JSON array:
[
  {
    "id": "pat_1",
    "theme": "Rest vs. Output",
    "observation": "You often express self-criticism on days with fewer checkmarks, even when doing deep emotional work.",
    "sampleCount": 3,
    "suggestedQuestion": "What does a good day look like when productivity isn't measured by speed?"
  }
]`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: `Here are recent journal excerpts:\n\n${entriesCompilation}` }] }],
      systemInstruction,
      temperature: 0.4,
      responseMimeType: 'application/json',
    });

    let patterns = [];
    try {
      patterns = JSON.parse(result.text);
    } catch {
      patterns = [];
    }

    res.json({
      patterns,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/ai/patterns Error]:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate pattern observations.',
    });
  }
});

// 7. Comparative Growth Endpoint ("Then Me vs Now Me")
app.post('/api/ai/compare-growth', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { thenText, nowText, thenDate, nowDate } = body;

    if (!thenText || !nowText) {
      res.status(400).json({ error: 'Both "thenText" and "nowText" are required for comparison.' });
      return;
    }

    const systemInstruction = `You are a gentle, supportive biographer and reflection companion.
Compare the user's past journal entry ("Then Me", from ${thenDate || 'earlier'}) with their current entry ("Now Me", from ${nowDate || 'today'}).
Highlight:
1. **The Shift in Perspective** (How they view themselves or the situation differently)
2. **Growth & Resilience Noticed** (What strength, calm, or boundary has developed)
3. **What is Still Unfolding** (A gentle affirmation for what remains in progress)
Keep the tone grounded, uplifting, and realistic.`;

    const result = await generateContentWithFallback({
      contents: [
        {
          role: 'user',
          parts: [
            { text: `THEN ENTRY (${thenDate || 'Past'}):\n${thenText}\n\nNOW ENTRY (${nowDate || 'Present'}):\n${nowText}` },
          ],
        },
      ],
      systemInstruction,
      temperature: 0.5,
    });

    res.json({
      comparison: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/ai/compare-growth Error]:', error);
    res.status(500).json({
      error: error?.message || 'Failed to compare growth.',
    });
  }
});

// 8. Look Back Retrospective Endpoint ("Look Back at Me")
app.post('/api/ai/look-back', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { entriesText = '', timeframe = 'Recent weeks' } = body;

    if (!entriesText) {
      res.status(400).json({ error: 'Journal history text is required.' });
      return;
    }

    const systemInstruction = `You are an attentive, compassionate personal archivist creating a "Look Back at Me" retrospective across ${timeframe}.
Synthesize the entries into:
1. **Dominant Themes of Your Thinking** (What had your attention)
2. **Challenges You Navigated or Overcame** (Quiet resilience demonstrated)
3. **Questions That Kept Returning** (Inquiries worth carrying forward)
4. **A Gentle Closing Reflection** (1-2 sentences of grounded warmth)
Format with clean Markdown and clear typography.`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: `Journal history:\n\n${entriesText}` }] }],
      systemInstruction,
      temperature: 0.45,
    });

    res.json({
      synthesis: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/ai/look-back Error]:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate retrospective synthesis.',
    });
  }
});

// 9. Entry Summarization Endpoint
app.post('/api/ai/summarize', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { content, title = 'Journal Entry' } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Valid "content" string is required for summarization.' });
      return;
    }

    const systemInstruction = `You are a thoughtful executive editor and cognitive reflection companion.
Analyze the following reflection entry titled "${title}".
Provide a concise, beautifully formatted synthesis with:
1. **Core Thesis & Emotional Atmosphere** (1-2 sentences)
2. **Key Insights & Revelations** (3-4 bullet points)
3. **Actionable Commitments / Next Steps** (2-3 clear bullets)
4. **Suggested Follow-up Inquiry** (1 thoughtful question for tomorrow)`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: content }] }],
      systemInstruction,
      temperature: 0.4,
    });

    res.json({
      summary: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/ai/summarize Error]:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate entry summary.',
    });
  }
});

// 10. Concise Auto-Title Generation for Talk Sessions & Reflective Journals
app.post('/api/ai/generate-title', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { text, type = 'talk' } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Valid "text" string is required for title generation.' });
      return;
    }

    const isTalk = type === 'talk';
    const systemInstruction = isTalk
      ? `You are an expert at generating short, compassionate, 3-6 word human titles for personal reflection and talk conversations.
Rules:
- Generate ONLY the title string, no quotes, no preamble, no period at the end.
- Keep it concise, natural, and human-readable (e.g., "Feeling stuck with work", "Understanding a difficult decision", "Career uncertainty", "Exploring feelings of overwhelm").
- Do not exceed 6 words.
- Never use clinical labels or dramatic phrasing.`
      : `You are an expert at generating short, elegant, 3-6 word titles for reflective journal entries.
Rules:
- Generate ONLY the title string, no quotes, no preamble, no period at the end.
- Keep it warm, grounded, and safe to display (e.g., "Finding clarity in uncertainty", "Understanding what I was feeling", "Reflecting on a difficult day", "Setting gentle boundaries").
- Do not exceed 6 words.
- Do not include raw private vent phrases.`;

    const sample = text.slice(0, 1500);
    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: `Generate a short 3-6 word title for this:\n\n${sample}` }] }],
      systemInstruction,
      temperature: 0.3,
    });

    let cleanTitle = result.text.trim().replace(/^["'`]|["'`]$/g, '').replace(/\.$/, '');
    if (!cleanTitle || cleanTitle.length < 2) {
      cleanTitle = isTalk ? 'Reflection Conversation' : 'Reflective Journal Entry';
    }

    res.json({
      title: cleanTitle,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/ai/generate-title Error]:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate title.',
    });
  }
});

// 11. Vite Middleware for Full-Stack Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aetheria Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

