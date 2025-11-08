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
    <div className="min-h-screen bg-gradient-to-br from-[hsl(168,60%,95%)] via-[hsl(45,60%,97%)] to-[hsl(40,40%,92%)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-block p-4 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] rounded-3xl mb-4">
            <h1 className="text-4xl font-bold text-white mb-2">🎧 Practice Studio</h1>
          </div>
          <p className="text-lg text-gray-700 font-medium">Master tones in 4 languages • Record • Get AI feedback</p>
        </motion.div>

        {/* Search and Filters Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-3">

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
      </motion.div>

        {/* Upgrade Banner for Free Users */}
        {isPlanUpgradeNeeded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[hsl(var(--sprouttie-green))] via-[hsl(var(--sprouttie-coral))] to-[hsl(var(--sprouttie-green-dark))] rounded-3xl p-8 mb-6 shadow-2xl"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-white mb-2">🌟 Master All 4 Languages</h3>
                <p className="text-white/95 text-lg">Unlock Mandarin, Cantonese & Hokkien • Get AI tone feedback</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/plans'}
                className="px-8 py-4 bg-white text-[hsl(var(--sprouttie-green-dark))] font-bold rounded-2xl hover:shadow-xl transition-all text-lg"
              >
                Upgrade Now
              </motion.button>
            </div>
            </motion.div>
          )}

      {/* Word List */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--sprouttie-green))]" />
          </div>
        ) : filteredWords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-white rounded-3xl shadow-lg"
          >
            <Volume2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No words found. Add flashcards to get started!</p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredWords.map((word, index) => {
                const wordPronunciations = pronunciations[word.front] || {};
                
                const languagesWithColors = [
                  { code: 'en', label: 'English', emoji: '🇬🇧', color: 'from-blue-500 to-blue-600' },
                  { code: 'zh', label: '华语', emoji: '🇨🇳', color: 'from-red-500 to-red-600' },
                  { code: 'yue', label: '粤语', emoji: '🇭🇰', color: 'from-yellow-500 to-yellow-600' },
                  { code: 'nan', label: '福建话', emoji: '🌏', color: 'from-green-500 to-green-600' }
                ];
                
                return (
                  <motion.div
                    key={word.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent hover:border-[hsl(var(--sprouttie-green))]"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-2xl mb-1">{word.front}</h3>
                        {word.folder && (
                          <span className="text-sm text-gray-600 inline-block px-3 py-1 bg-[hsl(var(--sprouttie-beige))] rounded-full">
                            {word.folder}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
                        {languagesWithColors.map(lang => (
                          <div key={lang.code} className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                            <span className="text-2xl">{lang.emoji}</span>
                            <PronunciationButton
                              wordId={word.id}
                              wordText={word.front}
                              language={lang.code}
                              userPlan={userPlan}
                              size="md"
                              showLabel={false}
                            />
                            <span className="text-xs font-medium text-gray-600">{lang.label}</span>
                            {wordPronunciations[lang.code]?.phonetic && (
                              <span className="text-[10px] text-gray-400 text-center">
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
