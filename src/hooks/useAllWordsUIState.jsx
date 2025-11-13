import { useState, useEffect, useMemo } from 'react';

export const useAllWordsUIState = (flashcardsByCategory, allCategories) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('az');
  const [isCompact, setIsCompact] = useState(() => {
    return localStorage.getItem('allWords_compactView') === 'true';
  });
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Persist compact view preference
  useEffect(() => {
    localStorage.setItem('allWords_compactView', isCompact);
  }, [isCompact]);

  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Expand all categories
  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(flashcardsByCategory)));
  };

  // Collapse all categories
  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Filter and sort flashcards
  const filteredAndSortedCategories = useMemo(() => {
    let categories = Object.keys(flashcardsByCategory);

    // Filter by selected category
    if (selectedCategory !== 'all') {
      categories = categories.filter(cat => cat === selectedCategory);
    }

    // Filter by search query
    if (debouncedQuery) {
      const lowerQuery = debouncedQuery.toLowerCase();
      categories = categories.filter(category => {
        const categoryMatches = category.toLowerCase().includes(lowerQuery);
        const wordsMatch = flashcardsByCategory[category].some(card =>
          card.label.toLowerCase().includes(lowerQuery) ||
          (card.title || '').toLowerCase().includes(lowerQuery)
        );
        return categoryMatches || wordsMatch;
      });
    }

    // Sort categories
    categories.sort((a, b) => {
      switch (sortBy) {
        case 'az':
          return a.localeCompare(b);
        case 'za':
          return b.localeCompare(a);
        case 'most':
          return flashcardsByCategory[b].length - flashcardsByCategory[a].length;
        case 'least':
          return flashcardsByCategory[a].length - flashcardsByCategory[b].length;
        default:
          return 0;
      }
    });

    return categories;
  }, [flashcardsByCategory, selectedCategory, debouncedQuery, sortBy]);

  // Filter words within categories based on search
  const getFilteredWords = (categoryWords) => {
    if (!debouncedQuery) return categoryWords;
    
    const lowerQuery = debouncedQuery.toLowerCase();
    return categoryWords.filter(card =>
      card.label.toLowerCase().includes(lowerQuery) ||
      (card.title || '').toLowerCase().includes(lowerQuery)
    );
  };

  return {
    query,
    setQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    isCompact,
    setIsCompact,
    expandedCategories,
    toggleCategory,
    expandAll,
    collapseAll,
    filteredAndSortedCategories,
    getFilteredWords,
  };
};
