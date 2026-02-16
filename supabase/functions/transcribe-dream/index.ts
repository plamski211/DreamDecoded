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
    const { audio_path } = await req.json();

    if (!audio_path) {
      return new Response(
        JSON.stringify({ error: "audio_path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download audio from Supabase Storage
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: audioData, error: downloadError } = await supabaseAdmin.storage
      .from("dream-audio")
      .download(audio_path);

    if (downloadError || !audioData) {
      throw new Error(`Failed to download audio: ${downloadError?.message ?? "no data"}`);
    }

    // Determine file extension for Whisper
    const ext = audio_path.split(".").pop() ?? "m4a";
    const filename = `recording.${ext}`;

    // Send to OpenAI Whisper API
    const formData = new FormData();
    formData.append("file", new File([audioData], filename, { type: `audio/${ext}` }));
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errBody = await whisperRes.text();
      throw new Error(`Whisper API error (${whisperRes.status}): ${errBody}`);
    }

    const { text: transcription } = await whisperRes.json();

    return new Response(
      JSON.stringify({ transcription }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("transcribe-dream error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
