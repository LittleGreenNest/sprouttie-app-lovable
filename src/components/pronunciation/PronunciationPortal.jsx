import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Volume2, Lock, Loader2, Filter, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PronunciationButton from './PronunciationButton';

const PronunciationPortal = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [words, setWords] = useState([]);
  const [pronunciations, setPronunciations] = useState({});
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState('free');
  const [showFullLanguagesOnly, setShowFullLanguagesOnly] = useState(false);
  const [loopCount, setLoopCount] = useState(1);

  const languages = [
    { code: 'en', label: 'English', emoji: '🇬🇧' },
    { code: 'zh', label: '华语', emoji: '🇨🇳' },
    { code: 'yue', label: '粤语', emoji: '🇭🇰' },
    { code: 'nan', label: '福建话', emoji: '🏴' }
  ];

  useEffect(() => {
    fetchUserProfile();
    fetchWords();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserPlan(profile.plan);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchWords = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch flashcards
      const { data: flashcards, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('id, front, folder')
        .eq('user_id', user.id)
        .order('folder', { ascending: true })
        .order('front', { ascending: true });

      if (flashcardsError) throw flashcardsError;

      // Fetch all pronunciations
      const { data: pronunciationsData, error: pronunciationsError } = await supabase
        .from('pronunciations')
        .select('word_text, language, audio_url, phonetic');

      if (pronunciationsError) throw pronunciationsError;

      // Group pronunciations by word
      const pronunciationsMap = {};
      pronunciationsData?.forEach(p => {
        if (!pronunciationsMap[p.word_text]) {
          pronunciationsMap[p.word_text] = {};
        }
        pronunciationsMap[p.word_text][p.language] = p;
      });

      setWords(flashcards || []);
      setPronunciations(pronunciationsMap);
    } catch (error) {
      console.error('Error fetching words:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWords = words.filter(word => {
    const matchesSearch = word.front.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (showFullLanguagesOnly) {
      const wordPronunciations = pronunciations[word.front] || {};
      return languages.every(lang => wordPronunciations[lang.code]);
    }

    return true;
  });

  const isPlanUpgradeNeeded = userPlan === 'free';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">🎧 Pronunciation Portal</h1>
              <p className="text-sm text-slate-600">Hear and compare words across languages</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search for any word..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-300 focus:outline-none transition-colors"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowFullLanguagesOnly(!showFullLanguagesOnly)}
                className={`px-4 py-3 rounded-xl border-2 transition-all ${
                  showFullLanguagesOnly
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white">
                <Play className="w-4 h-4 text-slate-600" />
                <select
                  value={loopCount}
                  onChange={(e) => setLoopCount(Number(e.target.value))}
                  className="border-none bg-transparent text-sm text-slate-700 focus:outline-none"
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                </select>
              </div>
            </div>
          </div>

          {showFullLanguagesOnly && (
            <p className="text-xs text-slate-500 mt-2">
              Showing only words with all 4 languages available
            </p>
          )}
        </div>
      </div>

      {/* Upgrade Banner for Free Users */}
      {isPlanUpgradeNeeded && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">Unlock Full Pronunciation Library</p>
                  <p className="text-sm text-amber-700">Hear Mandarin, Cantonese, and Hokkien instantly</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Word List */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="text-center py-12">
            <Volume2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No words found. Add flashcards to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredWords.map((word, index) => {
                const wordPronunciations = pronunciations[word.front] || {};
                
                return (
                  <motion.div
                    key={word.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    className="bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-emerald-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 text-lg">{word.front}</h3>
                        {word.folder && (
                          <span className="text-xs text-slate-500 mt-1 inline-block px-2 py-0.5 bg-slate-100 rounded">
                            {word.folder}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {languages.map(lang => (
                          <div key={lang.code} className="flex flex-col items-center gap-1">
                            <span className="text-xs text-slate-500">{lang.emoji}</span>
                            <PronunciationButton
                              wordId={word.id}
                              wordText={word.front}
                              language={lang.code}
                              userPlan={userPlan}
                              size="md"
                            />
                            {wordPronunciations[lang.code]?.phonetic && (
                              <span className="text-[10px] text-slate-400 max-w-[60px] truncate">
                                {wordPronunciations[lang.code].phonetic}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default PronunciationPortal;
