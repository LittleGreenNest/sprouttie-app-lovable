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
    const body = await req.json().catch(() => ({}));
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the user's JWT from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const uid = user.id;

    // ─── STEP 1: Gather context ───
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const fourWeeksAgoStr = fourWeeksAgo.toISOString().split("T")[0];

    const [profileRes, spokenRes, flashcardsRes, backlogRes, trackingRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase
          .from("spoken_words")
          .select("word, word_stage")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("flashcards")
          .select("front, folder, card_status")
          .eq("user_id", uid)
          .neq("card_status", "retired"),
        supabase
          .from("word_plans")
          .select("word")
          .eq("user_id", uid),
        supabase
          .from("daily_tracking")
          .select("flashcard_id, date")
          .eq("user_id", uid)
          .eq("status", "flashed")
          .gte("date", fourWeeksAgoStr),
      ]);

    const profile = profileRes.data || {};
    const spokenWords = (spokenRes.data || []).map((w: any) => w.word);
    const activeFlashcards = flashcardsRes.data || [];
    const wordsInSets = activeFlashcards.map((f: any) => f.front);
    const wordsInBacklog = (backlogRes.data || []).map((w: any) => w.word);

    // Get distinct categories from flashcards flashed in last 4 weeks
    const flashedIds = new Set(
      (trackingRes.data || []).map((t: any) => t.flashcard_id)
    );
    const categoriesFlashed = [
      ...new Set(
        activeFlashcards
          .filter((f: any) => flashedIds.has(f.id))
          .map((f: any) => f.folder)
          .filter(Boolean)
      ),
    ];

    const childProfile = {
      ageBand: profile.child_age_band || null,
      targetLanguages: profile.target_language
        ? [profile.target_language]
        : [],
      speechLevel: profile.speech_level || null,
      replyPattern: profile.reply_pattern || null,
      dailyCommitment: profile.daily_time_commitment || null,
    };

    // ─── STEP 2: Build prompt and call AI ───
    const userMessage = `Here is the child's current profile and history. Suggest 5 words for next week.

Age band: ${childProfile.ageBand || "unknown"}
Target languages: ${childProfile.targetLanguages.length > 0 ? childProfile.targetLanguages.join(", ") : "not specified"}
Speech level: ${childProfile.speechLevel || "unknown"}
Reply pattern: ${childProfile.replyPattern || "unknown"}
Daily commitment: ${childProfile.dailyCommitment || "unknown"}

Categories flashed in last 4 weeks: ${categoriesFlashed.length > 0 ? categoriesFlashed.join(", ") : "none yet"}
Words the child has spoken recently: ${spokenWords.length > 0 ? spokenWords.join(", ") : "none logged yet"}
Words currently in flashcard sets: ${wordsInSets.length > 0 ? wordsInSets.join(", ") : "none"}
Words in backlog: ${wordsInBacklog.length > 0 ? wordsInBacklog.join(", ") : "none"}

Return exactly 5 word suggestions as a JSON array. No other text.`;

    const systemPrompt = `You are Sprouttie, a language strategist helping parents of babies and toddlers teach vocabulary through flashcards. You have a dry, warm, slightly posh personality. You speak to parents like a knowledgeable friend, not a clinical tool.

Your job is to suggest 5 words for the coming week's flashcard sets. Each word should be developmentally appropriate, build on what the child already knows, and provide good category variety.

You must respond ONLY with a valid JSON array. No preamble, no explanation outside the JSON, no markdown backticks. The array must contain exactly 5 objects with this structure:

[
  {
    "word": "string",
    "category": "string",
    "reason": "string (one sentence, written in Sprouttie's voice, referencing something specific from the child's history)"
  }
]`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
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
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI call failed");
    }

    const aiData = await aiResponse.json();
    let rawContent =
      aiData.choices?.[0]?.message?.content || "";

    // Strip markdown fences if present
    rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let suggestions: any[];
    try {
      suggestions = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(
        JSON.stringify({ error: "parse_failed", raw: rawContent }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return new Response(
        JSON.stringify({ error: "parse_failed", raw: rawContent }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── STEP 3: Write to Supabase ───
    // Use weekStart from client if provided, otherwise calculate UTC
    let weekStart = body?.weekStart;
    if (!weekStart) {
      const now = new Date();
      const day = now.getUTCDay();
      const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
      const wsDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
      weekStart = wsDate.toISOString().split("T")[0];
    }

    // Delete existing pending suggestions for this week
    await supabase
      .from("weekly_suggestions")
      .delete()
      .eq("user_id", uid)
      .eq("week_start", weekStart)
      .eq("status", "pending_review");

    // Insert new suggestions
    const rows = suggestions.slice(0, 5).map((s: any) => ({
      user_id: uid,
      week_start: weekStart,
      word: s.word,
      category: s.category || null,
      reason: s.reason || null,
      status: "pending_review",
    }));

    const { error: insertError } = await supabase
      .from("weekly_suggestions")
      .insert(rows);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "save_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-autopilot-suggestions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
