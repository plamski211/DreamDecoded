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
    const { dreamSummaries, dreamCount } = await req.json();

    if (!dreamSummaries) {
      return new Response(
        JSON.stringify({ error: "dreamSummaries is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      throw new Error("Our dream interpreter is temporarily unavailable. Please try again later.");
    }

    const prompt =
      `You are a dream analyst. Based on these ${dreamCount} dreams from the past week, ` +
      `write a brief (3-5 sentence) weekly dream report. Identify overall themes, emotional patterns, ` +
      `and what the dreamer's subconscious might be processing. Be warm and insightful.\n\n${dreamSummaries}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 512 },
        }),
      }
    );

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error("We're receiving a lot of requests right now. Please wait a moment and try again.");
      }
      if (res.status >= 500) {
        throw new Error("Our dream interpreter is temporarily unavailable. Please try again in a moment.");
      }
      throw new Error("Something went wrong generating your report. Please try again.");
    }

    const data = await res.json();
    const report = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-report error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
