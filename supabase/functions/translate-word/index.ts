import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { lookupCommonTranslation } from "../_shared/commonMandarin.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

export function validateResult(value: any, toChinese: boolean) {
  const english = typeof value?.english === "string" ? value.english.trim() : "";
  const pinyin = typeof value?.pinyin === "string" ? value.pinyin.trim() : "";
  const chinese = typeof value?.chinese === "string" ? value.chinese.trim() : "";
  if (!english || !pinyin || !/[a-z]/i.test(pinyin) || /[\p{Script=Han}0-9]/u.test(pinyin) ||
      /[\p{Script=Han}]/u.test(english) || (toChinese && (!/[\p{Script=Han}]/u.test(chinese) || !/^[\p{Script=Han}\s，。！？、]+$/u.test(chinese)))) {
    throw new Error("Incomplete translation");
  }
  return toChinese ? { chinese, pinyin, english } : { pinyin, english };
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { word, direction = 'zh-to-en' } = await req.json();
    if (typeof word !== "string" || !word.trim() || word.length > 600 || !['en-to-zh','zh-to-en'].includes(direction)) {
      return reply({ error: "Enter a word or a short phrase." }, 400);
    }
    const known = lookupCommonTranslation(word, direction);
    if (known) return reply(known);
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return reply({ error: "Translation is unavailable. Please retry or fill in the fields yourself." }, 503);
    const toChinese = direction === 'en-to-zh';
    const fields = toChinese ? ['chinese','pinyin','english'] : ['english','pinyin'];
    const prompt = toChinese
      ? 'Translate English into simplified Singapore Mandarin. Return separate chinese, pinyin and english fields. Use tone-marked pinyin, never tone numbers. English is the concise meaning. For regional terms prefer Singapore usage (taxi: 德士; market: 巴刹). Return only JSON.'
      : 'Translate the Chinese input into concise English and tone-marked Mandarin pinyin, never tone numbers. Return separate english and pinyin fields as JSON only.';
    // Two short attempts share a bounded budget. A rate limit is not retried.
    for (const model of ['gemini-flash-lite-latest', 'gemini-flash-latest']) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: prompt }] },
            contents: [{ role: 'user', parts: [{ text: word.trim() }] }],
            generation_config: {
              response_mime_type: 'application/json', temperature: 0.1,
              response_schema: { type: 'OBJECT', properties: Object.fromEntries(fields.map(f => [f, { type: 'STRING' }])), required: fields },
            },
          }),
        });
        if (response.status === 429) return reply({ error: 'Translation is busy. Please retry shortly.' }, 429);
        if (!response.ok) { console.warn('Translation upstream status:', response.status); continue; }
        const data = await response.json();
        const content = (data.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('');
        return reply(validateResult(JSON.parse(content.replace(/```(?:json)?/g, '').trim()), toChinese));
      } catch { /* Timeout, malformed output or network failure: try the fallback. */ }
      finally { clearTimeout(timer); }
    }
    return reply({ error: 'Translation took too long or is unavailable. Please retry or fill in the fields yourself.' }, 504);
  } catch {
    return reply({ error: 'Could not translate this word. Please retry or fill in the fields yourself.' }, 500);
  }
});
