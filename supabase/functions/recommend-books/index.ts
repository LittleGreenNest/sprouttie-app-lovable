import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { words, childAge, detectedLanguages, excludeBooks, varietySeed } = await req.json();
    
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

    console.log(`Recommending books for ${words.length} words, age: ${childAge || 'not specified'}, languages: ${JSON.stringify(detectedLanguages)}`);

    // Build language instruction based on detected languages
    const languageInstructions = (() => {
      const langs = detectedLanguages || ['english'];
      const hasChineseLangs = langs.some(l => ['mandarin', 'cantonese', 'hokkien', 'chinese'].includes(l));
      const isMultilingual = langs.length > 1 || hasChineseLangs;
      
      if (isMultilingual) {
        const langList = langs.join(', ');
        return `IMPORTANT: This child is learning in a multilingual household with these languages: ${langList}.
You MUST include a mix of books:
- Include 2-3 books that are bilingual (English + Mandarin Chinese) or originally written in Chinese/Mandarin. These are essential.
- Include books like "Dragons Love Tacos", Maisy series, or bilingual picture books published by publishers like Better Link Press, Cypress Book, or Tuttle Publishing.
- For Mandarin/Chinese books, well-known bilingual series include: "What Does Bunny See?", "I Am Chinese", "A is for Asia", "Eyes that Kiss in the Corners", or books from the "Chinese Nursery Rhymes" series.
- Also include 1-2 high-quality English picture books that feature vocabulary from the child's word list.
- Prioritize books that are authentically multilingual or culturally relevant to Asian families.`;
      }
      return `Recommend books primarily in English that are widely available.`;
    })();

    // Exclude previously seen books
    const excludeSection = excludeBooks && excludeBooks.length > 0 
      ? `\nDo NOT recommend these books that were already shown: ${excludeBooks.join(', ')}. You MUST pick completely different books.`
      : '';

    // Add variety by rotating focus categories based on seed
    const varietyCategories = [
      'focus on books about daily routines and home life',
      'focus on books about nature, animals, and the outdoors',
      'focus on books about emotions, relationships, and social skills',
      'focus on books about food, cooking, and family meals',
      'focus on books about adventure, exploration, and curiosity',
      'focus on books about colors, shapes, and early concepts',
    ];
    const seed = varietySeed || 0;
    const varietyFocus = varietyCategories[seed % varietyCategories.length];

    const prompt = `You are an expert children's librarian specializing in multilingual and multicultural families. Based on these vocabulary words a child is learning: ${words.slice(0, 25).join(', ')}

${childAge ? `The child is approximately ${childAge} years old.` : 'The child is in early childhood (ages 1-5).'}

${languageInstructions}
${excludeSection}

For this batch, please ${varietyFocus}.

Recommend exactly 6 real, age-appropriate children's books that:
1. Feature some of these vocabulary words naturally in context
2. Are real, published books available in libraries or bookstores (NOT fictional titles)
3. Are diverse and varied — no two books from the same series unless truly exceptional
4. Include culturally relevant books for multilingual Asian families when applicable

For each book, provide:
- title: The exact book title (must be a real published book)
- author: The author's full name
- language: Either "English", "Bilingual (English/Chinese)", "Chinese", or other relevant language
- ageRange: Recommended age range (e.g., "2-4 years")
- matchingWords: Which of the child's vocabulary words appear in this book (list 2-4 words)
- description: A brief 1-2 sentence description of why this book helps with these specific words
- coverColor: A simple color for the UI card (pick from: blue, green, purple, orange, pink, amber)

Respond with valid JSON only, in this exact format:
{
  "books": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "language": "English",
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
