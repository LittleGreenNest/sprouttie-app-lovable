import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: word.trim() }] }],
          generation_config: { response_mime_type: "application/json", temperature: 0.2 },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini API error:", response.status, text);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Gemini API error");
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
