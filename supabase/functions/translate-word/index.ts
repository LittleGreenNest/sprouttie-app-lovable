import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Rolling alias, not a pinned version — Google retired gemini-2.5-flash from
// the v1beta API ahead of its announced shutdown date and every call started
// 404ing. Same alias scan-flashcards uses.
const GEMINI_MODEL = "gemini-flash-latest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, direction } = await req.json();
    if (!word || !word.trim()) {
      return new Response(JSON.stringify({ error: "No word provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Determine translation direction
    const isEnglishToChinese = direction === "en-to-zh";

    const systemPrompt = isEnglishToChinese
      ? `You are an English-to-Chinese translation assistant for Singapore Mandarin (simplified Chinese). Given an English word or phrase, return ONLY a JSON object with three fields:
- "chinese": the simplified Chinese characters (use Singapore/SEA Mandarin terms where applicable, e.g. 巴刹 for market, 德士 for taxi)
- "pinyin": the pinyin with tone marks (e.g. "māo" not "mao1")
- "english": echo back the English input (cleaned up if needed)
Return ONLY the JSON object, no markdown, no explanation.`
      : `You are a Chinese-English translation assistant. Given a Chinese word or phrase, return ONLY a JSON object with two fields:
- "english": the English meaning (concise, 1-5 words)
- "pinyin": the pinyin with tone marks (e.g. "māo" not "mao1")
If the input is Mandarin Chinese, translate it. If it's not Chinese, still try your best.
Return ONLY the JSON object, no markdown, no explanation.`;

    const toolParams = isEnglishToChinese
      ? {
          type: "object",
          properties: {
            chinese: {
              type: "string",
              description:
                "Simplified Chinese characters (Singapore Mandarin preferred)",
            },
            pinyin: {
              type: "string",
              description: "Pinyin with tone marks, e.g. māo, not mao1",
            },
            english: {
              type: "string",
              description: "The English input echoed back",
            },
          },
          required: ["chinese", "pinyin", "english"],
          additionalProperties: false,
        }
      : {
          type: "object",
          properties: {
            english: {
              type: "string",
              description: "English meaning, concise 1-5 words",
            },
            pinyin: {
              type: "string",
              description: "Pinyin with tone marks, e.g. māo, not mao1",
            },
          },
          required: ["english", "pinyin"],
          additionalProperties: false,
        };

    const callGemini = () =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: word.trim() }] }],
            generation_config: {
              response_mime_type: "application/json",
              temperature: 0.2,
              thinking_config: { thinking_level: "low" },
            },
          }),
        }
      );

    // gemini-flash-latest returns 503 "high demand" for roughly one call in six,
    // and a single miss used to surface as an empty form with no explanation.
    // These clear on an immediate retry. 429 is excluded on purpose: a rate
    // limit is not something to hammer.
    let response = await callGemini();
    for (let attempt = 0; attempt < 2 && (response.status === 503 || response.status === 500); attempt++) {
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      response = await callGemini();
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini API error:", response.status, text);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Keep the upstream status and body — a bare "Gemini API error" hid a
      // model retirement for weeks.
      throw new Error(`Gemini API error ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!content.trim()) {
      throw new Error(
        `Gemini returned no text (finishReason: ${data.candidates?.[0]?.finishReason ?? "unknown"})`
      );
    }
    const parsed = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-word error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
