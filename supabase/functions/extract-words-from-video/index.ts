import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { videoPath } = await req.json();
    if (!videoPath) {
      return new Response(JSON.stringify({ error: "videoPath is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download video from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("spoken-word-videos")
      .download(videoPath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "Failed to download video" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = fileData.type || "video/mp4";

    // Send to Gemini via Lovable AI for transcription
    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-preview-04-17",
        messages: [
          {
            role: "system",
            content: `You are a child speech transcription assistant. Your job is to listen to a video of a young child speaking and extract individual words or short phrases that the child says.

Rules:
- Listen carefully for ALL languages spoken (the child may mix English, Mandarin, Hokkien, or other languages)
- Extract each distinct word or short phrase the child says
- For non-English words, provide the romanized/pinyin version AND the original script if possible
- Ignore adult speech — only transcribe what the CHILD says
- If unsure about a word, include it with a confidence note
- Return ONLY a JSON array of objects

Return format (JSON array):
[
  {"word": "mama", "language": "en", "confidence": "high"},
  {"word": "吃 (chī)", "language": "zh", "confidence": "high"},
  {"word": "water", "language": "en", "confidence": "medium"}
]

Confidence levels: "high", "medium", "low"
Languages: "en" for English, "zh" for Mandarin/Chinese, "other" for anything else (specify in notes field)`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please listen to this video and extract all words the child says. Return only the JSON array.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_words",
              description: "Extract words spoken by the child in the video",
              parameters: {
                type: "object",
                properties: {
                  words: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        word: { type: "string", description: "The word or short phrase spoken" },
                        language: { type: "string", enum: ["en", "zh", "other"], description: "Language of the word" },
                        confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level" },
                        notes: { type: "string", description: "Optional notes about the word" },
                      },
                      required: ["word", "language", "confidence"],
                    },
                  },
                },
                required: ["words"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_words" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();

    // Extract words from tool call response
    let extractedWords: Array<{ word: string; language: string; confidence: string; notes?: string }> = [];

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        extractedWords = parsed.words || [];
      } catch (e) {
        console.error("Failed to parse tool call:", e);
      }
    }

    // Fallback: try parsing from content if tool call didn't work
    if (extractedWords.length === 0) {
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            extractedWords = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error("Failed to parse content:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        words: extractedWords,
        videoPath,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("extract-words-from-video error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
