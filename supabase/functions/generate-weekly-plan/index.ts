import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rolling alias, not a pinned version — Google retired gemini-2.5-flash from
// the v1beta API ahead of its announced shutdown date and every call started
// 404ing. Same alias scan-flashcards uses.
const GEMINI_MODEL = "gemini-flash-latest";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Category progression for pre-speech mode
const CATEGORY_PROGRESSION = [
  'Family', 'Body', 'Household', 'Animals', 'Vehicles', 'Food', 'Colours', 'Actions', 'Phrases'
];

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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { weekStart, isFirstPlan } = body;

    // Fetch profile with onboarding data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Fetch flashcards
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id, front, back, folder, card_status, mastery_level, date_introduced, date_retired, set_number, card_type, phrase_group, active_day_count')
      .eq('user_id', user.id);

    // Fetch tracking data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: trackingData } = await supabase
      .from('daily_tracking')
      .select('flashcard_id, status, date')
      .eq('user_id', user.id)
      .eq('status', 'flashed')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    // Fetch spoken words
    const { data: spokenWords } = await supabase
      .from('spoken_words')
      .select('word, word_stage, notes')
      .eq('user_id', user.id);

    // Fetch daily flashing sessions for adherence
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentSessions } = await supabase
      .from('daily_flashing_sessions')
      .select('session_date, session_occurred')
      .eq('user_id', user.id)
      .gte('session_date', sevenDaysAgo.toISOString().split('T')[0]);

    // Calculate adherence
    const daysCompleted = recentSessions?.filter(s => s.session_occurred).length || 0;

    // Determine pre-speech mode
    const hasSpokenWords = spokenWords && spokenWords.length > 0;
    const isPreSpeech = !hasSpokenWords;

    // Build exposure history
    const exposureCounts: Record<string, number> = {};
    trackingData?.forEach(t => {
      exposureCounts[t.flashcard_id] = (exposureCounts[t.flashcard_id] || 0) + 1;
    });

    // Identify words mid-cycle (< 5 exposures) and eligible for replacement (>= 5)
    const midCycleWords = flashcards?.filter(f =>
      f.card_status === 'active' && (exposureCounts[f.id] || 0) < 5
    ) || [];
    const eligibleForReplacement = flashcards?.filter(f =>
      f.card_status === 'active' && (exposureCounts[f.id] || 0) >= 5
    ) || [];

    // Spoken word stages
    const ownedWords = spokenWords?.filter(w => w.word_stage === 'owned') || [];
    const growingWords = spokenWords?.filter(w => w.word_stage === 'growing') || [];
    const newSpokenWords = spokenWords?.filter(w => w.word_stage === 'new') || [];

    // Build AI prompt
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

    const childAge = profile?.child_age_band || '1-2';
    const targetLang = profile?.target_language || 'mandarin';
    const speechLevel = profile?.speech_level || 'few_single';
    const replyPattern = profile?.reply_pattern || 'english';
    const timeCommitment = profile?.daily_time_commitment || '3-5';

    const setsPerDay = timeCommitment === '1-2' ? 2 : 3;

    const systemPrompt = `You are Sprouttie's structured language activation engine. You generate weekly flashcard plans for toddlers learning ${targetLang}.

CORE RULES (NON-NEGOTIABLE):
- ${setsPerDay} sets per day
- Exactly 5 words per set
- ${setsPerDay * 5} active words total
- Each word must be flashed across 5 different days
- Maximum 1 phrase per set
- Rolling replacement: after 5 exposures, replace 1 word per set per day

CHILD PROFILE:
- Age: ${childAge}
- Target language: ${targetLang}
- Speech level: ${speechLevel}
- Reply pattern: ${replyPattern}
- Time commitment: ${timeCommitment} minutes/day

${isPreSpeech ? `PRE-SPEECH MODE: No spoken words logged. Follow category progression: ${CATEGORY_PROGRESSION.join(' → ')}. Start with Stage 1 foundational vocabulary.` : ''}

${speechLevel === 'short_phrases' ? 'PHRASE LOGIC: Child uses short phrases. Include 1 phrase per set where appropriate. For phrases, check component words - reinforce unstable components.' : ''}

${replyPattern === 'english' ? 'STABILISATION PRIORITY: Child replies in English. Prioritise words that need stabilisation over new exposure.' : ''}
${replyPattern === 'rarely' ? 'EXPOSURE PRIORITY: Child rarely replies. Focus on high-frequency, concrete vocabulary for passive recognition.' : ''}

WORD SELECTION PRIORITIES:
1. Words mid-cycle MUST continue (already started 5-day exposure)
2. Growing/unstable spoken words need reinforcement
3. New words from appropriate categories for age
4. Balance category distribution

Return a JSON object with this exact structure:
{
  "sets": [
    {
      "set_number": 1,
      "words": [
        { "word": "妈妈", "back": "mama", "category": "Family", "stage_icon": "🌿", "is_phrase": false, "reason": "mid-cycle continuation" }
      ]
    }
  ],
  "summary": {
    "active_words": 15,
    "eligible_for_replacement": 3,
    "stabilising_recently": 2
  }
}

stage_icon values: "🌱" (new/not spoken), "🌿" (growing), "🌳" (owned/mastered)
reason values: "mid-cycle", "stabilisation", "new-introduction", "phrase-reinforcement"`;

    const userPrompt = `Generate the weekly plan for week starting ${weekStart || new Date().toISOString().split('T')[0]}.

${isFirstPlan ? 'This is the FIRST plan ever generated for this family. Make it welcoming and foundational.' : ''}

CURRENT STATE:
- Words mid-cycle (MUST continue): ${midCycleWords.map(w => `${w.front} (${exposureCounts[w.id] || 0}/5 days)`).join(', ') || 'None'}
- Words eligible for replacement: ${eligibleForReplacement.map(w => w.front).join(', ') || 'None'}
- Existing categories: ${[...new Set(flashcards?.map(f => f.folder).filter(Boolean))].join(', ') || 'None'}

SPOKEN WORDS:
- 🌳 Owned: ${ownedWords.map(w => w.word).join(', ') || 'None'}
- 🌿 Growing: ${growingWords.map(w => w.word).join(', ') || 'None'}
- 🌱 New: ${newSpokenWords.map(w => w.word).join(', ') || 'None'}

LAST WEEK ADHERENCE: ${daysCompleted} of 7 days completed

Generate exactly ${setsPerDay} sets with exactly 5 words each. Maximum 1 phrase per set.`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generation_config: { response_mime_type: 'application/json', temperature: 0.4, thinking_config: { thinking_level: 'low' } },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Gemini API error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error('Gemini API error');
    }

    const aiData = await aiResponse.json();
    const rawPlanContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let plan;
    try {
      const jsonMatch = rawPlanContent.match(/\{[\s\S]*\}/);
      plan = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawPlanContent);
    } catch {
      throw new Error('Failed to parse plan from AI response');
    }

    // Validate plan structure
    if (!plan.sets || !Array.isArray(plan.sets)) {
      throw new Error('Invalid plan structure');
    }

    // Enforce constraints
    plan.sets = plan.sets.slice(0, setsPerDay);
    plan.sets.forEach((set: any) => {
      set.words = set.words.slice(0, 5);
      // Enforce max 1 phrase per set
      let phraseCount = 0;
      set.words = set.words.map((w: any) => {
        if (w.is_phrase) {
          phraseCount++;
          if (phraseCount > 1) return { ...w, is_phrase: false };
        }
        return w;
      });
    });

    return new Response(JSON.stringify({
      plan,
      weekStart: weekStart || new Date().toISOString().split('T')[0],
      setsPerDay,
      isPreSpeech,
      daysCompletedLastWeek: daysCompleted,
      isFirstPlan: !!isFirstPlan
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error in generate-weekly-plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
