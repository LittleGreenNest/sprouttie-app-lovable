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

    const uid = user.id;

    // ─── STEP 1: Gather context ───
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const fourWeeksAgoStr = fourWeeksAgo.toISOString().split("T")[0];

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

    const [
      profileRes,
      spokenRes,
      flashcardsRes,
      backlogRes,
      trackingRes,
      pastSuggestionsRes,
      weeklyLogsRes,
      sessionsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase
        .from("spoken_words")
        .select("word, word_stage, notes")
        .eq("user_id", uid)
        .order("stage_updated_at", { ascending: false })
        .limit(80),
      supabase
        .from("flashcards")
        .select("id, front, folder, card_status")
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
      supabase
        .from("weekly_suggestions")
        .select("word, week_start, status")
        .eq("user_id", uid)
        .gte("week_start", fourWeeksAgoStr),
      supabase
        .from("weekly_logs")
        .select("log_type, content, context, created_at")
        .eq("user_id", uid)
        .gte("week_start", twoWeeksAgoStr)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("daily_flashing_sessions")
        .select("notes, books_read, session_date")
        .eq("user_id", uid)
        .gte("session_date", twoWeeksAgoStr)
        .not("notes", "is", null)
        .order("session_date", { ascending: false })
        .limit(20),
    ]);

    const profile = profileRes.data || {};
    const spokenWords = spokenRes.data || [];
    const activeFlashcards = flashcardsRes.data || [];
    const wordsInSets = activeFlashcards.map((f: any) => f.front);
    const wordsInBacklog = (backlogRes.data || []).map((w: any) => w.word);
    const pastSuggestions = (pastSuggestionsRes.data || []).map((s: any) => s.word);
    const weeklyLogs = weeklyLogsRes.data || [];
    const sessions = sessionsRes.data || [];

    // Words child can already say (any stage) — strong exclusion signal
    const spokenWordsList = spokenWords.map((w: any) => w.word);
    const ownedWords = spokenWords.filter((w: any) => w.word_stage === "owned").map((w: any) => w.word);
    const growingWords = spokenWords.filter((w: any) => w.word_stage === "growing").map((w: any) => w.word);

    // Build comprehensive exclusion list (lowercase for matching)
    const exclusionSet = new Set(
      [...wordsInSets, ...wordsInBacklog, ...pastSuggestions, ...spokenWordsList]
        .filter(Boolean)
        .map((w: string) => w.toLowerCase().trim())
    );
    const exclusionList = Array.from(exclusionSet);

    // Categories flashed recently
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

    // Recent log highlights — what parents observed
    const saidLogs = weeklyLogs.filter((l: any) => l.log_type === "said").map((l: any) => l.content);
    const attemptedLogs = weeklyLogs.filter((l: any) => l.log_type === "attempted").map((l: any) => l.content);
    const readLogs = weeklyLogs.filter((l: any) => l.log_type === "read").map((l: any) => l.content);
    const sessionNotes = sessions.map((s: any) => s.notes).filter(Boolean);

    const childProfile = {
      ageBand: profile.child_age_band || null,
      targetLanguages: profile.target_language ? [profile.target_language] : [],
      speechLevel: profile.speech_level || null,
      replyPattern: profile.reply_pattern || null,
      dailyCommitment: profile.daily_time_commitment || null,
    };

    // ─── STEP 2: Build prompt ───
    const userMessage = `Suggest 5 NEW words for next week's flashcard sets.

CHILD PROFILE
- Age band: ${childProfile.ageBand || "unknown"}
- Target languages: ${childProfile.targetLanguages.join(", ") || "not specified"}
- Speech level: ${childProfile.speechLevel || "unknown"}
- Reply pattern: ${childProfile.replyPattern || "unknown"}
- Daily commitment: ${childProfile.dailyCommitment || "unknown"}

WHAT THE CHILD CAN ALREADY SAY
- Owned (says confidently): ${ownedWords.slice(0, 30).join(", ") || "none yet"}
- Growing (emerging): ${growingWords.slice(0, 30).join(", ") || "none yet"}

RECENT PARENT OBSERVATIONS (last 2 weeks)
- Words child said spontaneously: ${saidLogs.slice(0, 15).join("; ") || "none logged"}
- Words child attempted: ${attemptedLogs.slice(0, 15).join("; ") || "none logged"}
- Books/contexts read: ${readLogs.slice(0, 10).join("; ") || "none logged"}
- Session notes from parent: ${sessionNotes.slice(0, 10).join(" | ") || "none"}

RECENT TEACHING CONTEXT
- Categories flashed in last 4 weeks: ${categoriesFlashed.join(", ") || "none yet"}

❌ DO NOT SUGGEST any of these words (already in sets, backlog, previously suggested, or already spoken):
${exclusionList.slice(0, 200).join(", ") || "(none)"}

REQUIREMENTS
1. Every suggested word MUST be brand new — not in the exclusion list above (case-insensitive).
2. Build on what the child knows: if they own animal words, try animal sounds or related verbs. If they say "milk", try "cup" or "drink".
3. Vary categories — don't repeat a category already heavily flashed unless there's a clear reason.
4. Reference SPECIFIC observations in your reasoning (e.g. "you mentioned bath time" or "since they're saying 'mama' confidently").
5. Return exactly 5 word suggestions as a JSON array. No other text.`;

    const systemPrompt = `You are Sprouttie, a language strategist helping parents of babies and toddlers teach vocabulary through flashcards. You have a dry, warm, slightly posh personality — a knowledgeable friend, not a clinical tool.

Your job: suggest 5 fresh, developmentally appropriate words for the coming week. Each word must be NEW (not in the exclusion list), build on what the child already knows, and provide variety.

Respond ONLY with a valid JSON array. No preamble, no markdown fences. Exactly 5 objects:

[
  {
    "word": "string",
    "category": "string",
    "reason": "string (one sentence in Sprouttie's voice, referencing something specific from the child's history or recent observations)"
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
          model: "google/gemini-2.5-flash",
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
    let rawContent = aiData.choices?.[0]?.message?.content || "";
    rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let suggestions: any[];
    try {
      suggestions = JSON.parse(rawContent);
    } catch {
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

    // Post-filter: drop any AI-returned words that slipped through the exclusion list
    const filtered = suggestions.filter(
      (s: any) => s?.word && !exclusionSet.has(String(s.word).toLowerCase().trim())
    );
    const finalSuggestions = (filtered.length >= 3 ? filtered : suggestions).slice(0, 5);

    // ─── STEP 3: Write to Supabase ───
    let weekStart = body?.weekStart;
    if (!weekStart) {
      const now = new Date();
      const day = now.getUTCDay();
      const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
      const wsDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
      weekStart = wsDate.toISOString().split("T")[0];
    }

    await supabase
      .from("weekly_suggestions")
      .delete()
      .eq("user_id", uid)
      .eq("week_start", weekStart)
      .eq("status", "pending_review");

    const rows = finalSuggestions.map((s: any) => ({
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
      JSON.stringify({
        success: true,
        count: rows.length,
        excluded: exclusionList.length,
        droppedFromAI: suggestions.length - filtered.length,
      }),
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
