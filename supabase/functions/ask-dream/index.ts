import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { dream_id, message, conversation_history } = await req.json();

    if (!dream_id || !message) {
      return new Response(
        JSON.stringify({ error: "dream_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Fetch dream context from database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from("dreams")
      .select("title, transcription, summary, interpretation, moods, symbols")
      .eq("id", dream_id)
      .single();

    if (dreamError || !dream) {
      throw new Error(`Dream not found: ${dreamError?.message ?? "no data"}`);
    }

    const systemPrompt = `You are a thoughtful dream analyst having a conversation about someone's dream. Be warm, insightful, and concise (2-4 sentences per response). Reference specific details from the dream when relevant.

Dream context:
- Title: ${dream.title}
- What happened: ${dream.transcription}
- Summary: ${dream.summary}
- Interpretation: ${dream.interpretation ?? "Not yet interpreted"}
- Moods: ${JSON.stringify(dream.moods)}
- Symbols: ${JSON.stringify(dream.symbols)}`;

    const messages = [
      ...(conversation_history ?? []).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 512,
        messages,
        system: systemPrompt,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Claude API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const response = data.content?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ask-dream error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
