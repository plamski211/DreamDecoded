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
    const { title, summary, moods } = await req.json();

    if (!title || !summary) {
      return new Response(
        JSON.stringify({ error: "title and summary are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const moodText = moods?.length ? ` The mood is ${moods.join(", ")}.` : "";
    const prompt = `Create a dreamy, surreal, artistic illustration for a dream titled "${title}". ${summary}${moodText} Style: ethereal, soft colors, dreamlike atmosphere, digital art. Do not include any text or words in the image.`;

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`DALL-E API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const art_url = data.data?.[0]?.url;

    if (!art_url) {
      throw new Error("No image URL returned from DALL-E");
    }

    return new Response(
      JSON.stringify({ art_url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-dream-art error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
