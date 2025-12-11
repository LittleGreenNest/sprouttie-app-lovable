import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Sparkles, RefreshCw, ExternalLink, BookOpen, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const colorClasses = {
  blue: 'bg-blue-100 border-blue-200 text-blue-700',
  green: 'bg-green-100 border-green-200 text-green-700',
  purple: 'bg-purple-100 border-purple-200 text-purple-700',
  orange: 'bg-orange-100 border-orange-200 text-orange-700',
  pink: 'bg-pink-100 border-pink-200 text-pink-700',
};

const BookCard = ({ book, index }) => {
  const colorClass = colorClasses[book.coverColor] || colorClasses.blue;
  
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${book.title} ${book.author} children's book`)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex gap-4">
        {/* Book icon placeholder */}
        <div className={`w-16 h-20 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 border`}>
          <Book className="w-8 h-8" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-lg leading-tight">{book.title}</h3>
          <p className="text-slate-500 text-sm mt-0.5">by {book.author}</p>
          <p className="text-slate-400 text-xs mt-1">{book.ageRange}</p>
          
          <p className="text-slate-600 text-sm mt-2 line-clamp-2">{book.description}</p>
          
          {/* Matching words */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {book.matchingWords?.map((word, i) => (
              <span 
                key={i}
                className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full font-medium"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* Search link */}
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-600 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Find this book
      </a>
    </motion.div>
  );
};

const BookRecommendations = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [flashcards, setFlashcards] = useState([]);

  // Fetch user's flashcards
  useEffect(() => {
    const fetchFlashcards = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('flashcards')
        .select('front, back')
        .eq('user_id', user.id);
      
      if (!error && data) {
        setFlashcards(data);
      }
    };
    
    fetchFlashcards();
  }, [user]);

  const getRecommendations = async () => {
    if (flashcards.length === 0) {
      setError('Add some flashcards first to get personalized book recommendations!');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extract words from flashcards (use 'front' which is typically the word)
      const words = flashcards.map(fc => fc.front);

      const { data, error: fnError } = await supabase.functions.invoke('recommend-books', {
        body: { words, childAge: null }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setBooks(data.books || []);
    } catch (err) {
      console.error('Error getting recommendations:', err);
      setError(err.message || 'Failed to get book recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Please log in to get personalized book recommendations.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <span className="text-sm font-medium text-purple-600">AI-Powered</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Book Recommendations</h1>
        <p className="text-slate-500 mt-1">
          Find books that feature your child's learning words
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Vocabulary words</p>
            <p className="text-2xl font-semibold text-slate-900">{flashcards.length}</p>
          </div>
          <button
            onClick={getRecommendations}
            disabled={loading || flashcards.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Finding books...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Get Recommendations
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      {/* Books */}
      <AnimatePresence>
        {books.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-medium text-slate-900 flex items-center gap-2">
              <Book className="w-5 h-5 text-green-600" />
              Recommended Books
            </h2>
            
            <div className="grid gap-4">
              {books.map((book, index) => (
                <BookCard key={index} book={book} index={index} />
              ))}
            </div>
            
            <p className="text-xs text-slate-400 text-center mt-6">
              Recommendations are AI-generated. Please verify availability at your local library or bookstore.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!loading && books.length === 0 && !error && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">Ready to find books?</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Click "Get Recommendations" to find children's books that feature your child's vocabulary words.
          </p>
        </div>
      )}
    </div>
  );
};

export default BookRecommendations;
