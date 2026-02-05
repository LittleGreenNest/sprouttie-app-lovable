import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';
import { Book, Sparkles, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

const BookRecommendations = () => {
  const { currentUser } = useAuth();
  const { flashcards } = useFlashcards();
  
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [spokenWords, setSpokenWords] = useState([]);
  const [showWordSource, setShowWordSource] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  // Fetch spoken words
  useEffect(() => {
    const fetchSpokenWords = async () => {
      if (!currentUser) return;
      
      const { data, error } = await supabase
        .from('spoken_words')
        .select('word')
        .eq('user_id', currentUser.id);
      
      if (!error && data) {
        setSpokenWords(data.map(sw => sw.word));
      }
    };
    
    fetchSpokenWords();
  }, [currentUser]);

  // Get unique words from flashcards
  const flashedWords = [...new Set(flashcards.map(fc => fc.front || fc.word).filter(Boolean))];
  
  // Combine both sources
  const allWords = [...new Set([...flashedWords, ...spokenWords])];

  const generateRecommendations = async () => {
    if (allWords.length === 0) {
      toast.error('Add some flashcards or spoken words first!');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-books', {
        body: { 
          words: allWords,
          childAge: null // Could be enhanced to pull from profile
        }
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setRecommendations(data.books || []);
      setLastGenerated(new Date());
      toast.success('Book recommendations generated!');
    } catch (error) {
      console.error('Error getting recommendations:', error);
      toast.error('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const colorClasses = {
    blue: 'bg-blue-100 border-blue-300 text-blue-800',
    green: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    purple: 'bg-purple-100 border-purple-300 text-purple-800',
    orange: 'bg-orange-100 border-orange-300 text-orange-800',
    pink: 'bg-pink-100 border-pink-300 text-pink-800',
  };

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
              <h2 className="text-xl font-semibold text-foreground">AI Book Recommendations</h2>
              <p className="text-sm text-muted-foreground">
                Based on {flashedWords.length} flashcard words and {spokenWords.length} spoken words
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
              <div className="bg-secondary/30 rounded-lg p-4 mb-4 space-y-3">
                {flashedWords.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">From Flashcards:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {flashedWords.slice(0, 30).map((word, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                          {word}
                        </span>
                      ))}
                      {flashedWords.length > 30 && (
                        <span className="text-xs text-muted-foreground">+{flashedWords.length - 30} more</span>
                      )}
                    </div>
                  </div>
                )}
                
                {spokenWords.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Words He Says:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {spokenWords.slice(0, 30).map((word, i) => (
                        <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                          {word}
                        </span>
                      ))}
                      {spokenWords.length > 30 && (
                        <span className="text-xs text-muted-foreground">+{spokenWords.length - 30} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
              Get Book Recommendations
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
            Last generated: {lastGenerated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Recommendations Grid */}
      {recommendations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.map((book, index) => (
            <motion.a
              key={index}
              href={`https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author)}&i=stripbooks`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow block cursor-pointer group"
            >
              {/* Color Bar */}
              <div className={`h-2 ${colorClasses[book.coverColor]?.split(' ')[0] || 'bg-primary'}`} />
              
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{book.title}</h3>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="text-sm text-muted-foreground">by {book.author}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-secondary rounded-full text-muted-foreground">
                    {book.ageRange}
                  </span>
                </div>

                <p className="text-sm text-foreground/80">{book.description}</p>

                {book.matchingWords?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Matching vocabulary:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {book.matchingWords.map((word, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 text-xs rounded-full border ${colorClasses[book.coverColor] || 'bg-primary/10 text-primary'}`}
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.a>
          ))}
        </div>
      )}

      {/* Empty State */}
      {recommendations.length === 0 && !loading && (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Book className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">No recommendations yet</h3>
          <p className="text-sm text-muted-foreground">
            Click the button above to get AI-powered book suggestions
          </p>
        </div>
      )}
    </div>
  );
};

export default BookRecommendations;
