import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_MOODS = new Set([
  "peaceful", "anxious", "joyful", "confused", "sad", "excited", "fearful", "neutral",
]);

// Canonical emoji for each mood — fallback when Gemini returns a word instead of an emoji
const MOOD_EMOJI: Record<string, string> = {
  peaceful: "😌", anxious: "😰", joyful: "😊",
  confused: "😕", sad: "😢", excited: "🤩",
  fearful: "😨", neutral: "😐",
};

const MOOD_GRADIENTS: Record<string, readonly [string, string]> = {
  peaceful: ["#5B8DEF", "#7C5CFC"],
  anxious:  ["#EF4444", "#F59E0B"],
  joyful:   ["#F59E0B", "#F472B6"],
  confused: ["#8B5CF6", "#EC4899"],
  sad:      ["#3B82F6", "#6366F1"],
  excited:  ["#F472B6", "#F59E0B"],
  fearful:  ["#6366F1", "#1E1B4B"],
  neutral:  ["#6B7280", "#9CA3AF"],
};

// Returns true only if the string contains a real Unicode emoji (not ASCII text)
function isEmoji(str: string): boolean {
  return /\p{Emoji}/u.test(str) && !/^[\x00-\x7F]+$/.test(str.trim());
}

// Parse JSON robustly — handles direct JSON (response_mime_type path) and markdown-fenced fallback
function parseJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();

  // 1. Direct parse — expected path when response_mime_type is set
  try { return JSON.parse(trimmed); } catch {}

  // 2. Strip markdown fences and retry
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  try { return JSON.parse(stripped); } catch {}

  // 3. Extract outermost braces (last resort)
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }

  throw new Error("Could not parse the dream analysis. Please try again.");
}

// Schema that tells Gemini exactly what to return — enforces field types and valid mood names
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    transcription:  { type: "STRING" },
    title:          { type: "STRING" },
    summary:        { type: "STRING" },
    moods: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          mood:       { type: "STRING", enum: [...VALID_MOODS] },
          confidence: { type: "NUMBER" },
          emoji:      { type: "STRING" },
        },
        required: ["mood", "confidence", "emoji"],
      },
    },
    symbols: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name:         { type: "STRING" },
          emoji:        { type: "STRING" },
          meaning_short: { type: "STRING" },
        },
        required: ["name", "emoji", "meaning_short"],
      },
    },
    interpretation: { type: "STRING" },
  },
  required: ["transcription", "title", "summary", "moods", "symbols", "interpretation"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { audioBase64, mimeType, interpretationStyle, recurringSymbols, voiceLanguage } =
      await req.json();

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: "audioBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      throw new Error("Our dream interpreter is temporarily unavailable. Please try again later.");
    }

    const style = interpretationStyle || "mixed";
    const symbolsNote = recurringSymbols?.length
      ? `\nRecurring symbols from past dreams (reuse these exact names if the same concept appears): ${recurringSymbols.join(", ")}.`
      : "";
    const langInstruction =
      voiceLanguage && voiceLanguage !== "english"
        ? `\nRespond in ${voiceLanguage}. The audio may be in ${voiceLanguage} — transcribe in the original language.`
        : "";

    const prompt =
      `Listen carefully to this audio. It may contain someone describing a dream, or it may be silent, background noise, or unclear speech.${langInstruction}\n\n` +
      `CRITICAL: Transcribe only what you actually hear. Do NOT invent or guess content. ` +
      `If the audio is silent or unintelligible, set "transcription" to "" and all other fields to empty defaults.\n\n` +
      `If you hear a dream being described, transcribe it verbatim and analyze it using a ${style} approach.\n\n` +
      `Fields:\n` +
      `- transcription: Verbatim speech, or "" if none\n` +
      `- title: Evocative title max 6 words, or ""\n` +
      `- summary: 2-3 sentences of what happened, or ""\n` +
      `- moods: 1-3 moods. mood must be one of the enum values. confidence 0.0-1.0. emoji must be a real Unicode emoji character (e.g. 😊) not a word.\n` +
      `- symbols: 1-4 symbols. name lowercase singular (e.g. "rabbit"). emoji must be a real Unicode emoji (e.g. 🐇) not a word. meaning_short one sentence.\n` +
      `- interpretation: 2-4 sentences of deeper meaning, or ""${symbolsNote}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType || "audio/webm", data: audioBase64 } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: RESPONSE_SCHEMA,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const fetchOpts: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    };

    // First attempt
    let res = await fetch(url, fetchOpts);

    // Single automatic retry for transient server errors — transparent to the user
    if (!res.ok && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 2500));
      res = await fetch(url, fetchOpts);
    }

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error("We're receiving a lot of requests right now. Please wait a moment and try again.");
      }
      if (res.status >= 500) {
        throw new Error("Our dream interpreter is temporarily unavailable. Please try again in a moment.");
      }
      throw new Error("Something went wrong while processing your dream. Please try again.");
    }

    const data = await res.json();

    // Safety / content block check
    if (!data.candidates?.length) {
      const blockReason = data.promptFeedback?.blockReason;
      console.error("process-dream: no candidates, blockReason:", blockReason);
      throw new Error("Your recording couldn't be processed. Please try again.");
    }

    const candidate = data.candidates[0];

    // Truncated or safety-blocked response
    if (candidate.finishReason === "SAFETY") {
      throw new Error("Your recording couldn't be processed. Please try again with a different description.");
    }

    const rawText = candidate.content?.parts?.[0]?.text ?? "";
    if (!rawText) {
      throw new Error("No response was generated. Please try again.");
    }

    const analysis = parseJson(rawText);

    // No speech detected
    if (!(analysis.transcription as string)?.trim()) {
      throw new Error("No speech was detected in the recording. Please try again and speak clearly.");
    }

    // --- Normalize moods ---
    const rawMoods = Array.isArray(analysis.moods) ? analysis.moods : [];
    const normalizedMoods = rawMoods
      .filter((m: { mood?: string }) => m?.mood && VALID_MOODS.has(m.mood))
      .slice(0, 3)
      .map((m: { mood: string; confidence?: number; emoji?: string }) => ({
        mood: m.mood,
        confidence: Math.min(1, Math.max(0, typeof m.confidence === "number" ? m.confidence : 0.8)),
        emoji: isEmoji(m.emoji ?? "") ? m.emoji : (MOOD_EMOJI[m.mood] ?? "😐"),
        gradient: MOOD_GRADIENTS[m.mood] ?? MOOD_GRADIENTS.neutral,
      }));

    // Fallback to neutral if nothing valid came back
    analysis.moods = normalizedMoods.length > 0
      ? normalizedMoods
      : [{ mood: "neutral", confidence: 0.8, emoji: "😐", gradient: MOOD_GRADIENTS.neutral }];

    // --- Normalize symbols ---
    const rawSymbols = Array.isArray(analysis.symbols) ? analysis.symbols : [];
    analysis.symbols = rawSymbols
      .filter((s: { name?: string }) => s?.name)
      .slice(0, 4)
      .map((s: { name: string; emoji?: string; meaning_short?: string }) => ({
        name: s.name.toLowerCase().trim(),
        emoji: isEmoji(s.emoji ?? "") ? s.emoji : "",
        meaning_short: s.meaning_short ?? "",
      }));

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-dream error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
