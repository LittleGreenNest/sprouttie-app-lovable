import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, category } = await req.json();
    if (!word) throw new Error("word is required");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Get child profile for context
    const { data: profile } = await supabase
      .from("profiles")
      .select("child_age_band, target_language, speech_level")
      .eq("id", user.id)
      .single();

    // Get existing words to avoid duplicates
    const { data: flashcards } = await supabase
      .from("flashcards")
      .select("front")
      .eq("user_id", user.id)
      .neq("card_status", "retired");

    const existingWords = (flashcards || []).map((f: any) => f.front?.toLowerCase());

    const userMessage = `I need 3 alternative words to replace "${word}" in the "${category || "general"}" category for a child's flashcard set.

Child age band: ${profile?.child_age_band || "unknown"}
Target language: ${profile?.target_language || "not specified"}
Speech level: ${profile?.speech_level || "unknown"}

Words already in the child's sets (avoid these): ${existingWords.slice(0, 30).join(", ") || "none"}

Return exactly 3 alternative words as a JSON array of strings. No other text. Example: ["word1", "word2", "word3"]`;

    const aiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash-preview-04-17",
          messages: [
            {
              role: "system",
              content:
                "You are Sprouttie, a language strategist for babies and toddlers. Suggest developmentally appropriate vocabulary alternatives. Respond ONLY with a JSON array of 3 strings. No markdown, no explanation.",
            },
            { role: "user", content: userMessage },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI call failed");
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content || "";
    rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let alternatives: string[];
    try {
      alternatives = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(
        JSON.stringify({ error: "parse_failed" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(alternatives)) {
      return new Response(
        JSON.stringify({ error: "parse_failed" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out the current word and existing words
    const filtered = alternatives
      .filter((a: string) => typeof a === "string" && a.toLowerCase() !== word.toLowerCase() && !existingWords.includes(a.toLowerCase()))
      .slice(0, 3);

    return new Response(
      JSON.stringify({ alternatives: filtered }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-swap-alternatives error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
