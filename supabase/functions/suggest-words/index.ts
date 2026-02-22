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

    const { weekStart, setNumber } = await req.json();
    console.log(`Generating suggestions for user ${user.id}, week starting ${weekStart}, set ${setNumber || 'all'}`);

    // Fetch user's teaching method preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('teaching_method, target_language, child_age_band, speech_level')
      .eq('id', user.id)
      .single();

    const teachingMethod = profile?.teaching_method || 'balanced';
    const methodInfo = METHOD_PRINCIPLES[teachingMethod as keyof typeof METHOD_PRINCIPLES];
    console.log(`Using teaching method: ${methodInfo.name}`);

    // Fetch user's flashcards
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id, front, back, folder, card_status, mastery_level, date_introduced, date_retired, set_number, active_day_count')
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

    // Build set-specific context
    const allCards = flashcards || [];
    const setCards = setNumber ? allCards.filter(f => f.set_number === setNumber) : allCards;
    const otherSetCards = setNumber ? allCards.filter(f => f.set_number && f.set_number !== setNumber) : [];

    // Set-specific breakdowns
    const setActive = setCards.filter(f => f.card_status === 'active');
    const setRetired = setCards.filter(f => f.card_status === 'retired' || f.date_retired);
    const setWaiting = setCards.filter(f => f.card_status === 'waiting' || !f.card_status);
    const setCategories = [...new Set(setCards.map(f => f.folder).filter(Boolean))];
    
    // Categories used across ALL sets (for variety awareness)
    const allCategories = [...new Set(allCards.map(f => f.folder).filter(Boolean))];
    
    // Words active in OTHER sets (to avoid cross-set duplication)
    const otherActiveWords = otherSetCards.filter(f => f.card_status === 'active').map(f => f.front);

    const existingPlanWords = existingPlans?.map(p => p.word) || [];

    const recentEngagement = trackingData?.reduce((acc, t) => {
      if (t.engagement) acc.push(t.engagement);
      return acc;
    }, [] as number[]) || [];

    console.log('Context prepared:', {
      setNumber,
      setActiveCount: setActive.length,
      setRetiredCount: setRetired.length,
      setWaitingCount: setWaiting.length,
      setCategories,
      otherActiveCount: otherActiveWords.length,
      spokenCount: spokenWords?.length || 0,
    });

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const setLabel = setNumber ? `Set ${setNumber}` : 'all sets';
    const systemPrompt = `You are an expert early childhood vocabulary development specialist. You help parents plan which words to teach their children using flashcards.

You are using the "${methodInfo.name}" approach with these principles:
${methodInfo.principles.map((p, i) => `${i + 1}. ${p}`).join('\n')}

You are suggesting words specifically for **${setLabel}**.${setNumber ? ` Each set is flashed independently 3x daily. Words in a set should be thematically coherent or developmentally sequenced.` : ''}

Based on the child's learning history, spoken words, and what's already in this set, suggest 5-8 words that would be good additions to ${setLabel}'s queue.

For each word, provide:
- The word itself
- Optional pinyin (if it's a Chinese word)
- A theme/category
- Brief reasoning (1 sentence) explaining why this word fits this set

Consider:
- **This set's history**: Words already mastered/retired in this set show the thematic pattern — continue it
- **This set's categories**: Suggest words that fit the established themes of this set
- Words the child is already saying (spoken words) — suggest related vocabulary
- **Don't duplicate**: Avoid words active in other sets or already planned
- Waiting words from their library — prioritize these when they fit the set's theme
${profile?.target_language ? `- The family is teaching: ${profile.target_language}` : ''}
${profile?.child_age_band ? `- Child's age band: ${profile.child_age_band}` : ''}
${profile?.speech_level ? `- Child's speech level: ${profile.speech_level}` : ''}

Return JSON array with this structure:
[
  {
    "word": "apple",
    "pinyin": null,
    "theme": "Food",
    "reasoning": "Builds on spoken word 'eat' and continues Set 1's food theme"
  }
]`;

    const userPrompt = `Here is the child's learning data for **${setLabel}**:

**Words currently active in ${setLabel}:**
${setActive.length > 0 ? setActive.map(f => `- ${f.front} (${f.folder || 'uncategorized'}, day ${f.active_day_count || 0}/5)`).join('\n') : 'None'}

**Words graduated/retired from ${setLabel}:**
${setRetired.length > 0 ? setRetired.map(f => `- ${f.front} (${f.folder || 'uncategorized'})`).join('\n') : 'None yet'}

**Words waiting in ${setLabel}'s queue:**
${setWaiting.length > 0 ? setWaiting.map(f => `- ${f.front} (${f.folder || 'uncategorized'})`).join('\n') : 'None'}

**Categories used in ${setLabel}:** ${setCategories.length > 0 ? setCategories.join(', ') : 'None yet'}

**Words active in OTHER sets (avoid duplicating):**
${otherActiveWords.length > 0 ? otherActiveWords.join(', ') : 'None'}

**All categories across sets:** ${allCategories.length > 0 ? allCategories.join(', ') : 'None'}

**Spoken Words (what the child is saying):**
${spokenWords && spokenWords.length > 0 
  ? spokenWords.map(s => `- "${s.word}"${s.notes ? ` (${s.notes})` : ''}`).join('\n')
  : 'No spoken words recorded yet'}

**Already Planned This Week:**
${existingPlanWords.length > 0 ? existingPlanWords.join(', ') : 'None'}

**Average Engagement Score:** ${recentEngagement.length > 0 
  ? (recentEngagement.reduce((a, b) => a + b, 0) / recentEngagement.length).toFixed(1) + '/5'
  : 'No data'}

Please suggest 5-8 words for ${setLabel}, following the ${methodInfo.name} principles and building on this set's existing themes.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
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
