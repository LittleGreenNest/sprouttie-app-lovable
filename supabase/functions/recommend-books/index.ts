import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { words, childAge } = await req.json();
    
    if (!words || words.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No words provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Recommending books for ${words.length} words, age: ${childAge || 'not specified'}`);

    const prompt = `You are a children's book expert. Based on these vocabulary words a child is learning: ${words.slice(0, 20).join(', ')}

${childAge ? `The child is approximately ${childAge} years old.` : 'The child is learning to read.'}

Recommend 5 real, age-appropriate children's books that:
1. Feature some of these vocabulary words naturally in the story
2. Are engaging and educational
3. Are widely available (libraries, bookstores, Amazon)

For each book, provide:
- title: The exact book title
- author: The author's name
- ageRange: Recommended age range (e.g., "2-4 years")
- matchingWords: Which of the child's vocabulary words appear in this book (list 2-5 words)
- description: A brief 1-2 sentence description of why this book is good for learning these words
- coverColor: A simple color for the UI card (pick from: blue, green, purple, orange, pink)

Respond with valid JSON only, in this exact format:
{
  "books": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "ageRange": "2-4 years",
      "matchingWords": ["word1", "word2"],
      "description": "Why this book helps...",
      "coverColor": "blue"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a helpful children's book recommendation assistant. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response received, parsing...");

    // Parse the JSON response - handle potential markdown code blocks
    let books;
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      const parsed = JSON.parse(jsonStr.trim());
      books = parsed.books || parsed;
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse book recommendations");
    }

    console.log(`Successfully parsed ${books.length} book recommendations`);

    return new Response(
      JSON.stringify({ success: true, books }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in recommend-books:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get book recommendations";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
