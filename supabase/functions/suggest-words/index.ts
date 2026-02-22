import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

    const { weekStart, setNumber } = await req.json();
    console.log(`suggest-words: user=${user.id}, week=${weekStart}, set=${setNumber || 'all'}`);

    // ── Fetch all data in parallel ──
    const [profileRes, flashcardsRes, trackingRes, spokenRes, plansRes] = await Promise.all([
      supabase.from('profiles')
        .select('teaching_method, target_language, child_age_band, speech_level, reply_pattern, caregivers, pets_and_toys, daily_activities')
        .eq('id', user.id).single(),
      supabase.from('flashcards')
        .select('id, front, back, folder, card_status, mastery_level, date_introduced, date_retired, set_number, active_day_count, card_type, phrase_group')
        .eq('user_id', user.id),
      supabase.from('daily_tracking')
        .select('flashcard_id, status, engagement, date')
        .eq('user_id', user.id)
        .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]),
      supabase.from('spoken_words')
        .select('word, notes, started_saying_at, word_stage')
        .eq('user_id', user.id),
      supabase.from('word_plans')
        .select('word')
        .eq('user_id', user.id)
        .eq('planned_week_start', weekStart),
    ]);

    const profile = profileRes.data;
    const allCards = flashcardsRes.data || [];
    const trackingData = trackingRes.data || [];
    const spokenWords = spokenRes.data || [];
    const existingPlanWords = (plansRes.data || []).map(p => p.word);

    // ── Build set-specific context ──
    const setCards = setNumber ? allCards.filter(f => f.set_number === setNumber) : allCards;
    const otherSetCards = setNumber ? allCards.filter(f => f.set_number && f.set_number !== setNumber) : [];

    const setActive = setCards.filter(f => f.card_status === 'active');
    const setRetired = setCards.filter(f => f.card_status === 'retired' || f.date_retired);
    const setWaiting = setCards.filter(f => f.card_status === 'waiting' || !f.card_status);
    const setCategories = [...new Set(setCards.map(f => f.folder).filter(Boolean))];
    const allCategories = [...new Set(allCards.map(f => f.folder).filter(Boolean))];
    const otherActiveWords = otherSetCards.filter(f => f.card_status === 'active').map(f => f.front);

    // Recently graduated (last 14 days) — do not re-introduce
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
    const recentlyGraduated = allCards
      .filter(f => f.date_retired && f.date_retired >= fourteenDaysAgo)
      .map(f => f.front);

    // Engagement analysis per category
    const categoryEngagement: Record<string, number[]> = {};
    trackingData.forEach(t => {
      if (!t.engagement) return;
      const card = allCards.find(c => c.id === t.flashcard_id);
      if (card?.folder) {
        if (!categoryEngagement[card.folder]) categoryEngagement[card.folder] = [];
        categoryEngagement[card.folder].push(t.engagement);
      }
    });
    const categoryEngagementSummary = Object.entries(categoryEngagement)
      .map(([cat, scores]) => `${cat}: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}/5`)
      .join(', ');

    // Spoken word analysis — detect vocabulary bursts & phrase ratio
    const spokenPhrases = spokenWords.filter(s => s.word.includes(' '));
    const phraseRatio = spokenWords.length > 0 ? spokenPhrases.length / spokenWords.length : 0;
    const isAdvancingStage = phraseRatio > 0.4;

    // Category frequency in spoken words (burst detection)
    const spokenRecent = spokenWords
      .sort((a, b) => new Date(b.started_saying_at).getTime() - new Date(a.started_saying_at).getTime())
      .slice(0, 20);

    // Words with stages
    const growingOrOwned = spokenWords
      .filter(s => s.word_stage === 'growing' || s.word_stage === 'owned')
      .map(s => s.word);

    // ── Build the prompt ──
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const setLabel = setNumber ? `Set ${setNumber}` : 'all sets';

    const systemPrompt = `You are Sprouttie's AI Word Planner — an expert early childhood vocabulary development specialist helping parents flash words to stabilise mother-tongue vocabulary that is already emerging in their child.

YOUR CORE PHILOSOPHY:
Every word you propose must be defensible against the question: "Why this word, for this child, this week?"
You stabilise vocabulary that is already emerging. You do NOT teach new concepts the child has never encountered — unless the child is pre-speech or the parent's onboarding data suggests the word is part of daily life.

HARD CONSTRAINTS (never break):
- Maximum 5 active words per set at any time
- Maximum 15 active words across all sets
- Each set operates independently — words do not move between sets
- Exactly 1 new word enters each set per completed flash day
- The same word must NEVER appear active in more than one set simultaneously
- A word that graduated in the last 14 days must NOT be re-introduced
- Never silently replace a word mid-cycle
- Never propose more than 1 new word per completed flash day

PHRASE RULES:
${isAdvancingStage 
  ? `This child is in advancing stage (${Math.round(phraseRatio * 100)}% of spoken words are phrases). The 1-phrase-per-set limit is LIFTED. Shift toward phrase-dominant sets.`
  : `This child is in early stage. Limit to 1 phrase per set. Single-word exposure is the priority.`}
- A phrase may be introduced when BOTH component words are 🌿 Growing or 🌳 Graduated — OR when the child is already spontaneously producing the phrase.
- A phrase counts as one word slot.

RANKING LOGIC (score each candidate):
6 (highest) — Word is the target-language equivalent of something the child is currently saying in any language
5 — Word completes a phrase pair where the other component is already 🌿 Growing or 🌳 Graduated
4 — Word is in a category where the child is in a vocabulary burst (multiple recent spoken words from same domain)
3 — Word is in a category with high engagement scores
2 — Word is in a category currently underrepresented across all active sets
1 (lowest) — Word is next in the developmental stage progression

Tiebreakers: (1) more recent in spoken word log, (2) more likely encountered in daily life, (3) simpler phonetic structure in target language.

LANGUAGE BRIDGE LOGIC:
If the child says something in English or Cantonese, queue the Mandarin (or target language) equivalent as HIGH PRIORITY. A child saying "Big truck" in English → flash "卡车". A child saying "Chor" in Cantonese → flash "坐".

VOCABULARY BURST HANDLING:
If the child is logging many words from one category, LEAN INTO IT — don't rotate away artificially. A burst is a neurological signal. But use different words from the domain in each set (no duplicates). After a burst plateaus (no new words in 2+ weeks), rotate toward underrepresented categories.

DEVELOPMENTAL STAGE FALLBACK (when spoken word data is sparse):
Stage 1 — Family members → Body parts → Household objects → Animals → Vehicles → Food
Stage 2 — Colours → Shapes → Clothing → Nature → Places
Stage 3 — Core action verbs → Descriptors → Positional words
Stage 4 — Simple phrases → Social phrases → Question forms
Use the child's actual speech level and spoken words to determine stage, not just age.

MUST NOT:
- Introduce a word with no connection to the child's current life or vocabulary
- Propose the same word in two sets simultaneously
- Introduce a phrase before both components are 🌿/🌳 (unless the child already says the phrase)
- Generate suggestions without surfacing reasoning
- Use words: "algorithm", "data", "model", "system", "protocol", "input", "output"

AI CONTEXT SENTENCE:
You MUST generate exactly one warm, parent-facing sentence per set explaining the queue logic. Reference something specific the child said if available. Never sound robotic.
Good: "Alexander is saying 'Big truck' and 'Yellow bus' — the next words build the Mandarin for vehicles he's already talking about in English."
Bad: "Based on vocabulary data, the algorithm has ranked these words by category frequency score."

RESPONSE FORMAT — Return JSON:
{
  "context_sentence": "One warm sentence explaining why these words were chosen for this set.",
  "suggestions": [
    {
      "word": "apple",
      "pinyin": null,
      "theme": "Food",
      "reasoning": "Builds on spoken word 'eat' and continues Set 1's food theme",
      "score": 6
    }
  ]
}

Suggest 5–8 words for ${setLabel}. Rank by score descending.`;

    const userPrompt = `CHILD PROFILE:
${profile?.child_age_band ? `Age band: ${profile.child_age_band}` : 'Age: unknown'}
${profile?.target_language ? `Target language(s): ${profile.target_language}` : ''}
${profile?.speech_level ? `Speech level: ${profile.speech_level}` : ''}
${profile?.reply_pattern ? `Reply pattern: ${profile.reply_pattern}` : ''}
${profile?.caregivers ? `Primary caregivers: ${profile.caregivers}` : ''}
${profile?.pets_and_toys ? `Pets & favourite toys: ${profile.pets_and_toys}` : ''}
${profile?.daily_activities ? `Daily activities: ${profile.daily_activities}` : ''}
${isAdvancingStage ? `⚡ Child is in ADVANCING STAGE — producing phrases spontaneously (${Math.round(phraseRatio * 100)}% of logged words are multi-word)` : ''}

WORDS YOUR CHILD IS SAYING (Priority 1 — highest signal):
${spokenWords.length > 0
  ? spokenWords
      .sort((a, b) => new Date(b.started_saying_at).getTime() - new Date(a.started_saying_at).getTime())
      .map(s => `- "${s.word}" (${s.word_stage}) ${s.notes ? `— ${s.notes}` : ''} [logged ${s.started_saying_at.split('T')[0]}]`)
      .join('\n')
  : 'No spoken words recorded yet — use developmental stage defaults + onboarding data.'}

Words at 🌿 Growing or 🌳 Owned (phrase-ready components):
${growingOrOwned.length > 0 ? growingOrOwned.join(', ') : 'None yet'}

CURRENT EXPOSURE STATE FOR ${setLabel.toUpperCase()} (Priority 2):
Active words:
${setActive.length > 0 ? setActive.map(f => `- ${f.front} (${f.folder || 'uncategorized'}, day ${f.active_day_count || 0}/5, type: ${f.card_type})`).join('\n') : 'None'}

Graduated/retired from ${setLabel}:
${setRetired.length > 0 ? setRetired.map(f => `- ${f.front} (${f.folder || 'uncategorized'})`).join('\n') : 'None yet'}

Waiting in ${setLabel}'s queue:
${setWaiting.length > 0 ? setWaiting.map(f => `- ${f.front} (${f.folder || 'uncategorized'})`).join('\n') : 'None'}

Categories in ${setLabel}: ${setCategories.length > 0 ? setCategories.join(', ') : 'None yet'}

CROSS-SET DEDUPLICATION — Words active in OTHER sets (AVOID):
${otherActiveWords.length > 0 ? otherActiveWords.join(', ') : 'None'}

Recently graduated (last 14 days — DO NOT re-introduce):
${recentlyGraduated.length > 0 ? recentlyGraduated.join(', ') : 'None'}

All categories across sets: ${allCategories.length > 0 ? allCategories.join(', ') : 'None'}

ENGAGEMENT LOG (Priority 3):
${categoryEngagementSummary || 'No engagement data yet'}

Already planned this week: ${existingPlanWords.length > 0 ? existingPlanWords.join(', ') : 'None'}

Please suggest 5–8 words for ${setLabel}, following the ranking logic and principles above. Include the context_sentence.`;

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
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached. Please try again later.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in AI response');

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try to find array
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          parsed = { suggestions: JSON.parse(arrayMatch[0]), context_sentence: null };
        } else {
          throw new Error('No JSON found in response');
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI suggestions');
    }

    const suggestions = parsed.suggestions || parsed;
    const contextSentence = parsed.context_sentence || null;

    console.log(`Generated ${Array.isArray(suggestions) ? suggestions.length : 0} suggestions`);

    return new Response(JSON.stringify({
      suggestions: Array.isArray(suggestions) ? suggestions : [],
      context_sentence: contextSentence,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error in suggest-words:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
