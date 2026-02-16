import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transcription, interpretation_style, recurring_symbols } = await req.json();

    if (!transcription) {
      return new Response(
        JSON.stringify({ error: "transcription is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const style = interpretation_style || "mixed";
    const symbols = recurring_symbols?.length
      ? `\n\nThe user has these recurring symbols from past dreams: ${recurring_symbols.join(", ")}.`
      : "";

    const systemPrompt = `You are a dream analyst. Analyze dreams using a ${style} interpretation approach. Be insightful but concise. Always respond with valid JSON only — no markdown, no code fences.`;

    const userPrompt = `Analyze this dream transcription and return a JSON object with these exact fields:
- "title": A short, evocative title for the dream (max 6 words)
- "summary": A 2-3 sentence summary of what happened in the dream
- "moods": An array of 1-3 mood objects, each with "mood" (one of: peaceful, anxious, joyful, confused, sad, excited, fearful, neutral), "confidence" (0-1), and "emoji" (matching emoji)
- "symbols": An array of 1-4 symbol objects, each with "name" (symbol name), "emoji" (matching emoji), "meaning_short" (one sentence meaning)
- "interpretation": A 2-4 sentence interpretation of the dream's deeper meaning${symbols}

Dream transcription:
"${transcription}"`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        messages: [{ role: "user", content: userPrompt }],
        system: systemPrompt,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Claude API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";

    // Parse the JSON from Claude's response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Claude did not return valid JSON");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Add gradient colors to moods
    const moodGradients: Record<string, readonly [string, string]> = {
      peaceful: ["#5B8DEF", "#7C5CFC"],
      anxious: ["#EF4444", "#F59E0B"],
      joyful: ["#F59E0B", "#F472B6"],
      confused: ["#8B5CF6", "#EC4899"],
      sad: ["#3B82F6", "#6366F1"],
      excited: ["#F472B6", "#F59E0B"],
      fearful: ["#6366F1", "#1E1B4B"],
      neutral: ["#6B7280", "#9CA3AF"],
    };

    if (analysis.moods) {
      analysis.moods = analysis.moods.map((m: any) => ({
        ...m,
        gradient: moodGradients[m.mood] ?? moodGradients.neutral,
      }));
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("analyze-dream error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
