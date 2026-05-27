import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODEL = "gemini-1.5-flash";

const TEXT_SYSTEM_PROMPT = `You are a word extractor for a bilingual Chinese-English learning app for young children.

The user will send you a photo that may contain Chinese words, English words, or both. This could be physical flashcards, educational toys, puzzles, posters, book pages, packaging, or any object with text on it.

Your job:
1. Detect every distinct word/phrase visible in the image — both Chinese AND English.
2. For each word, provide:
   - "chinese": the Chinese characters (if the word is English-only, provide the Chinese translation)
   - "english": the English translation (if the word is Chinese-only, provide the English translation; if English, use the word as-is)
   - "pinyin": the Hanyu Pinyin with tone marks (e.g. māo, not mao1)
    - "category": suggest a category from this list: Animals, Food, Vehicles, Household, Nature, Body Parts, Colors, Numbers, Family, Actions, Clothing, Greetings, Fruits, Shapes, Weather, Places, Toys. Pick the best fit.
    - "originalLanguage": "chinese" if the word was originally in Chinese, "english" if originally in English

Return ONLY a JSON object with this structure:
{
  "words": [
    { "chinese": "猫", "english": "cat", "pinyin": "māo", "category": "Animals", "originalLanguage": "chinese" }
  ]
}

If you cannot read a word clearly, skip it. Do not guess wildly.
If the image doesn't contain any readable text, return { "words": [], "message": "No words detected in this image." }`;

const IDENTIFY_SYSTEM_PROMPT = `You are an object identifier for a bilingual Chinese-English learning app for young children (toddlers aged 1-4).

The user will send you a photo of an object, toy, animal, food, or scene. Your job is to identify the main objects visible and return vocabulary words a parent would teach a toddler.

Rules:
- Be specific but age-appropriate: "basketball" not "ball", "fire truck" not "vehicle", "banana" not "yellow fruit"
- If you see a specific type (e.g. golden retriever), also return the general word (e.g. dog)
- Include color or size descriptors only when they're the defining feature (e.g. "yellow duck")
- For toys/stuffed animals, identify what they represent (e.g. a stuffed bear → "bear")
- Return 1-5 words per image depending on what's visible
- Focus on the most prominent/important objects

For each object, provide:
- "chinese": the Chinese characters
- "english": the English word a parent would use
- "pinyin": Hanyu Pinyin with tone marks (e.g. māo, not mao1)
- "category": suggest from: Animals, Food, Vehicles, Household, Nature, Body Parts, Colors, Numbers, Family, Actions, Clothing, Fruits, Shapes, Weather, Places, Toys
- "originalLanguage": always "identified" for object recognition

Return ONLY a JSON object:
{
  "words": [
    { "chinese": "篮球", "english": "basketball", "pinyin": "lánqiú", "category": "Toys", "originalLanguage": "identified" }
  ]
}

If you cannot identify anything meaningful, return { "words": [], "message": "Could not identify objects in this image. Try a clearer photo." }`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { imageBase64, mimeType, mode } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isIdentifyMode = mode === "identify";
    const systemPrompt = isIdentifyMode ? IDENTIFY_SYSTEM_PROMPT : TEXT_SYSTEM_PROMPT;
    const userText = isIdentifyMode
      ? "Please look at this photo and identify the main objects, animals, or items visible. Return the Chinese word, pinyin, and English for each."
      : "Please scan this photo and extract all the words you can see — both Chinese and English. This could be flashcards, a toy, a puzzle, a poster, or any object with text. For English-only words, provide the Chinese translation too.";

    // Use native Gemini generateContent API (more stable than OpenAI-compat shim)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: "user",
              parts: [
                { text: userText },
                {
                  inline_data: {
                    mime_type: mimeType || "image/jpeg",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generation_config: {
            response_mime_type: "application/json",
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      // Return 200 with error field so client can surface the real message
      return new Response(
        JSON.stringify({ words: [], error: `Gemini ${response.status}: ${errText}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Gemini raw response:", JSON.stringify(data).slice(0, 500));

    const finishReason = data.candidates?.[0]?.finishReason;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("finishReason:", finishReason, "content length:", content.length);

    // Surface safety blocks or empty responses clearly
    if (!content) {
      const blockReason = data.promptFeedback?.blockReason || finishReason || "empty response";
      return new Response(
        JSON.stringify({ words: [], error: `Gemini returned no content: ${blockReason}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let jsonStr = content.trim();
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      // Return the raw content as error so we can see what Gemini actually said
      parsed = { words: [], error: `Parse failed. Raw: ${content.slice(0, 200)}` };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-flashcards error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
