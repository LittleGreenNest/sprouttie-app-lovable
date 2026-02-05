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
     const { text, sourceLanguage = "english" } = await req.json();
 
     if (!text || typeof text !== "string") {
       return new Response(
         JSON.stringify({ error: "Text is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const systemPrompt = `You are an expert Hokkien (Taiwanese/Min Nan) linguist and translator. Your task is to translate text into Hokkien and provide comprehensive linguistic information.
 
 For each translation, provide:
 1. hanzi: The Chinese characters (漢字) representation
 2. tailo: The Tâi-lô romanization (Taiwan's official romanization system for Hokkien)
 3. poj: The Pe̍h-ōe-jī (POJ) romanization (traditional missionary romanization)
 4. english: The English meaning/translation
 5. syllables: Array of individual syllables with their tones
 6. literal: Literal word-by-word translation if different from the meaning
 7. notes: Any cultural or usage notes
 
 Use Taiwan Hokkien (臺灣閩南語) as the default variant.
 For tones, use the standard 8-tone system (1-8) in Tâi-lô notation.
 
 IMPORTANT: Return ONLY valid JSON, no markdown or explanations outside the JSON structure.`;
 
     const userPrompt = `Translate the following ${sourceLanguage} text into Hokkien:
 
 "${text}"
 
 Return the response as a JSON object with this exact structure:
 {
   "translations": [
     {
       "hanzi": "漢字",
       "tailo": "Tâi-lô romanization",
       "poj": "POJ romanization",
       "english": "English meaning",
       "syllables": [
         { "hanzi": "字", "tailo": "jī", "tone": 7 }
       ],
       "literal": "literal translation if different",
       "notes": "any relevant notes"
     }
   ],
   "sourceText": "${text}",
   "sourceLanguage": "${sourceLanguage}"
 }
 
 If there are multiple valid translations or variations, include them all in the translations array.`;
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-2.5-flash",
         messages: [
           { role: "system", content: systemPrompt },
           { role: "user", content: userPrompt },
         ],
         temperature: 0.3,
       }),
     });
 
     if (!response.ok) {
       if (response.status === 429) {
         return new Response(
           JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
           { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       if (response.status === 402) {
         return new Response(
           JSON.stringify({ error: "Payment required. Please add credits to continue." }),
           { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       const errorText = await response.text();
       console.error("AI gateway error:", response.status, errorText);
       throw new Error(`AI gateway error: ${response.status}`);
     }
 
     const aiResponse = await response.json();
     const content = aiResponse.choices?.[0]?.message?.content;
 
     if (!content) {
       throw new Error("No response from AI");
     }
 
     // Parse the JSON response, handling potential markdown code blocks
     let translationData;
     try {
       const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
       const jsonStr = jsonMatch ? jsonMatch[1] : content;
       translationData = JSON.parse(jsonStr.trim());
     } catch (parseError) {
       console.error("Failed to parse AI response:", content);
       throw new Error("Failed to parse translation response");
     }
 
     return new Response(JSON.stringify(translationData), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("translate-hokkien error:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });