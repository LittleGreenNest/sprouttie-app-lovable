import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Teaching method principles (generic names to avoid copyright)
const METHOD_PRINCIPLES = {
  whole_word_flash: {
    name: "Whole Word Flash Method",
    principles: [
      "Start with familiar, concrete nouns (body parts, family members, everyday objects)",
      "Introduce 5 new words per set, show 3 times daily",
      "Retire words after 10-15 days of exposure",
      "Progress: single words → couplets (big dog) → phrases → sentences",
      "Use large, clear text with enthusiasm",
      "Keep sessions brief (under 30 seconds per set)"
    ]
  },
  right_brain_speed: {
    name: "Right-Brain Speed Flash",
    principles: [
      "Flash cards rapidly (0.5-1 second per card)",
      "Group words by categories/themes for pattern recognition",
      "Include sensory and emotional vocabulary",
      "Use visual imagery and associations",
      "Emphasize right-brain engagement through speed",
      "Include both concrete and abstract concepts"
    ]
  },
  balanced: {
    name: "Balanced Approach",
    principles: [
      "Combine structured progression with thematic grouping",
      "Adapt pacing to child's engagement level",
      "Mix familiar words with new vocabulary",
      "Balance concrete nouns with action words and descriptors",
      "Follow child's interests for word selection",
      "Use repetition but vary presentation"
    ]
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { weekStart } = await req.json();
    console.log(`Generating suggestions for user ${user.id}, week starting ${weekStart}`);

    // Fetch user's teaching method preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('teaching_method')
      .eq('id', user.id)
      .single();

    const teachingMethod = profile?.teaching_method || 'balanced';
    const methodInfo = METHOD_PRINCIPLES[teachingMethod as keyof typeof METHOD_PRINCIPLES];
    console.log(`Using teaching method: ${methodInfo.name}`);

    // Fetch user's flashcards
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id, front, back, folder, card_status, mastery_level, date_introduced, date_retired, set_number')
      .eq('user_id', user.id);

    // Fetch recent tracking data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: trackingData } = await supabase
      .from('daily_tracking')
      .select('flashcard_id, status, engagement, date')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    // Fetch spoken words
    const { data: spokenWords } = await supabase
      .from('spoken_words')
      .select('word, notes, started_saying_at')
      .eq('user_id', user.id);

    // Fetch existing word plans for this week
    const { data: existingPlans } = await supabase
      .from('word_plans')
      .select('word')
      .eq('user_id', user.id)
      .eq('planned_week_start', weekStart);

    // Prepare context for AI
    const masteredWords = flashcards?.filter(f => f.card_status === 'retired' || (f.mastery_level && f.mastery_level >= 80)) || [];
    const activeWords = flashcards?.filter(f => f.card_status === 'active') || [];
    const waitingWords = flashcards?.filter(f => f.card_status === 'waiting' || !f.card_status) || [];
    const existingPlanWords = existingPlans?.map(p => p.word) || [];

    const context = {
      teachingMethod: methodInfo.name,
      principles: methodInfo.principles,
      masteredWords: masteredWords.map(f => f.front).slice(0, 50),
      activeWords: activeWords.map(f => f.front).slice(0, 30),
      waitingWords: waitingWords.map(f => ({ word: f.front, folder: f.folder })).slice(0, 50),
      spokenWords: spokenWords?.map(s => ({ word: s.word, notes: s.notes })) || [],
      existingPlanWords,
      categories: [...new Set(flashcards?.map(f => f.folder).filter(Boolean))],
      recentEngagement: trackingData?.reduce((acc, t) => {
        if (t.engagement) acc.push(t.engagement);
        return acc;
      }, [] as number[]) || []
    };

    console.log('Context prepared:', {
      masteredCount: context.masteredWords.length,
      activeCount: context.activeWords.length,
      waitingCount: context.waitingWords.length,
      spokenCount: context.spokenWords.length,
      existingPlanCount: context.existingPlanWords.length
    });

    // Call Lovable AI
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert early childhood vocabulary development specialist. You help parents plan which words to teach their children using flashcards.

You are using the "${methodInfo.name}" approach with these principles:
${methodInfo.principles.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Based on the child's learning history and spoken words, suggest 10-15 words for the upcoming week.

For each word, provide:
- The word itself
- Optional pinyin (if it's a Chinese word)
- A theme/category
- Brief reasoning (1 sentence) explaining why this word is appropriate now

Consider:
- Words the child is already saying (spoken words) - suggest related/expanding vocabulary
- Mastered words - build on these with related concepts
- Active words - don't duplicate these
- Waiting words from their library - prioritize these when appropriate
- Avoid words already planned for this week

Return JSON array with this structure:
[
  {
    "word": "apple",
    "pinyin": null,
    "theme": "Food",
    "reasoning": "Builds on spoken word 'eat' and follows concrete noun progression"
  }
]`;

    const userPrompt = `Here is the child's learning data:

**Spoken Words (what the child is saying):**
${context.spokenWords.length > 0 
  ? context.spokenWords.map(s => `- "${s.word}"${s.notes ? ` (${s.notes})` : ''}`).join('\n')
  : 'No spoken words recorded yet'}

**Mastered Words:**
${context.masteredWords.length > 0 ? context.masteredWords.join(', ') : 'None yet'}

**Currently Active Words:**
${context.activeWords.length > 0 ? context.activeWords.join(', ') : 'None'}

**Words in Library (waiting to be introduced):**
${context.waitingWords.length > 0 
  ? context.waitingWords.map(w => `${w.word} (${w.folder || 'uncategorized'})`).join(', ')
  : 'None'}

**Existing Categories:**
${context.categories.length > 0 ? context.categories.join(', ') : 'None'}

**Already Planned This Week:**
${context.existingPlanWords.length > 0 ? context.existingPlanWords.join(', ') : 'None'}

**Average Engagement Score:** ${context.recentEngagement.length > 0 
  ? (context.recentEngagement.reduce((a, b) => a + b, 0) / context.recentEngagement.length).toFixed(1) + '/5'
  : 'No data'}

Please suggest 10-15 words for the upcoming week, following the ${methodInfo.name} principles.`;

    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-preview-04-17',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached. Please try again later.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response (handle markdown code blocks)
    let suggestions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI suggestions');
    }

    console.log(`Generated ${suggestions.length} suggestions`);

    return new Response(JSON.stringify({ 
      suggestions,
      method: methodInfo.name,
      principles: methodInfo.principles
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error in suggest-words:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
