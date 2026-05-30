import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normaliseWord(raw: string): string {
  if (!raw) return "";
  let w = String(raw).toLowerCase().trim();
  w = w.replace(/[.!?,;:'"`()\[\]]/g, "").trim();
  if (w.length > 4 && w.endsWith("ies")) w = w.slice(0, -3) + "y";
  else if (w.length > 4 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  return w;
}

// Same category map as autopilot — used for interest-aware swap suggestions
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
  ],
  "food & mealtime": [
    "milk", "juice", "apple", "banana", "bread", "rice", "egg", "meat", "vegetable",
    "fruit", "biscuit", "cake", "soup", "noodle", "bowl", "cup", "spoon", "fork", "plate",
    "eat", "drink", "hungry", "yummy", "sweet", "sour", "salty", "mango", "orange",
    "grape", "strawberry", "carrot", "potato", "tomato", "cheese", "butter", "meal",
  ],
  "people & social": [
    "mama", "dada", "grandma", "grandpa", "baby", "brother", "sister", "friend", "teacher",
    "doctor", "hello", "bye", "thank", "sorry", "love", "hug", "kiss", "smile", "cry",
    "laugh", "play", "share", "family", "neighbour", "uncle", "auntie", "cousin",
  ],
  "tools & construction": [
    "hammer", "screwdriver", "wrench", "saw", "drill", "nail", "screw", "bolt", "ladder",
    "rope", "bucket", "shovel", "rake", "broom", "brush", "paint", "build", "fix",
    "heavy", "hard", "sharp", "tool", "worker", "helmet", "glove", "scaffold", "brick",
  ],
  "spatial & directional": [
    "up", "down", "in", "out", "on", "off", "here", "there", "near", "far", "big", "small",
    "tall", "short", "left", "right", "front", "back", "open", "close", "inside", "outside",
    "top", "bottom", "above", "below", "between", "around", "through", "direction",
  ],
  "body & self": [
    "head", "hair", "eye", "ear", "nose", "mouth", "teeth", "tongue", "neck", "shoulder",
    "arm", "hand", "finger", "belly", "back", "leg", "knee", "foot", "toe", "skin",
    "sleep", "wake", "tired", "hurt", "sick", "clean", "dirty", "body", "heart",
  ],
  "home & environment": [
    "house", "door", "window", "floor", "wall", "bed", "chair", "table", "sofa", "bath",
    "toilet", "light", "lamp", "phone", "book", "toy", "ball", "bag", "box", "key",
    "clock", "fan", "blanket", "pillow", "shelf", "drawer", "wardrobe", "home", "room",
  ],
};

function computeInterestCategories(
  words: string[],
  profileInterests?: string | null,
): string[] {
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
    if (profileInterests?.trim()) return [profileInterests.trim()];
    return [];
  }

  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat]) => cat);
}

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

    // Fetch profile, spoken words, and existing flashcards in parallel
    const [profileRes, spokenRes, flashcardsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("child_age_band, target_language, speech_level, child_interests")
        .eq("id", user.id)
        .single(),
      supabase
        .from("spoken_words")
        .select("word, word_stage")
        .eq("user_id", user.id),
      supabase
        .from("flashcards")
        .select("front")
        .eq("user_id", user.id)
        .neq("card_status", "retired"),
    ]);

    const profile = profileRes.data;
    const spokenWordsList = (spokenRes.data || []).map((w: any) => w.word);
    const existingWords = (flashcardsRes.data || []).map((f: any) => f.front?.toLowerCase());

    // Precompute interest categories from spoken word history
    const dominantCategories = computeInterestCategories(
      spokenWordsList,
      profile?.child_interests,
    );

    const systemPrompt = `You are a specialist in early childhood language development and bilingual acquisition. Your job is to suggest 3 alternative vocabulary words to replace a word in a child's flashcard set.

Your alternatives must:
1. Be rooted in this child's demonstrated interest domains: ${dominantCategories.length > 0 ? dominantCategories.join(", ") : "use the category context provided"}
2. Be developmentally appropriate for the age band and speech level
3. Stay within the same semantic neighbourhood as the original word OR the child's dominant interest domains
4. Not duplicate any word already in the child's sets or spoken word log

Never suggest generic fallback words (basic colours, household items) unless the child's interest pattern explicitly supports it.

Respond with a JSON array of exactly 3 strings. No markdown, no explanation.`;

    const userMessage = `Word to replace: "${word}"
Category context: ${category || "general"}

Child profile:
- Age band: ${profile?.child_age_band || "unknown"}
- Target language: ${profile?.target_language || "not specified"}
- Speech level: ${profile?.speech_level || "unknown"}

Child's dominant interest categories (pre-computed from spoken word history):
${dominantCategories.length > 0
  ? dominantCategories.map((c, i) => `${i + 1}. ${c}`).join("\n")
  : "insufficient spoken word data — base alternatives on the category context above"}

Words already in the child's sets — avoid all of these:
${existingWords.slice(0, 50).join(", ") || "none"}

Return exactly 3 alternative words as a JSON array of strings. Example: ["word1", "word2", "word3"]`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generation_config: { response_mime_type: "application/json", temperature: 0.5 },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI call failed");
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
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

    const filtered = alternatives
      .filter(
        (a: string) =>
          typeof a === "string" &&
          a.toLowerCase() !== word.toLowerCase() &&
          !existingWords.includes(a.toLowerCase()),
      )
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
