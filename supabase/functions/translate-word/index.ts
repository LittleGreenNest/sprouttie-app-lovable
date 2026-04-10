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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: word.trim() },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "provide_translation",
                description: isEnglishToChinese
                  ? "Provide the Chinese characters, pinyin, and English for an English word"
                  : "Provide the English meaning and pinyin for a Chinese word",
                parameters: toolParams,
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "provide_translation" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse from content
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(
      content.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
    );
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
