import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Canonical emoji for each mood — used as fallback if Gemini returns a word instead of an emoji
const MOOD_EMOJI: Record<string, string> = {
  peaceful: '😌', anxious: '😰', joyful: '😊',
  confused: '😕', sad: '😢', excited: '🤩',
  fearful: '😨', neutral: '😐',
};

// Returns true if the string contains at least one actual emoji codepoint
function isEmoji(str: string): boolean {
  return /\p{Emoji}/u.test(str) && !/^[\x00-\x7F]+$/.test(str.trim());
}

const MOOD_GRADIENTS: Record<string, readonly [string, string]> = {
  peaceful: ["#5B8DEF", "#7C5CFC"],
  anxious: ["#EF4444", "#F59E0B"],
  joyful: ["#F59E0B", "#F472B6"],
  confused: ["#8B5CF6", "#EC4899"],
  sad: ["#3B82F6", "#6366F1"],
  excited: ["#F472B6", "#F59E0B"],
  fearful: ["#6366F1", "#1E1B4B"],
  neutral: ["#6B7280", "#9CA3AF"],
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
      throw new Error("GEMINI_API_KEY is not configured on this server");
    }

    const style = interpretationStyle || "mixed";
    const symbols = recurringSymbols?.length
      ? `\nThe user has these recurring symbols from past dreams: ${recurringSymbols.join(", ")}.`
      : "";
    const langInstruction =
      voiceLanguage && voiceLanguage !== "english"
        ? `\nRespond in ${voiceLanguage}. The audio may be in ${voiceLanguage} — transcribe it in the original language.`
        : "";

    const prompt =
      `Listen carefully to this audio recording. It may contain someone describing a dream, or it may be silent, contain only background noise, or be too unclear to understand.${langInstruction}\n\n` +
      `IMPORTANT: Only transcribe speech that you can actually hear. Do NOT invent, guess, or hallucinate content. If the audio is silent, contains no intelligible speech, or you cannot make out what is being said, you MUST set "transcription" to an empty string "" and all other fields to empty defaults.\n\n` +
      `If clear speech describing a dream is present, transcribe it verbatim and analyze it using a ${style} interpretation approach.\n\n` +
      `Return ONLY a JSON object (no markdown, no code fences) with these exact fields:\n` +
      `- "transcription": The full verbatim text of what the person said, or "" if no clear speech was detected\n` +
      `- "title": A short, evocative title for the dream (max 6 words), or "" if no speech\n` +
      `- "summary": A 2-3 sentence summary of what happened in the dream, or "" if no speech\n` +
      `- "moods": Array of 1-3 objects with "mood" (one of: peaceful, anxious, joyful, confused, sad, excited, fearful, neutral), "confidence" (0-1), "emoji" (a single Unicode emoji character — e.g. 😊 not the word "joyful"). Empty array if no speech.\n` +
      `- "symbols": Array of 1-4 objects with "name" (lowercase, singular — e.g. "rabbit" not "Rabbit" or "rabbits"), "emoji" (a single Unicode emoji character representing the symbol — e.g. 🐇 not the word "rabbit"), "meaning_short" (one sentence meaning). Keep meaningful modifiers that change the symbol's meaning: "chocolate rabbit" and "rabbit" are distinct symbols, but "rabbits" and "rabbit" are the same. If recurring symbols are listed below, reuse those exact names when the same concept appears. Empty array if no speech.\n` +
      `- "interpretation": 2-4 sentence interpretation of the dream's deeper meaning, or "" if no speech${symbols}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType || "audio/webm", data: audioBase64 } },
                { text: prompt },
              ],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gemini did not return valid JSON");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    if (!analysis.transcription?.trim()) {
      throw new Error(
        "No speech was detected in the recording. Please try again and speak clearly."
      );
    }

    if (analysis.moods) {
      analysis.moods = analysis.moods.map((m: { mood: string; emoji?: string; [key: string]: unknown }) => ({
        ...m,
        // Fall back to the canonical emoji if Gemini returned a word instead
        emoji: isEmoji(m.emoji ?? '') ? m.emoji : (MOOD_EMOJI[m.mood] ?? '😐'),
        gradient: MOOD_GRADIENTS[m.mood] ?? MOOD_GRADIENTS.neutral,
      }));
    }

    if (analysis.symbols) {
      analysis.symbols = analysis.symbols.map((s: { emoji?: string; [key: string]: unknown }) => ({
        ...s,
        // If Gemini returned a word for the symbol emoji, strip it — client can show name only
        emoji: isEmoji(s.emoji ?? '') ? s.emoji : '',
      }));
    }

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
