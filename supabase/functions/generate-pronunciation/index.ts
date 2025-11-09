import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word_text, language } = await req.json();

    if (!word_text || !language) {
      throw new Error('word_text and language are required');
    }

    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY');
    if (!googleApiKey) {
      throw new Error('GOOGLE_CLOUD_TTS_API_KEY not configured');
    }

    // Map language codes to Google Cloud TTS language codes and voices
    const languageConfig: Record<string, { languageCode: string; name: string }> = {
      en: { languageCode: 'en-US', name: 'en-US-Neural2-C' },
      zh: { languageCode: 'cmn-CN', name: 'cmn-CN-Wavenet-A' },
      yue: { languageCode: 'yue-HK', name: 'yue-HK-Standard-A' },
      nan: { languageCode: 'cmn-TW', name: 'cmn-TW-Wavenet-A' } // Taiwanese Mandarin as proxy
    };

    const config = languageConfig[language];
    if (!config) {
      throw new Error(`Unsupported language: ${language}`);
    }

    console.log(`Generating pronunciation for "${word_text}" in ${language}`);

    // Call Google Cloud Text-to-Speech API
    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: word_text },
          voice: {
            languageCode: config.languageCode,
            name: config.name
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.9,
            pitch: 0
          }
        })
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error('Google TTS API error:', error);
      throw new Error(`TTS API failed: ${error}`);
    }

    const ttsData = await ttsResponse.json();
    const audioContent = ttsData.audioContent;

    if (!audioContent) {
      throw new Error('No audio content received from TTS API');
    }

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));

    // Upload to Supabase Storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const fileName = `${language}/${word_text.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.mp3`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pronunciations')
      .upload(fileName, binaryAudio, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pronunciations')
      .getPublicUrl(fileName);

    console.log(`Audio uploaded successfully: ${publicUrl}`);

    // Update or insert pronunciation record
    const { data: existing } = await supabase
      .from('pronunciations')
      .select('id')
      .eq('word_text', word_text)
      .eq('language', language)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('pronunciations')
        .update({ audio_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to update pronunciation: ${updateError.message}`);
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('pronunciations')
        .insert({
          word_text,
          language,
          audio_url: publicUrl,
          is_free: language === 'en' // English is free by default
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Failed to insert pronunciation: ${insertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        audio_url: publicUrl,
        word_text,
        language
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-pronunciation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
