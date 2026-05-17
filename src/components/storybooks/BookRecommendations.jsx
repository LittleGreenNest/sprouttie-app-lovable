import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';
import { Book, Sparkles, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Globe, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

// Detect languages from flashcard words and spoken words
const detectLanguages = (flashcards, spokenWords) => {
  const languages = new Set(['english']);
  const allText = [
    ...flashcards.map(fc => `${fc.front || ''} ${fc.back || ''}`),
    ...spokenWords,
  ].join(' ');

  const hasCJK = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(allText);
  if (hasCJK) { languages.add('mandarin'); languages.add('chinese'); }
  const hasBopomofo = /[\u3100-\u312f]/.test(allText);
  if (hasBopomofo) languages.add('mandarin');
  const hasHokkienDiacritics = /[āáǎàāéêèěẽōóǒòōḿńňǹ]/i.test(allText);
  const hasHokkienFolder = flashcards.some(fc => fc.folder && /hokkien|taiwanese|台語|閩南/i.test(fc.folder));
  if (hasHokkienDiacritics || hasHokkienFolder) languages.add('hokkien');
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(allText);
  if (hasJapanese) languages.add('japanese');
  const hasKorean = /[\uac00-\ud7af]/.test(allText);
  if (hasKorean) languages.add('korean');

  return Array.from(languages);
};

const colorClasses = {
  blue: 'bg-blue-100 border-blue-300 text-blue-800',
  green: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  purple: 'bg-purple-100 border-purple-300 text-purple-800',
  orange: 'bg-orange-100 border-orange-300 text-orange-800',
  pink: 'bg-pink-100 border-pink-300 text-pink-800',
  amber: 'bg-amber-100 border-amber-300 text-amber-800',
};

const languageLabels = {
  english: '🇬🇧 English',
  mandarin: '🇨🇳 Mandarin',
  chinese: '🇨🇳 Chinese',
  cantonese: '🇭🇰 Cantonese',
  hokkien: '🎋 Hokkien',
  japanese: '🇯🇵 Japanese',
  korean: '🇰🇷 Korean',
};

// --- Sub-components ---

const WordSourcePanel = ({ flashedWords, spokenWords, detectedLanguages }) => (
  <div className="bg-secondary/30 rounded-lg p-4 mb-4 space-y-3">
    {detectedLanguages.length > 1 && (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
          <Globe className="w-3 h-3" /> Detected Languages:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {detectedLanguages.map(lang => (
            <span key={lang} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
              {languageLabels[lang] || lang}
            </span>
          ))}
        </div>
      </div>
    )}
    {flashedWords.length > 0 && (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">From Flashcards:</p>
        <div className="flex flex-wrap gap-1.5">
          {flashedWords.slice(0, 30).map((word, i) => (
            <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{word}</span>
          ))}
          {flashedWords.length > 30 && (
            <span className="text-xs text-muted-foreground">+{flashedWords.length - 30} more</span>
          )}
        </div>
      </div>
    )}
    {spokenWords.length > 0 && (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Words They Say:</p>
        <div className="flex flex-wrap gap-1.5">
          {spokenWords.slice(0, 30).map((word, i) => (
            <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">{word}</span>
          ))}
          {spokenWords.length > 30 && (
            <span className="text-xs text-muted-foreground">+{spokenWords.length - 30} more</span>
          )}
        </div>
      </div>
    )}
  </div>
);

const BookCard = ({ book, index, feedback, onFeedback }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className="bg-card rounded-xl border border-border overflow-hidden"
  >
    {/* Color Bar */}
    <div className={`h-2 ${colorClasses[book.coverColor]?.split(' ')[0] || 'bg-primary'}`} />

    <div className="p-4 space-y-3">
      <a
        href={`https://www.amazon.com/s?k=${encodeURIComponent((() => { const m = book.title.match(/\(([^)]+)\)/); const eng = m ? m[1] : book.title.replace(/[^\x00-\x7F]+/g, '').trim(); return eng || book.title; })())}&i=stripbooks`}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
        </div>
        <p className="text-sm text-muted-foreground">by {book.author}</p>
      </a>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-1 bg-secondary rounded-full text-muted-foreground">
          {book.ageRange}
        </span>
        {book.language && book.language !== 'English' && (
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
            {book.language}
          </span>
        )}
      </div>

      <p className="text-sm text-foreground/80">{book.description}</p>

      {book.matchingWords?.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Matching vocabulary:</p>
          <div className="flex flex-wrap gap-1.5">
            {book.matchingWords.map((word, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 text-xs rounded-full border ${colorClasses[book.coverColor] || 'bg-primary/10 text-primary border-primary/20'}`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Feedback buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <span className="text-xs text-muted-foreground mr-auto">Was this helpful?</span>
        <button
          onClick={() => onFeedback(book, 'up')}
          className={`p-1.5 rounded-lg transition-colors ${
            feedback === 'up'
              ? 'bg-emerald-100 text-emerald-600'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          aria-label="Thumbs up"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => onFeedback(book, 'down')}
          className={`p-1.5 rounded-lg transition-colors ${
            feedback === 'down'
              ? 'bg-red-100 text-red-500'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          aria-label="Thumbs down"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  </motion.div>
);

// --- Main Component ---

const BookRecommendations = () => {
  const { currentUser, profile } = useAuth();
  const { flashcards } = useFlashcards();

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [spokenWordsData, setSpokenWordsData] = useState([]);
  const [showWordSource, setShowWordSource] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [generateCount, setGenerateCount] = useState(0);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [excludeTitles, setExcludeTitles] = useState([]);

  // Fetch spoken words + book history + existing feedback on mount
  useEffect(() => {
    if (!currentUser) return;

    const fetchAll = async () => {
      const [spokenRes, historyRes, feedbackRes] = await Promise.all([
        supabase.from('spoken_words').select('word, word_stage').eq('user_id', currentUser.id),
        supabase.from('recommended_books').select('title').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('book_feedback').select('book_title, feedback').eq('user_id', currentUser.id),
      ]);

      if (spokenRes.data) setSpokenWordsData(spokenRes.data);
      if (historyRes.data) setExcludeTitles(historyRes.data.map(r => r.title));
      if (feedbackRes.data) {
        const map = {};
        feedbackRes.data.forEach(f => { map[f.book_title] = f.feedback; });
        setFeedbackMap(map);
      }
    };
    fetchAll();
  }, [currentUser]);

  const spokenWords = spokenWordsData.map(sw => sw.word);
  const flashedWords = [...new Set(flashcards.map(fc => fc.front || fc.word).filter(Boolean))];
  const allWords = [...new Set([...flashedWords, ...spokenWords])];
  const detectedLanguages = detectLanguages(flashcards, spokenWords);
  const isMultilingual = detectedLanguages.length > 1 || detectedLanguages.some(l => l !== 'english');

  // Build enriched data for the edge function
  const buildEnrichedPayload = () => {
    // Mastery breakdown from flashcards
    const learning = flashcards.filter(fc => (fc.mastery_level || 0) < 4).map(fc => fc.front).filter(Boolean);
    const mastered = flashcards.filter(fc => (fc.mastery_level || 0) >= 4).map(fc => fc.front).filter(Boolean);

    // Spoken word stages
    const growing = spokenWordsData.filter(sw => sw.word_stage === 'growing').map(sw => sw.word);
    const newWords = spokenWordsData.filter(sw => sw.word_stage === 'new').map(sw => sw.word);

    // Themes from flashcard folders
    const themes = [...new Set(flashcards.map(fc => fc.folder).filter(Boolean).filter(f => f !== 'default'))];

    // Feedback history
    const liked = Object.entries(feedbackMap).filter(([, v]) => v === 'up').map(([k]) => k);
    const disliked = Object.entries(feedbackMap).filter(([, v]) => v === 'down').map(([k]) => k);

    return {
      words: allWords,
      childAgeBand: profile?.child_age_band || null,
      targetLanguage: profile?.target_language || null,
      detectedLanguages,
      excludeBooks: excludeTitles,
      varietySeed: generateCount,
      themes,
      masteryBreakdown: { learning, mastered },
      spokenWordStages: { growing, newWords },
      feedbackHistory: { liked, disliked },
    };
  };

  // Save recommendations to DB
  const saveRecommendationsToDb = async (books) => {
    if (!currentUser) return;
    const rows = books.map(b => ({
      user_id: currentUser.id,
      title: b.title,
      author: b.author || null,
      language: b.language || null,
      age_range: b.ageRange || null,
      description: b.description || null,
      cover_color: b.coverColor || null,
      matching_words: b.matchingWords || [],
    }));
    const { error } = await supabase.from('recommended_books').insert(rows);
    if (error) console.error('Error saving book history:', error);
  };

  // Handle feedback
  const handleFeedback = async (book, type) => {
    if (!currentUser) return;
    const current = feedbackMap[book.title];
    const newType = current === type ? null : type; // toggle off if same

    setFeedbackMap(prev => {
      const next = { ...prev };
      if (newType) { next[book.title] = newType; }
      else { delete next[book.title]; }
      return next;
    });

    if (newType) {
      await supabase.from('book_feedback').upsert({
        user_id: currentUser.id,
        book_title: book.title,
        book_author: book.author || null,
        feedback: newType,
      }, { onConflict: 'user_id,book_title' });
    } else {
      await supabase.from('book_feedback')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('book_title', book.title);
    }
  };

  const generateRecommendations = useCallback(async () => {
    if (allWords.length === 0) {
      toast.error('Add some flashcards or spoken words first!');
      return;
    }

    setLoading(true);
    try {
      const payload = buildEnrichedPayload();

      const { data, error } = await supabase.functions.invoke('recommend-books', {
        body: payload,
      });

      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }

      const books = data.books || [];
      setRecommendations(books);
      setLastGenerated(new Date());
      setGenerateCount(c => c + 1);

      // Persist to DB instead of localStorage
      await saveRecommendationsToDb(books);
      setExcludeTitles(prev => [...new Set([...prev, ...books.map(b => b.title)])].slice(-30));

      toast.success(
        isMultilingual
          ? '📚 Books recommended in your languages!'
          : 'Book recommendations generated!'
      );
    } catch (error) {
      console.error('Error getting recommendations:', error);
      toast.error('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [allWords, detectedLanguages, generateCount, isMultilingual, feedbackMap, profile, spokenWordsData, flashcards, excludeTitles]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Book className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Book Recommendations</h2>
              <p className="text-sm text-muted-foreground">
                Based on {flashedWords.length} flashcard words and {spokenWords.length} spoken words
                {profile?.child_age_band && (
                  <span className="ml-1">· Age: {profile.child_age_band}</span>
                )}
                {isMultilingual && (
                  <span className="ml-1 text-primary font-medium">· Multilingual 🌏</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Word Source Toggle */}
        <button
          onClick={() => setShowWordSource(!showWordSource)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          {showWordSource ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          View vocabulary being used ({allWords.length} words)
        </button>

        <AnimatePresence>
          {showWordSource && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <WordSourcePanel
                flashedWords={flashedWords}
                spokenWords={spokenWords}
                detectedLanguages={detectedLanguages}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Button */}
        <button
          onClick={generateRecommendations}
          disabled={loading || allWords.length === 0}
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Finding perfect books...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              {recommendations.length > 0 ? 'Get New Recommendations' : 'Get Book Recommendations'}
            </>
          )}
        </button>

        {allWords.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            Add flashcards or spoken words to get personalized recommendations
          </p>
        )}

        {lastGenerated && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Last generated: {lastGenerated.toLocaleTimeString()} · Each refresh picks different books
          </p>
        )}
      </div>

      {/* Recommendations Grid */}
      {recommendations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.map((book, index) => (
            <BookCard
              key={`${book.title}-${index}`}
              book={book}
              index={index}
              feedback={feedbackMap[book.title] || null}
              onFeedback={handleFeedback}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {recommendations.length === 0 && !loading && (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Book className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">No recommendations yet</h3>
          <p className="text-sm text-muted-foreground">
            Click the button above to get personalised book suggestions
            {isMultilingual && ' — including bilingual books for your household!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BookRecommendations;
