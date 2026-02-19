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
    const { message, conversation_history, dream_context, voice_language } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY is not configured on this server");
    }

    const langNote =
      voice_language && voice_language !== "english" ? ` Respond in ${voice_language}.` : "";

    const systemContext = dream_context
      ? `You are a thoughtful dream analyst. Be warm, insightful, and concise (2-4 sentences).${langNote}\n\nDream context:\n- Title: ${dream_context.title}\n- What happened: ${dream_context.transcription}\n- Summary: ${dream_context.summary}\n- Interpretation: ${dream_context.interpretation ?? "Not yet interpreted"}\n\n`
      : `You are a thoughtful dream analyst. Be warm, insightful, and concise.${langNote}\n\n`;

    const history = ((conversation_history as { role: string; content: string }[]) ?? [])
      .map((m) => `${m.role === "user" ? "User" : "Analyst"}: ${m.content}`)
      .join("\n");

    const prompt = `${systemContext}${history ? `Conversation so far:\n${history}\n\n` : ""}User: ${message}\n\nAnalyst:`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const response = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ask-dream error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
