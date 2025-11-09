import React, { useState } from 'react';
import { Volume2, VolumeX, Loader2, Lock, Sparkles, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-toastify';

const PronunciationButton = ({ 
  wordId, 
  wordText, 
  language = 'en', 
  userPlan = 'free',
  size = 'sm',
  showLabel = false,
  isAiGenerated = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // Language access control
  const languageAccess = {
    free: ['en'],
    print: ['en', 'zh'],
    'print-year': ['en', 'zh'],
    pro: ['en', 'zh', 'yue', 'nan']
  };

  const languageLabels = {
    en: 'English',
    zh: '华语',
    yue: '粤语',
    nan: '福建话'
  };

  const hasAccess = languageAccess[userPlan]?.includes(language) || false;

  const handlePlay = async () => {
    if (!hasAccess) {
      setIsLocked(true);
      return;
    }

    setIsPlaying(true);
    
    try {
      // Fetch pronunciation from database
      const { data, error } = await supabase
        .from('pronunciations')
        .select('audio_url')
        .eq('word_text', wordText)
        .eq('language', language)
        .maybeSingle();

      if (error || !data?.audio_url) {
        toast.info('No audio available for this word yet. Audio files are being added!');
        setIsPlaying(false);
        return;
      }

      // Play audio
      const audio = new Audio(data.audio_url);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20
  };

  return (
    <div className="inline-flex items-center gap-1">
      <div className="relative">
        <button
          onClick={handlePlay}
          disabled={isPlaying}
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
            !hasAccess 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
              : isPlaying
              ? 'bg-emerald-100 text-emerald-600 scale-110'
              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-105'
          }`}
          title={!hasAccess ? 'Upgrade to unlock' : `Play ${languageLabels[language]} pronunciation`}
        >
          {!hasAccess ? (
            <Lock className={`w-${iconSizes[size]/4} h-${iconSizes[size]/4}`} />
          ) : isPlaying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Volume2 size={iconSizes[size]} />
          )}
        </button>
        {hasAccess && (
          <div 
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center bg-white border border-slate-200"
            title={isAiGenerated ? 'AI-generated audio' : 'Human-recorded audio'}
          >
            {isAiGenerated ? (
              <Sparkles className="w-2 h-2 text-purple-500" />
            ) : (
              <Mic className="w-2 h-2 text-blue-500" />
            )}
          </div>
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-slate-600">
          {languageLabels[language]}
        </span>
      )}
    </div>
  );
};

export default PronunciationButton;
