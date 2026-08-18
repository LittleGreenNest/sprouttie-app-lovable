import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rolling alias, not a pinned version — Google retired gemini-2.5-flash from
// the v1beta API ahead of its announced shutdown date and every call started
// 404ing. Same alias scan-flashcards uses.
const GEMINI_MODEL = "gemini-flash-latest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Lightweight morphological / variant normalisation ───
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
  w = w.replace(/[.!?,;:'"`()\[\]]/g, "").trim();
  if (w.includes(" ")) {
    const parts = w.split(/\s+/).filter(p => !FILLER_WORDS.has(p) || w.split(/\s+/).length === 1);
    if (parts.length > 0) w = parts.join(" ");
  }
  if (VARIANT_MAP[w]) return VARIANT_MAP[w];
  if (w.length > 4 && (w.endsWith("ies"))) w = w.slice(0, -3) + "y";
  else if (w.length > 4 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
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

// ─── Interest category keyword map ───
// Used for preprocessing spoken words into semantic domains before prompt construction.
const INTEREST_CATEGORY_MAP: Record<string, string[]> = {
  "vehicles & machinery": [
    "car", "truck", "bus", "train", "plane", "bike", "boat", "ship", "excavator", "crane",
    "tractor", "digger", "lorry", "van", "motorcycle", "helicopter", "rocket", "submarine",
    "engine", "wheel", "tyre", "gear", "motor", "vehicle", "transport", "scooter",
    "ambulance", "forklift", "bulldozer", "cement", "mixer", "taxi", "ferry", "cable car",
  ],
  "nature & animals": [
    "dog", "cat", "bird", "fish", "rabbit", "horse", "cow", "pig", "duck", "chicken", "bee",
    "butterfly", "flower", "tree", "leaf", "grass", "sun", "moon", "star", "rain", "cloud",
    "wind", "water", "rock", "sand", "mud", "worm", "spider", "ant", "frog", "turtle",
    "snake", "elephant", "lion", "tiger", "bear", "monkey", "giraffe", "panda", "fox",
    "owl", "parrot", "shark", "whale", "dolphin", "garden", "forest", "beach", "mountain",
    "insect", "reptile", "mammal", "nature", "animal", "pet",
  ],
  "food & mealtime": [
    "milk", "juice", "apple", "banana", "bread", "rice", "egg", "meat", "vegetable",
    "fruit", "biscuit", "cake", "soup", "noodle", "bowl", "cup", "spoon", "fork", "plate",
    "eat", "drink", "hungry", "yummy", "sweet", "sour", "salty", "mango", "orange",
    "grape", "strawberry", "carrot", "potato", "tomato", "cheese", "butter", "cooking",
    "meal", "lunch", "dinner", "breakfast", "snack", "food", "taste",
  ],
  "people & social": [
    "mama", "dada", "grandma", "grandpa", "baby", "brother", "sister", "friend", "teacher",
    "doctor", "hello", "bye", "thank", "sorry", "love", "hug", "kiss", "smile", "cry",
    "laugh", "play", "share", "family", "neighbour", "uncle", "auntie", "cousin",
    "person", "child", "adult", "boy", "girl",
  ],
  "tools & construction": [
    "hammer", "screwdriver", "wrench", "saw", "drill", "nail", "screw", "bolt", "ladder",
    "rope", "bucket", "shovel", "rake", "broom", "brush", "paint", "build", "fix", "break",
    "heavy", "hard", "sharp", "tool", "worker", "helmet", "glove", "scaffold", "cement",
    "brick", "wood", "metal", "measure", "tape",
  ],
  "spatial & directional": [
    "up", "down", "in", "out", "on", "off", "here", "there", "near", "far", "big", "small",
    "tall", "short", "left", "right", "front", "back", "open", "close", "inside", "outside",
    "top", "bottom", "above", "below", "between", "around", "through", "direction",
    "position", "under", "over", "next",
  ],
  "body & self": [
    "head", "hair", "eye", "ear", "nose", "mouth", "teeth", "tongue", "neck", "shoulder",
    "arm", "hand", "finger", "belly", "back", "leg", "knee", "foot", "toe", "skin",
    "sleep", "wake", "tired", "hurt", "sick", "clean", "dirty", "body", "heart", "tummy",
    "bottom", "chest", "face",
  ],
  "home & environment": [
    "house", "door", "window", "floor", "wall", "bed", "chair", "table", "sofa", "bath",
    "toilet", "light", "lamp", "phone", "book", "toy", "ball", "bag", "box", "key",
    "clock", "fan", "blanket", "pillow", "shelf", "drawer", "wardrobe", "home", "room",
    "living", "bedroom", "bathroom", "garage", "stairs",
  ],
};

interface SpokenWord {
  word: string;
  word_stage: string;
  notes: string | null;
  stage_updated_at: string;
  started_saying_at: string;
}

interface FlashCard {
  id: string;
  front: string;
  folder: string | null;
  card_status: string | null;
  card_language: string;
  set_number: number | null;
}

interface SetInfo {
  setNumber: number;
  setTheme: string;
  wordCount: number;
  currentWords: string[];
  graduatingWords: string[];
  openSlots: number;
}

const GRADUATION_ROUND_THRESHOLD = 10; // ~2 weeks of consistent flashing

function computeSetAnalysis(
  flashcards: FlashCard[],
  roundCountMap: Record<string, number>,
  ownedWords: string[],
): SetInfo[] {
  const ownedSet = new Set(ownedWords.map(w => w.toLowerCase()));
  const GENERIC_FOLDER = new Set(["default", "general", "misc", "other", "words", "flashcards", ""]);

  const setMap: Record<number, FlashCard[]> = {};
  for (const card of flashcards) {
    if (card.set_number == null) continue;
    if (!setMap[card.set_number]) setMap[card.set_number] = [];
    setMap[card.set_number].push(card);
  }

  return Object.entries(setMap)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([setNumStr, cards]) => {
      const setNum = parseInt(setNumStr);

      const folderCounts: Record<string, number> = {};
      for (const card of cards) {
        const f = card.folder?.trim();
        if (f && !GENERIC_FOLDER.has(f.toLowerCase())) {
          folderCounts[f] = (folderCounts[f] || 0) + 1;
        }
      }
      const setTheme = Object.entries(folderCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || `Set ${setNum}`;

      const graduatingWords = cards
        .filter(card => {
          const rounds = roundCountMap[card.id] || 0;
          return ownedSet.has(card.front.toLowerCase()) || rounds >= GRADUATION_ROUND_THRESHOLD;
        })
        .map(card => card.front);

      return {
        setNumber: setNum,
        setTheme,
        wordCount: cards.length,
        currentWords: cards.map(c => c.front),
        graduatingWords,
        openSlots: graduatingWords.length,
      };
    });
}

// ─── Preprocessing functions ───

function computeInterestCategories(
  words: string[],
  profileInterests?: string | null,
): { topCategories: string[]; countsByCategory: Record<string, number>; coldStart: boolean } {
  const counts: Record<string, number> = {};
  for (const cat of Object.keys(INTEREST_CATEGORY_MAP)) counts[cat] = 0;

  for (const word of words) {
    const w = word.toLowerCase().trim();
    const norm = normaliseWord(word);
    for (const [cat, keywords] of Object.entries(INTEREST_CATEGORY_MAP)) {
      if (keywords.includes(w) || keywords.includes(norm)) {
        counts[cat]++;
      }
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    if (profileInterests?.trim()) {
      return { topCategories: [profileInterests.trim()], countsByCategory: counts, coldStart: false };
    }
    return { topCategories: [], countsByCategory: counts, coldStart: true };
  }

  const topCategories = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat]) => cat);

  return { topCategories, countsByCategory: counts, coldStart: false };
}

function computeComplexityLevel(words: string[]): string {
  if (words.length === 0) return "insufficient data";
  const hasPhrases = words.some(w => w.includes(" "));
  if (hasPhrases) return "compound nouns / short phrases present";
  if (words.some(w => w.length > 9)) return "multi-morpheme single words";
  return "single concrete nouns";
}

function computeLanguageDistribution(
  words: string[],
  targetLanguage?: string | null,
): { summary: string; underrepresented: boolean } {
  if (words.length === 0) {
    return { summary: "no spoken words logged yet", underrepresented: false };
  }
  const mandarin = words.filter(w => /[一-鿿]/.test(w)).length;
  const total = words.length;
  const mandarinPct = Math.round((mandarin / total) * 100);
  const isMandarin = (targetLanguage || "").toLowerCase().includes("mandarin") ||
    (targetLanguage || "").toLowerCase().includes("chinese");
  const underrepresented = isMandarin && total > 5 && mandarinPct < 30;
  const flag = underrepresented ? " — Mandarin UNDERREPRESENTED vs target" : "";
  const summary = `${mandarin} Mandarin (${mandarinPct}%), ${total - mandarin} English/other (${100 - mandarinPct}%)${flag}`;
  return { summary, underrepresented };
}

function computeRecencySignal(
  spokenWords: SpokenWord[],
): { recent: string[]; older: string[] } {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const recent: string[] = [];
  const older: string[] = [];
  for (const w of spokenWords) {
    const dateStr = w.started_saying_at || w.stage_updated_at;
    const label = `${w.word} (${w.word_stage})`;
    if (new Date(dateStr) >= cutoff) {
      recent.push(label);
    } else {
      older.push(label);
    }
  }
  return { recent, older };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // numSets drives how many words we ask for (~5 words per set), matching
    // the "1 set / 2 sets / 3 sets / 5 sets" options on the client. Previously
    // this was accepted from the client but never read, so every option
    // silently generated the same fixed 5 words regardless of what was picked.
    const numSets = Math.min(Math.max(Number(body?.numSets) || 1, 1), 5);
    const targetWordCount = numSets * 5;

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
      // Fetch started_saying_at for accurate recency signal
      supabase
        .from("spoken_words")
        .select("word, word_stage, notes, stage_updated_at, started_saying_at")
        .eq("user_id", uid)
        .order("started_saying_at", { ascending: false }),
      // Fetch set_number for set-aware suggestions + card_language for language distribution
      supabase
        .from("flashcards")
        .select("id, front, folder, card_status, card_language, set_number")
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
      // Fetch outcome + theme for full feedback loop
      supabase
        .from("weekly_suggestions")
        .select("word, week_start, status, dismissal_reason, category, outcome, theme")
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
    const spokenWords: SpokenWord[] = spokenRes.data || [];
    const activeFlashcards = flashcardsRes.data || [];
    const wordsInSets = activeFlashcards.map((f: any) => f.front);
    const wordsInBacklog = (backlogRes.data || []).map((w: any) => w.word);
    const allPastSuggestions = pastSuggestionsRes.data || [];
    const weeklyLogs = weeklyLogsRes.data || [];
    const sessions = sessionsRes.data || [];

    const spokenWordsList = spokenWords.map((w) => w.word);
    const ownedWords = spokenWords.filter((w) => w.word_stage === "owned").map((w) => w.word);
    const growingWords = spokenWords.filter((w) => w.word_stage === "growing").map((w) => w.word);

    // ─── Build SEMANTIC exclusion set ───
    const exclusionRaw = [...wordsInSets, ...wordsInBacklog, ...spokenWordsList];
    allPastSuggestions
      .filter((s: any) => s.status === "accepted" || s.status === "pending_review")
      .forEach((s: any) => exclusionRaw.push(s.word));
    allPastSuggestions
      .filter((s: any) => s.status === "dismissed")
      .forEach((s: any) => exclusionRaw.push(s.word));

    const normalisedExclusionSet = new Set(
      exclusionRaw.filter(Boolean).map((w: string) => normaliseWord(w))
    );
    const literalExclusionSet = new Set(
      exclusionRaw.filter(Boolean).map((w: string) => String(w).toLowerCase().trim())
    );
    const exclusionDisplay = Array.from(literalExclusionSet).slice(0, 80);

    // ─── Feedback loop: structured rejection + outcome signals ───
    const dismissedWithReasons = allPastSuggestions
      .filter((s: any) => s.status === "dismissed" && s.dismissal_reason)
      .map((s: any) => `"${s.word}" — ${s.dismissal_reason}`)
      .slice(0, 20);

    const reasonText = dismissedWithReasons.join(" ").toLowerCase();
    const feedbackHints: string[] = [];
    if (reasonText.includes("too easy") || reasonText.includes("already")) {
      feedbackHints.push("Parent flagged previous suggestions as too easy. Aim higher in complexity or specificity.");
    }
    if (reasonText.includes("not relevant") || reasonText.includes("don't")) {
      feedbackHints.push("Parent flagged previous suggestions as not relevant. Lean harder on observed interests.");
    }
    if (reasonText.includes("too hard") || reasonText.includes("difficult")) {
      feedbackHints.push("Parent flagged previous suggestions as too hard. Stay closer to single concrete nouns.");
    }

    const respondedWords = allPastSuggestions
      .filter((s: any) => s.outcome === "responded")
      .map((s: any) => s.word)
      .slice(0, 20);
    const noResponseWords = allPastSuggestions
      .filter((s: any) => s.outcome === "no_response")
      .map((s: any) => s.word)
      .slice(0, 20);

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

    // ─── STEP 2: Preprocessing ───

    // Round counts per flashcard from existing tracking data (no extra query)
    const roundCountMap: Record<string, number> = {};
    for (const t of (trackingRes.data || [])) {
      roundCountMap[t.flashcard_id] = (roundCountMap[t.flashcard_id] || 0) + 1;
    }

    // Per-set analysis: themes, graduating words, open slots
    const setAnalysis = computeSetAnalysis(activeFlashcards as FlashCard[], roundCountMap, ownedWords);
    const setsNeedingWords = setAnalysis.filter(s => s.openSlots > 0);
    const setAware = setsNeedingWords.length > 0;

    const { topCategories, countsByCategory, coldStart: spokenWordsColdStart } = computeInterestCategories(
      spokenWordsList,
      profile.child_interests,
    );
    const complexityLevel = computeComplexityLevel(spokenWordsList);
    const { summary: langDistribution, underrepresented: mandarinUnderrepresented } =
      computeLanguageDistribution(spokenWordsList, profile.target_language);
    const { recent: recentWords, older: olderWords } = computeRecencySignal(spokenWords);

    // Flashcard folder distribution — fallback when spoken words are CJK and don't match
    // the English keyword map. Filter generic/placeholder folder names.
    const GENERIC_FOLDER_NAMES = new Set([
      "default", "general", "misc", "other", "words", "flashcards", "uncat", "",
    ]);
    const folderCounts: Record<string, number> = {};
    for (const card of activeFlashcards) {
      const f = card.folder?.toLowerCase().trim();
      if (f && !GENERIC_FOLDER_NAMES.has(f)) {
        folderCounts[card.folder] = (folderCounts[card.folder] || 0) + 1;
      }
    }
    const topFolders = Object.entries(folderCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Past suggestion categories — 3rd fallback. These are AI-generated English labels
    // from prior runs, already stored in weekly_suggestions.category / .theme.
    const pastCategories = [
      ...new Set(
        allPastSuggestions
          .map((s: any) => s.category || s.theme)
          .filter(Boolean)
          .filter((c: string) => !GENERIC_FOLDER_NAMES.has(c.toLowerCase().trim()))
      ),
    ].slice(0, 5) as string[];

    // Cascade: spoken_words keywords → flashcard folders → past suggestion categories → profile interests
    type CategorySignal = { label: string; source: string };
    const effectiveCategories: CategorySignal[] =
      topCategories.length > 0
        ? topCategories.map(cat => ({
            label: `${cat} (${countsByCategory[cat]} spoken word${countsByCategory[cat] === 1 ? "" : "s"})`,
            source: "spoken_words",
          }))
        : topFolders.length > 0
          ? topFolders.map(([folder, count]) => ({
              label: `${folder} (${count} flashcard${count === 1 ? "" : "s"})`,
              source: "flashcard_folders",
            }))
          : pastCategories.length > 0
            ? pastCategories.map(cat => ({
                label: `${cat} (from prior suggestions)`,
                source: "past_suggestions",
              }))
            : profile.child_interests?.trim()
              ? [{ label: profile.child_interests.trim(), source: "profile_interests" }]
              : [];

    const coldStart = effectiveCategories.length === 0;

    const dominantCategoriesStr = coldStart
      ? "COLD START — no data available; use profile interests and age-appropriate defaults"
      : effectiveCategories.map((c, i) => `${i + 1}. ${c.label}`).join("\n  ");

    // ─── STEP 3: System prompt ───
    const systemPrompt = `You are a specialist in early childhood language development and bilingual acquisition. Your job is to suggest vocabulary words for a weekly flashcard plan that is personalised to THIS specific child — not a generic toddler.

Your suggestions must:
1. Be grounded in the child's demonstrated interests derived from their spoken word history
2. Extend what the child already knows through one of three tiers:
   - "reinforce": adjacent vocabulary within a known category (e.g. child knows "excavator" → suggest "excavator arm")
   - "bridge": connecting a known concept to a new domain (e.g. "steering wheel" → "direction" → "left/right")
   - "stretch": one level above current complexity without being inaccessible
3. Never regress to generic age-band defaults (food, household items, colours) unless spoken word history explicitly shows this as a dominant interest
4. Reflect the child's language balance — prioritise the underrepresented target language where appropriate
5. Include a rationale per word that references THIS child's actual observed data

You must NOT:
- Default to mealtime or household themes without evidence from spoken word history
- Suggest any word in the exclusion set
- Assign a theme that has no connection to observed interests
- Repeat previously dismissed words

When SET STRUCTURE is provided, each suggested word must include a "set_number" field indicating which set it is intended for. Assign words to sets where they thematically fit and where there are open slots. If no set structure is available, omit "set_number".

Return JSON only. No preamble. No markdown. Schema:
{
  "theme": string,
  "theme_rationale": string,
  "words": [
    {
      "word": string,
      "set_number": number | null,
      "pos": string,
      "reason": string,
      "activity_tip": string,
      "tier": "reinforce" | "bridge" | "stretch"
    }
  ]
}`;

    // ─── STEP 4: User prompt ───
    const userMessage = `CHILD PROFILE:
- Age band: ${profile.child_age_band || "unknown"} (${months ?? "?"} months)
- Target languages: ${profile.target_language || "not specified"}
- Speech level: ${profile.speech_level || "unknown"}
- Reply pattern: ${profile.reply_pattern || "unknown"}
- Daily activities: ${profile.daily_activities || "not specified"}
- Pets/toys: ${profile.pets_and_toys || "none mentioned"}
- Caregivers: ${profile.caregivers || "unknown"}
- Child interests (parent-stated): ${profile.child_interests || "not specified"}

VOCABULARY PATTERN ANALYSIS (pre-computed):
- Dominant interest categories:
  ${dominantCategoriesStr}
- Complexity level observed: ${complexityLevel}
- Language distribution in spoken words: ${langDistribution}
- Cold-start flag: ${coldStart ? "YES — no spoken words; theme must come from profile interests or age defaults" : "no"}
${mandarinUnderrepresented ? "- ⚠️ MANDARIN UNDERREPRESENTED: prioritise Mandarin vocabulary this week\n" : ""}
SPOKEN WORDS — Recent (last 14 days):
${recentWords.length > 0 ? recentWords.join(", ") : "none in this window"}

SPOKEN WORDS — Older:
${olderWords.slice(0, 60).length > 0 ? olderWords.slice(0, 60).join(", ") : "none"}

RECENTLY FLASHED CARDS:
- Categories recently flashed: ${categoriesFlashed.join(", ") || "none yet"}

PAST SUGGESTION OUTCOMES:
- Accepted: ${allPastSuggestions.filter((s: any) => s.status === "accepted").map((s: any) => s.word).slice(0, 20).join(", ") || "none yet"}
- Dismissed + reasons: ${dismissedWithReasons.length > 0 ? dismissedWithReasons.join("; ") : "none"}
- Responded to: ${respondedWords.join(", ") || "none logged"}
- No response: ${noResponseWords.join(", ") || "none logged"}
- Categories recently dismissed by parent: ${dismissedCategories.join(", ") || "none"}

PARENT OBSERVATIONS (last 2 weeks):
- Said spontaneously: ${saidLogs.slice(0, 15).join("; ") || "none logged"}
- Attempted/imitated: ${attemptedLogs.slice(0, 15).join("; ") || "none logged"}
- Books/contexts noted: ${readLogs.slice(0, 10).join("; ") || "none logged"}
- Session notes: ${sessionNotes.slice(0, 10).join(" | ") || "none"}

EXCLUSION SET — do NOT suggest these or close variants:
${exclusionDisplay.join(", ") || "(none)"}

DEVELOPMENTAL GUIDANCE FOR AGE BAND:
${devGuidance}

${feedbackHints.length > 0 ? "FEEDBACK SIGNALS FROM PARENT:\n- " + feedbackHints.join("\n- ") + "\n" : ""}${setAware ? `SET STRUCTURE (${setAnalysis.length} active sets, ${setsNeedingWords.length} with open slots):
${setAnalysis.map(s => {
  const status = s.openSlots > 0
    ? `⚠ ${s.openSlots} graduating: [${s.graduatingWords.join(", ")}] → needs ${s.openSlots} replacement${s.openSlots > 1 ? "s" : ""}`
    : "✓ no rotations needed";
  return `Set ${s.setNumber} — Theme: "${s.setTheme}" — ${s.wordCount} words — ${status}\n  Current: [${s.currentWords.join(", ")}]`;
}).join("\n")}

Graduation threshold: word is owned by child OR has been flashed ≥${GRADUATION_ROUND_THRESHOLD} times in the last 30 days.

` : ""}TASK:
Suggest ONE weekly theme and ${targetWordCount} words.

The theme MUST emerge from the dominant interest categories above.${setAware ? ` Where possible, assign each word to a set (via set_number) where it fits thematically and there are open slots. Prioritise filling sets that have graduating words first.` : ""} If cold-start, pick a theme appropriate for the age band and any profile interests listed.

For each word provide:
- word (with Mandarin character + pinyin if Mandarin, or bilingual pair if applicable)
- set_number (integer: which set this word fits into, or null if no specific set applies)
- pos (part of speech)
- reason (1–2 sentences referencing this child's specific observed data — cite a spoken word, log entry, or stated interest)
- activity_tip (one real-world moment the parent can use to introduce this word naturally)
- tier: "reinforce" | "bridge" | "stretch"

Return JSON only. No preamble. No markdown. Random seed for variety: ${Math.floor(Math.random() * 100000)}`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generation_config: {
            response_mime_type: "application/json",
            temperature: 0.9,
            thinking_config: { thinking_level: "low" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI call failed: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(
        JSON.stringify({ error: "parse_failed", raw: rawContent }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle both new {theme, words:[]} shape and legacy [] shape
    let suggestions: any[];
    let weekTheme: string | null = null;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.words)) {
      suggestions = parsed.words;
      weekTheme = parsed.theme || null;
    } else if (Array.isArray(parsed)) {
      suggestions = parsed;
    } else {
      return new Response(
        JSON.stringify({ error: "parse_failed", raw: rawContent }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (suggestions.length === 0) {
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
      if (seenNorms.has(norm)) return false;
      seenNorms.add(norm);
      return true;
    });

    const finalSuggestions = (filtered.length >= 3 ? filtered : suggestions).slice(0, targetWordCount);

    // ─── STEP 5: Write to Supabase ───
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
      category: s.category || (weekTheme ? weekTheme : null),
      reason: s.reason || null,
      theme: weekTheme,
      tier: s.tier || null,
      activity_tip: s.activity_tip || null,
      set_number: typeof s.set_number === "number" ? s.set_number : null,
      status: "pending_review",
    }));

    const { error: insertError } = await supabase
      .from("weekly_suggestions")
      .insert(rows);

    if (insertError) {
      // Graceful fallback if tier/activity_tip columns not yet migrated
      if (
        insertError.message?.includes("tier") ||
        insertError.message?.includes("activity_tip") ||
        insertError.message?.includes("set_number")
      ) {
        console.warn("New columns missing — falling back to base insert. Apply migrations 20260530_add_tier_activity_tip.sql and 20260530000001_add_set_number_to_suggestions.sql.");
        const fallbackRows = rows.map(({ tier, activity_tip, set_number, ...rest }: any) => rest);
        const { error: fallbackErr } = await supabase.from("weekly_suggestions").insert(fallbackRows);
        if (fallbackErr) {
          console.error("Fallback insert error:", fallbackErr);
          return new Response(
            JSON.stringify({ error: "save_failed" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "save_failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: rows.length,
        theme: weekTheme,
        dominantCategories: effectiveCategories.map(c => c.label),
        categorySource: effectiveCategories[0]?.source || "none",
        coldStart,
        setAware,
        setsAnalysed: setAnalysis.length,
        setsNeedingWords: setsNeedingWords.map(s => ({
          setNumber: s.setNumber,
          theme: s.setTheme,
          openSlots: s.openSlots,
          graduating: s.graduatingWords,
        })),
        excluded: literalExclusionSet.size,
        spokenWordsCount: spokenWordsList.length,
        flashcardFolders: topFolders.map(([f, n]) => `${f}:${n}`),
        pastCategoriesFound: pastCategories.length,
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
