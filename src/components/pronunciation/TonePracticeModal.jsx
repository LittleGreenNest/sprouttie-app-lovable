import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Mic, Square, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-toastify';

const TonePracticeModal = ({ word, onClose, userPlan = 'free' }) => {
  const [isPlaying, setIsPlaying] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const languageAccess = {
    free: ['en'],
    print: ['en', 'zh'],
    'print-year': ['en', 'zh'],
    pro: ['en', 'zh', 'yue', 'nan']
  };

  const languages = [
    { code: 'en', label: 'English', color: 'from-blue-500 to-blue-600', icon: '🇬🇧' },
    { code: 'zh', label: '华语', color: 'from-red-500 to-red-600', icon: '🇨🇳' },
    { code: 'yue', label: '粤语', color: 'from-yellow-500 to-yellow-600', icon: '🇭🇰' },
    { code: 'nan', label: '福建话', color: 'from-green-500 to-green-600', icon: '🌏' }
  ];

  const hasAccess = (langCode) => languageAccess[userPlan]?.includes(langCode);

  const playPronunciation = async (langCode) => {
    if (!hasAccess(langCode)) {
      toast.warning('Upgrade to unlock this language');
      return;
    }

    setIsPlaying(langCode);
    
    try {
      const { data, error } = await supabase
        .from('pronunciations')
        .select('audio_url, phonetic')
        .eq('word_text', word.front)
        .eq('language', langCode)
        .single();

      if (error || !data?.audio_url) {
        toast.info('Audio coming soon for this language');
        setIsPlaying(null);
        return;
      }

      const audio = new Audio(data.audio_url);
      audio.onended = () => setIsPlaying(null);
      audio.onerror = () => {
        setIsPlaying(null);
        toast.error('Failed to play audio');
      };
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setFeedback(null);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const analyzePronunciation = async () => {
    if (!audioBlob) return;

    setIsAnalyzing(true);
    try {
      // Simulate AI analysis - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock feedback - replace with real AI analysis
      const mockResults = ['accurate', 'tryagain', 'toneoff'];
      const result = mockResults[Math.floor(Math.random() * mockResults.length)];
      
      setFeedback({
        type: result,
        message: result === 'accurate' 
          ? '✅ Excellent! Your pronunciation is accurate.'
          : result === 'tryagain'
          ? '⚠️ Good effort! Try listening again and repeat.'
          : '🎵 Close! Focus on the tone - listen carefully and try again.'
      });
    } catch (error) {
      console.error('Error analyzing:', error);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-2">{word.front}</h2>
              <p className="text-lg opacity-90">{word.back}</p>
            </div>
          </div>

          {/* Language Buttons */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">🎧 Listen & Compare</h3>
            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang) => {
                const locked = !hasAccess(lang.code);
                const playing = isPlaying === lang.code;
                
                return (
                  <motion.button
                    key={lang.code}
                    whileHover={!locked ? { scale: 1.02 } : {}}
                    whileTap={!locked ? { scale: 0.98 } : {}}
                    onClick={() => playPronunciation(lang.code)}
                    disabled={locked || playing}
                    className={`p-4 rounded-xl font-medium text-white transition-all ${
                      locked
                        ? 'bg-gray-300 cursor-not-allowed opacity-60'
                        : `bg-gradient-to-r ${lang.color} hover:shadow-lg`
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">{lang.icon}</span>
                      <span className="text-lg">{lang.label}</span>
                      {playing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : locked ? (
                        <span className="text-xs">🔒</span>
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Recording Section */}
            <div className="mt-8 p-6 bg-gradient-to-br from-[hsl(var(--sprouttie-mint))] to-[hsl(var(--sprouttie-beige))] rounded-2xl">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">🎙️ Your Turn - Record & Practice</h3>
              
              <div className="flex items-center justify-center gap-4 mb-4">
                {!isRecording && !audioBlob && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startRecording}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium shadow-lg flex items-center gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </motion.button>
                )}

                {isRecording && (
                  <motion.button
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    onClick={stopRecording}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-full font-medium shadow-lg flex items-center gap-2"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    Stop Recording
                  </motion.button>
                )}

                {audioBlob && !isRecording && (
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={analyzePronunciation}
                      disabled={isAnalyzing}
                      className="px-6 py-3 bg-[hsl(var(--sprouttie-green))] hover:bg-[hsl(var(--sprouttie-green-dark))] text-white rounded-full font-medium shadow-lg flex items-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Check My Tone
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setAudioBlob(null);
                        setFeedback(null);
                      }}
                      className="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-full font-medium shadow-lg"
                    >
                      Try Again
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-4 rounded-xl text-center font-medium ${
                      feedback.type === 'accurate'
                        ? 'bg-green-100 text-green-800 border-2 border-green-300'
                        : feedback.type === 'tryagain'
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                        : 'bg-orange-100 text-orange-800 border-2 border-orange-300'
                    }`}
                  >
                    {feedback.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TonePracticeModal;
