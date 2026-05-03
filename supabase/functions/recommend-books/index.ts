import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      words,
      childAgeBand,
      targetLanguage,
      detectedLanguages,
      excludeBooks,
      varietySeed,
      themes,
      masteryBreakdown,
      spokenWordStages,
      feedbackHistory,
    } = await req.json();

    if (!words || words.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No words provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log(`Recommending books: ${words.length} words, age: ${childAgeBand || 'unknown'}, languages: ${JSON.stringify(detectedLanguages)}`);

    // --- Build age instruction ---
    const ageInstruction = (() => {
      if (!childAgeBand) return 'The child is in early childhood (ages 1-5).';
      const ageMap: Record<string, string> = {
        '0-6m': 'The child is 0-6 months old. Recommend high-contrast board books, cloth books, and simple sensory books.',
        '6-12m': 'The child is 6-12 months old. Recommend sturdy board books with simple words, textures, and flaps.',
        '12-18m': 'The child is 12-18 months old. Recommend board books with single words, animal sounds, and simple stories.',
        '18-24m': 'The child is 18-24 months old. Recommend picture books with short sentences, repetition, and familiar objects.',
        '2-3y': 'The child is 2-3 years old. Recommend picture books with simple plots, rhymes, and vocabulary building.',
        '3-5y': 'The child is 3-5 years old. Recommend picture books with richer stories, early concepts, and longer narratives.',
        '5+': 'The child is 5+ years old. Recommend early readers, chapter picture books, and more complex stories.',
      };
      return ageMap[childAgeBand] || `The child's age band is "${childAgeBand}".`;
    })();

    // --- Build language instruction ---
    const languageInstructions = (() => {
      const langs = detectedLanguages || ['english'];
      const hasChineseLangs = langs.some((l: string) => ['mandarin', 'cantonese', 'hokkien', 'chinese'].includes(l));
      const isMultilingual = langs.length > 1 || hasChineseLangs;

      if (targetLanguage) {
        const langLower = targetLanguage.toLowerCase();
        if (['mandarin', 'chinese', 'hokkien', 'cantonese'].some(l => langLower.includes(l))) {
          return `IMPORTANT: This family is learning ${targetLanguage}. Include 2-3 bilingual (English + Chinese/Mandarin) or Chinese-language picture books. Also include 2-3 high-quality English books matching vocabulary. Prioritize culturally relevant books for Asian families.`;
        }
      }

      if (isMultilingual) {
        return `IMPORTANT: This child is learning in a multilingual household with: ${langs.join(', ')}. Include 2-3 bilingual or target-language books alongside English options. Prioritize culturally relevant books.`;
      }
      return 'Recommend books primarily in English that are widely available.';
    })();

    // --- Build mastery context ---
    const masterySection = (() => {
      if (!masteryBreakdown) return '';
      const { learning = [], mastered = [] } = masteryBreakdown;
      let section = '';
      if (learning.length > 0) {
        section += `\nWords the child is CURRENTLY LEARNING (prioritize books with these): ${learning.slice(0, 15).join(', ')}`;
      }
      if (mastered.length > 0) {
        section += `\nWords the child has MASTERED (good for reinforcement but don't over-focus): ${mastered.slice(0, 10).join(', ')}`;
      }
      return section;
    })();

    // --- Build spoken words context ---
    const spokenSection = (() => {
      if (!spokenWordStages) return '';
      const { growing = [], newWords = [] } = spokenWordStages;
      let section = '';
      if (growing.length > 0) {
        section += `\nWords the child is ACTIVELY TRYING TO SAY (high priority for book matching): ${growing.join(', ')}`;
      }
      if (newWords.length > 0) {
        section += `\nWords the child just started saying: ${newWords.join(', ')}`;
      }
      return section;
    })();

    // --- Build theme context ---
    const themeSection = themes && themes.length > 0
      ? `\nThe child's flashcards are organized into these themes/categories: ${themes.join(', ')}. Try to match books to these interest areas.`
      : '';

    // --- Build feedback context ---
    const feedbackSection = (() => {
      if (!feedbackHistory) return '';
      const { liked = [], disliked = [] } = feedbackHistory;
      let section = '';
      if (liked.length > 0) {
        section += `\nThe parent LIKED these previously recommended books (suggest similar styles/authors): ${liked.slice(0, 5).join(', ')}`;
      }
      if (disliked.length > 0) {
        section += `\nThe parent DISLIKED these books (avoid similar styles): ${disliked.slice(0, 5).join(', ')}`;
      }
      return section;
    })();

    // --- Exclude previously seen ---
    const excludeSection = excludeBooks && excludeBooks.length > 0
      ? `\nDo NOT recommend these books that were already shown: ${excludeBooks.join(', ')}. Pick completely different books.`
      : '';

    // --- Variety rotation ---
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

    const prompt = `You are an expert children's librarian specializing in multilingual and multicultural families.
CRITICAL RULES:
- Every book you recommend MUST be a real, published book with a verifiable ISBN. Do NOT invent titles.
- If you are unsure whether a book exists, do NOT include it. Only recommend books you are confident are real.
- Double-check: the title, author, and publisher must all be real and match a book available in libraries or major bookstores.
- Never recommend the same book twice across batches. The parent has already seen: ${(excludeBooks || []).join(', ') || 'none yet'}.

${ageInstruction}

The child is learning these vocabulary words: ${words.slice(0, 30).join(', ')}
${masterySection}
${spokenSection}
${themeSection}

${languageInstructions}
${feedbackSection}

For this batch, please ${varietyFocus}.

Recommend exactly 6 age-appropriate children's books that:
1. Feature vocabulary words the child is currently LEARNING (not just mastered ones)
2. Are REAL, PUBLISHED books — you must be certain of the title and author
3. Are diverse — no two books from the same author or series
4. Match the child's actual age range
5. Align with current interest themes when possible
6. Reflect parent feedback preferences when available

For each book, provide:
- title: The exact published book title
- author: The author's full name
- language: "English", "Bilingual (English/Chinese)", "Chinese", or other
- ageRange: e.g. "2-4 years"
- matchingWords: 2-4 of the child's vocabulary words that appear in this book
- description: 1-2 sentences on why this book helps with these words
- coverColor: one of: blue, green, purple, orange, pink, amber

Respond with valid JSON only:
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

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
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

    let books;
    try {
      let jsonStr = content;
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

    // Validate each book has required fields
    const requiredFields = ['title', 'author', 'language', 'ageRange', 'matchingWords', 'description', 'coverColor'];
    const validColors = ['blue', 'green', 'purple', 'orange', 'pink', 'amber'];

    books = books.filter((book: any) => {
      const hasAllFields = requiredFields.every(f => book[f] != null && book[f] !== '');
      if (!hasAllFields) {
        console.warn(`Dropping book missing fields: ${book.title || 'unknown'}`);
        return false;
      }
      // Normalize coverColor
      if (!validColors.includes(book.coverColor)) {
        book.coverColor = validColors[Math.floor(Math.random() * validColors.length)];
      }
      // Ensure matchingWords is an array
      if (!Array.isArray(book.matchingWords)) {
        book.matchingWords = [String(book.matchingWords)];
      }
      return true;
    });

    // Deduplicate by title (case-insensitive)
    const seenTitles = new Set<string>();
    const excludeSet = new Set((excludeBooks || []).map((t: string) => t.toLowerCase().trim()));
    books = books.filter((book: any) => {
      const key = book.title.toLowerCase().trim();
      if (seenTitles.has(key) || excludeSet.has(key)) {
        console.warn(`Deduplicating/excluding: ${book.title}`);
        return false;
      }
      seenTitles.add(key);
      return true;
    });

    console.log(`Validated ${books.length} book recommendations`);

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
