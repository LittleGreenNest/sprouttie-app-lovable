import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Lightweight morphological / variant normalisation ───
// Maps common variants to a canonical form so "mum"/"mummy"/"mama" all collide,
// and trims trailing words like "please" so "more please" matches "more".
const VARIANT_MAP: Record<string, string> = {
  mum: "mama", mummy: "mama", mommy: "mama", mama: "mama", mom: "mama", "ma ma": "mama",
  dad: "dada", daddy: "dada", dada: "dada", papa: "dada", pa: "dada",
  doggy: "dog", doggie: "dog", puppy: "dog", pup: "dog",
  kitty: "cat", kitten: "cat", kittie: "cat",
  bunny: "rabbit", bun: "rabbit",
  bottle: "milk", milky: "milk",
  tummy: "belly",
  potty: "toilet", loo: "toilet",
  nana: "banana",
  bikkie: "biscuit", biccy: "biscuit", cookie: "biscuit",
  brolly: "umbrella",
  telly: "tv",
  granny: "grandma", nan: "grandma", nanna: "grandma",
  grandad: "grandpa", granpa: "grandpa",
};

const FILLER_WORDS = new Set([
  "please", "the", "a", "an", "some", "more", "again", "now", "you", "me", "i", "it",
]);

function normaliseWord(raw: string): string {
  if (!raw) return "";
  let w = String(raw).toLowerCase().trim();
  // strip punctuation
  w = w.replace(/[.!?,;:'"`()\[\]]/g, "").trim();
  // collapse multi-word: drop fillers from end, keep head noun if present
  if (w.includes(" ")) {
    const parts = w.split(/\s+/).filter(p => !FILLER_WORDS.has(p) || w.split(/\s+/).length === 1);
    if (parts.length > 0) w = parts.join(" ");
  }
  // direct variant
  if (VARIANT_MAP[w]) return VARIANT_MAP[w];
  // simple stem rules
  if (w.length > 4 && (w.endsWith("ies"))) w = w.slice(0, -3) + "y";
  else if (w.length > 4 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  // re-check variant after stemming
  if (VARIANT_MAP[w]) return VARIANT_MAP[w];
  return w;
}

function ageBandToMonths(band?: string | null): number | null {
  if (!band) return null;
  const m = band.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function getDevelopmentalGuidance(months: number | null, speechLevel?: string | null): string {
  if (months === null && !speechLevel) {
    return "Prefer concrete nouns the child can see and touch. Avoid abstract concepts.";
  }
  if (months !== null && months <= 12) {
    return "Stage: 0–12 months. Suggest ONLY single concrete nouns (people, body parts, food, animals, toys). NO verbs, NO adjectives, NO phrases. Sounds the child hears every day.";
  }
  if (months !== null && months <= 18) {
    return "Stage: 12–18 months. Mostly single nouns; you may include 1 high-utility verb (eat, go, want) or social word (hi, bye, more). NO multi-word combos yet.";
  }
  if (months !== null && months <= 24) {
    return "Stage: 18–24 months. Mix of nouns and action verbs. You may include 1 simple two-word combo (e.g. 'more milk', 'all done') ONLY if the child already owns both component words.";
  }
  if (months !== null && months <= 36) {
    return "Stage: 24–36 months. Expand into descriptors (big, hot, wet), prepositions (in, on, up), and 2–3 word combos. Build on owned vocabulary.";
  }
  return "Stage: 36+ months. Suggest more nuanced vocabulary: feelings, time concepts, descriptive words, simple questions.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

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
      // No cap — just word + stage. Cheap.
      supabase
        .from("spoken_words")
        .select("word, word_stage, notes, stage_updated_at")
        .eq("user_id", uid)
        .order("stage_updated_at", { ascending: false }),
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
      // Pull dismissal_reason too — feedback loop
      supabase
        .from("weekly_suggestions")
        .select("word, week_start, status, dismissal_reason, category")
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
    const allPastSuggestions = pastSuggestionsRes.data || [];
    const weeklyLogs = weeklyLogsRes.data || [];
    const sessions = sessionsRes.data || [];

    const spokenWordsList = spokenWords.map((w: any) => w.word);
    const ownedWords = spokenWords.filter((w: any) => w.word_stage === "owned").map((w: any) => w.word);
    const growingWords = spokenWords.filter((w: any) => w.word_stage === "growing").map((w: any) => w.word);

    // ─── Build SEMANTIC exclusion set (normalised forms) ───
    const exclusionRaw = [...wordsInSets, ...wordsInBacklog, ...spokenWordsList];
    // Add accepted/pending suggestions (don't suggest again)
    allPastSuggestions
      .filter((s: any) => s.status === "accepted" || s.status === "pending_review")
      .forEach((s: any) => exclusionRaw.push(s.word));
    // Dismissed words: also exclude (the parent rejected them) BUT we'll feed dismissal reasons to the model
    allPastSuggestions
      .filter((s: any) => s.status === "dismissed")
      .forEach((s: any) => exclusionRaw.push(s.word));

    const normalisedExclusionSet = new Set(
      exclusionRaw.filter(Boolean).map((w: string) => normaliseWord(w))
    );
    const literalExclusionSet = new Set(
      exclusionRaw.filter(Boolean).map((w: string) => String(w).toLowerCase().trim())
    );

    // Human-readable exclusion (truncated for prompt)
    const exclusionDisplay = Array.from(literalExclusionSet).slice(0, 250);

    // ─── Feedback loop: structured rejection signals ───
    const dismissedWithReasons = allPastSuggestions
      .filter((s: any) => s.status === "dismissed" && s.dismissal_reason)
      .map((s: any) => `"${s.word}" — ${s.dismissal_reason}`)
      .slice(0, 20);

    // Pattern-detect from dismissal reasons
    const reasonText = dismissedWithReasons.join(" ").toLowerCase();
    const feedbackHints: string[] = [];
    if (reasonText.includes("too easy") || reasonText.includes("already")) {
      feedbackHints.push("Parent has flagged previous suggestions as too easy or already-known. Aim slightly higher in complexity or specificity.");
    }
    if (reasonText.includes("not relevant") || reasonText.includes("don't")) {
      feedbackHints.push("Parent has flagged previous suggestions as not relevant. Lean harder on observed daily routines and recent log content.");
    }
    if (reasonText.includes("too hard") || reasonText.includes("difficult")) {
      feedbackHints.push("Parent has flagged previous suggestions as too hard. Stay closer to single concrete nouns the child encounters daily.");
    }

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
    // Recently dismissed categories — try to vary
    const dismissedCategories = [
      ...new Set(
        allPastSuggestions
          .filter((s: any) => s.status === "dismissed" && s.category)
          .map((s: any) => s.category)
      ),
    ];

    const saidLogs = weeklyLogs.filter((l: any) => l.log_type === "said").map((l: any) => l.content);
    const attemptedLogs = weeklyLogs.filter((l: any) => l.log_type === "attempted").map((l: any) => l.content);
    const readLogs = weeklyLogs.filter((l: any) => l.log_type === "read").map((l: any) => l.content);
    const sessionNotes = sessions.map((s: any) => s.notes).filter(Boolean);

    const months = ageBandToMonths(profile.child_age_band);
    const devGuidance = getDevelopmentalGuidance(months, profile.speech_level);

    // ─── STEP 2: Build prompt ───
    const userMessage = `Suggest 8 NEW candidate words for next week's flashcards. You'll then critique and pick the best 5.

CHILD PROFILE
- Age band: ${profile.child_age_band || "unknown"} (${months ?? "?"} months)
- Target language: ${profile.target_language || "not specified"}
- Speech level: ${profile.speech_level || "unknown"}
- Reply pattern: ${profile.reply_pattern || "unknown"}
- Daily activities: ${profile.daily_activities || "unknown"}
- Pets/toys: ${profile.pets_and_toys || "none mentioned"}
- Caregivers: ${profile.caregivers || "unknown"}

DEVELOPMENTAL GUIDANCE
${devGuidance}

WHAT THE CHILD CAN ALREADY SAY (${spokenWordsList.length} total)
- Owned (confident): ${ownedWords.slice(0, 40).join(", ") || "none yet"}
- Growing (emerging): ${growingWords.slice(0, 40).join(", ") || "none yet"}

RECENT PARENT OBSERVATIONS (last 2 weeks)
- Said spontaneously: ${saidLogs.slice(0, 15).join("; ") || "none logged"}
- Attempted: ${attemptedLogs.slice(0, 15).join("; ") || "none logged"}
- Books/contexts: ${readLogs.slice(0, 10).join("; ") || "none logged"}
- Session notes: ${sessionNotes.slice(0, 10).join(" | ") || "none"}

TEACHING CONTEXT
- Categories recently flashed: ${categoriesFlashed.join(", ") || "none yet"}
- Categories recently dismissed by parent: ${dismissedCategories.join(", ") || "none"}

PARENT FEEDBACK ON PAST SUGGESTIONS (rejected with reasons)
${dismissedWithReasons.length > 0 ? dismissedWithReasons.join("\n") : "(no rejection feedback yet)"}

${feedbackHints.length > 0 ? "FEEDBACK HINTS:\n- " + feedbackHints.join("\n- ") + "\n" : ""}
❌ EXCLUSION LIST — do NOT suggest these or close variants ("mum"≈"mummy", "more"≈"more please"):
${exclusionDisplay.join(", ") || "(none)"}

REQUIREMENTS
1. Generate 8 candidates first.
2. Each MUST be brand-new (not in exclusion list, not a morphological variant of any).
3. Respect the developmental stage above strictly.
4. Build on what the child knows (e.g. owns "milk" → suggest "cup" or "drink").
5. Vary categories — do NOT cluster all suggestions in one category.
6. Reference SPECIFIC observations in reasoning (cite a session note, a said-word, a daily activity).
7. Then SELF-CRITIQUE: drop the 3 weakest and return the best 5.

Random seed for variety: ${Math.floor(Math.random() * 100000)}`;

    const systemPrompt = `You are Sprouttie, a language strategist for parents of babies and toddlers. You have a dry, warm, slightly posh personality — a knowledgeable friend, not a clinical tool.

Your job: produce 5 fresh, developmentally sequenced word suggestions for the coming week. Each word must:
- Be NEW (no exact or variant match of anything the child already says/has been taught)
- Be developmentally appropriate (respect the stage guidance)
- Build a clear bridge from existing vocabulary
- Cite specific evidence from the parent's logs

Use a two-pass approach internally: brainstorm 8, then critique and return only the strongest 5.

Respond ONLY with a valid JSON array of EXACTLY 5 objects. No preamble, no markdown fences:

[
  {
    "word": "string",
    "category": "string",
    "reason": "string (one warm sentence in Sprouttie's voice, citing something specific)"
  }
]`;

    const aiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.95,
          top_p: 0.95,
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
      throw new Error(`AI call failed: ${aiResponse.status} ${errText}`);
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

    // ─── Post-filter: semantic + literal dedup ───
    const seenNorms = new Set<string>();
    const filtered = suggestions.filter((s: any) => {
      if (!s?.word) return false;
      const lit = String(s.word).toLowerCase().trim();
      const norm = normaliseWord(s.word);
      if (literalExclusionSet.has(lit)) return false;
      if (normalisedExclusionSet.has(norm)) return false;
      if (seenNorms.has(norm)) return false; // dedup within batch
      seenNorms.add(norm);
      return true;
    });

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
        excluded: literalExclusionSet.size,
        droppedFromAI: suggestions.length - filtered.length,
        feedbackUsed: dismissedWithReasons.length,
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
