// components/FlashcardManager.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useFlashcards } from '../context/FlashcardContext';
import { supabase } from '@/integrations/supabase/client';
import CSVImport from './CSVImport';
import PrintFlashcards from './PrintFlashcards';
import { History } from 'lucide-react';

// The lookup itself takes roughly a second, so it is the long pole, not the
// wait before it. 450ms still coalesces a burst of typing without adding a
// noticeable pause of its own.
const DEBOUNCE_MS = 450;

const FlashcardManager = () => {
  const navigate = useNavigate();
  const {
    categories,
    setCategories,
    flashcards,
    plan,
    addCategory,
    updateCategory,
    deleteCategory,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard
  } = useFlashcards();

  const FREE_CARD_LIMIT = 100;
  const isAtFreeLimit = plan === 'free' && flashcards.length >= FREE_CARD_LIMIT;
  
  // UI state
  const [activeTab, setActiveTab] = useState('categories');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [showCSVImport, setShowCSVImport] = useState(false);
  
  // Form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newFlashcardWord, setNewFlashcardWord] = useState('');
  const [newFlashcardCategory, setNewFlashcardCategory] = useState('');
  const [newFlashcardEnglish, setNewFlashcardEnglish] = useState('');
  const [newFlashcardPinyin, setNewFlashcardPinyin] = useState('');
  const [newCardType, setNewCardType] = useState('word');
  const [newPhraseGroup, setNewPhraseGroup] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editFlashcardId, setEditFlashcardId] = useState(null);
  const [editFlashcardWord, setEditFlashcardWord] = useState('');
  const [editFlashcardCategory, setEditFlashcardCategory] = useState('');
  const [editFlashcardEnglish, setEditFlashcardEnglish] = useState('');
  const [editFlashcardPinyin, setEditFlashcardPinyin] = useState('');
  const [editCardType, setEditCardType] = useState('word');
  const [editPhraseGroup, setEditPhraseGroup] = useState('');

  // AI auto-fill state
  const [aiLoading, setAiLoading] = useState(false);
  const aiTimeoutRef = useRef(null);
  const translationCache = useRef(new Map());
  // Responses can land out of order, so only the newest lookup may fill fields.
  const aiRequestRef = useRef(0);
  
  // Card language: 'zh' (Chinese) or 'en' (English)
  const [cardLanguage, setCardLanguage] = useState('zh');
  
  // Input mode: 'chinese' (default) or 'english' — only for CN cards
  const [inputMode, setInputMode] = useState('chinese');
  const [englishInput, setEnglishInput] = useState('');

  // Message state
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Show message function
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // Words repeat constantly while building a set, and a repeat lookup costs a
  // full round trip for an answer we already had. Cache per session.
  const applyTranslation = (data) => {
    if (data?.chinese) setNewFlashcardWord(data.chinese);
    if (data?.english) setNewFlashcardEnglish(data.english);
    if (data?.pinyin) setNewFlashcardPinyin(data.pinyin);
  };

  // AI auto-fill: debounce Chinese word input → English + Pinyin
  const handleWordChange = (value) => {
    setNewFlashcardWord(value);

    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

    const term = value.trim();
    const hasChinese = /[\u4e00-\u9fff]/.test(term);
    if (!hasChinese || term.length === 0) {
      // Without this the spinner sticks on forever when the field is cleared
      // or edited back below the threshold.
      aiRequestRef.current++;
      setAiLoading(false);
      return;
    }

    const cached = translationCache.current.get(`zh:${term}`);
    if (cached) {
      aiRequestRef.current++;
      setAiLoading(false);
      applyTranslation(cached);
      return;
    }

    const requestId = ++aiRequestRef.current;
    aiTimeoutRef.current = setTimeout(async () => {
      // Only now is a request actually in flight. Setting this on keystroke
      // showed "Translating…" through the whole time the user was still typing.
      setAiLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('translate-word', {
          body: { word: term },
        });
        if (error) throw error;
        translationCache.current.set(`zh:${term}`, data);
        if (requestId === aiRequestRef.current) applyTranslation(data);
      } catch (err) {
        console.error('AI auto-fill error:', err);
      } finally {
        if (requestId === aiRequestRef.current) setAiLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  // AI auto-fill: debounce English input → Chinese + Pinyin
  const handleEnglishInputChange = (value) => {
    setEnglishInput(value);

    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

    const term = value.trim();
    if (term.length < 2) {
      aiRequestRef.current++;
      setAiLoading(false);
      return;
    }

    const cached = translationCache.current.get(`en:${term}`);
    if (cached) {
      aiRequestRef.current++;
      setAiLoading(false);
      applyTranslation(cached);
      return;
    }

    const requestId = ++aiRequestRef.current;
    aiTimeoutRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('translate-word', {
          body: { word: term, direction: 'en-to-zh' },
        });
        if (error) throw error;
        translationCache.current.set(`en:${term}`, data);
        if (requestId === aiRequestRef.current) applyTranslation(data);
      } catch (err) {
        console.error('AI English→Chinese error:', err);
      } finally {
        if (requestId === aiRequestRef.current) setAiLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, []);
  
  // Toggle CSV import modal
  const toggleCSVImport = () => {
    setShowCSVImport(!showCSVImport);
  };

  // Export flashcards as CSV
  const handleExportFlashcards = () => {
    try {
      // Get flashcards to export - filter by category if one is selected
      const cardsToExport = selectedCategoryId 
        ? flashcards.filter(card => card.categoryId === selectedCategoryId)
        : flashcards;
      
      if (cardsToExport.length === 0) {
        toast.error('No flashcards to export.');
        return;
      }
      
      // Get all unique category IDs from the cards
      const categoryIds = [...new Set(cardsToExport.map(card => card.categoryId))];
      
      // Get category names
      const categoryNames = categoryIds.map(id => {
        const category = categories.find(c => c.id === id);
        return category ? category.name : 'Unknown';
      });
      
      // Create a CSV with a column for each category
      const csvData = {};
      
      // Initialize arrays for each category
      categoryNames.forEach(name => {
        csvData[name] = [];
      });
      
      // Group flashcards by category
      cardsToExport.forEach(card => {
        const category = categories.find(c => c.id === card.categoryId);
        const categoryName = category ? category.name : 'Unknown';
        
        csvData[categoryName].push(card.word);
      });
      
      // Find the maximum length of any category's flashcards
      const maxLength = Math.max(...Object.values(csvData).map(arr => arr.length));
      
      // Create CSV rows
      const csvRows = [];
      
      // Add header row with category names
      csvRows.push(Object.keys(csvData).join(','));
      
      // Add data rows
      for (let i = 0; i < maxLength; i++) {
        const row = Object.values(csvData).map(arr => {
          // Use the word if it exists, or empty string if we're past this category's length
          const word = i < arr.length ? arr[i] : '';
          // Escape any commas or quotes in the word
          return word.includes(',') || word.includes('"') 
            ? `"${word.replace(/"/g, '""')}"` 
            : word;
        });
        
        csvRows.push(row.join(','));
      }
      
      // Create the CSV content
      const csvContent = csvRows.join('\n');
      
      // Create and trigger the download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = selectedCategoryId
        ? `flashcards-${categories.find(c => c.id === selectedCategoryId)?.name || 'category'}.csv`
        : 'all-flashcards.csv';
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting flashcards:", error);
      toast.error('There was an error exporting the flashcards. Please try again.');
    }
  };
  
  // Handlers for Categories
  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    addCategory(newCategoryName);
    setNewCategoryName('');
    showMessage('Category added successfully');
  };
  
  const handleEditCategory = (category) => {
    setEditCategoryId(category.id);
    setEditCategoryName(category.name);
  };
  
  const handleUpdateCategory = (e) => {
    e.preventDefault();
    if (!editCategoryName.trim() || !editCategoryId) return;
    
    updateCategory(editCategoryId, editCategoryName);
    setEditCategoryId(null);
    setEditCategoryName('');
    showMessage('Category updated successfully');
  };
  
  const handleDeleteCategory = (categoryId) => {
    // Check if there are flashcards using this category
    const categoryFlashcards = flashcards.filter(card => card.categoryId === categoryId);
    
    if (categoryFlashcards.length > 0) {
      const confirmed = window.confirm(
        `Are you sure you want to delete this category? There are ${categoryFlashcards.length} word(s) tied to this category. Deleting will also remove all associated flashcards.`
      );
      
      if (!confirmed) {
        return;
      }
      
      // Delete all flashcards in this category first
      categoryFlashcards.forEach(card => {
        deleteFlashcard(card.id);
      });
    }
    
    // Now delete the category
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    showMessage('Category deleted successfully');
  };
  
  // Handlers for Flashcards
  const handleAddFlashcard = async (e) => {
    e.preventDefault();

    if (isAtFreeLimit) {
      navigate('/plans');
      return;
    }

    if (cardLanguage === 'en') {
      // English card: front = english word, back = description/hint
      if (!newFlashcardEnglish.trim() || !newFlashcardCategory) return;
      
      const existingCard = flashcards.find(
        card => card.word.toLowerCase().trim() === newFlashcardEnglish.toLowerCase().trim()
      );
      if (existingCard) {
        const existingCategory = categories.find(c => c.id === existingCard.categoryId);
        const targetCategory = categories.find(c => c.id === newFlashcardCategory);
        const isSameCategory = existingCard.categoryId === newFlashcardCategory;
        const msg = isSameCategory
          ? `"${newFlashcardEnglish}" already exists in "${existingCategory?.name || 'Unknown'}". Do you want to add it again?`
          : `"${newFlashcardEnglish}" already exists in "${existingCategory?.name || 'Unknown'}". Do you still want to add it to "${targetCategory?.name || 'Unknown'}"?`;
        if (!window.confirm(msg)) return;
      }
      
      try {
        await addFlashcard(
          newFlashcardEnglish,
          newFlashcardCategory,
          newFlashcardPinyin,
          '',
          newCardType,
          newCardType === 'phrase' ? newPhraseGroup : null,
          'en'
        );
      } catch (err) {
        if (err?.message === 'FREE_LIMIT_REACHED') { navigate('/plans'); return; }
        throw err;
      }
      setNewFlashcardEnglish('');
      setNewFlashcardPinyin('');
      setNewCardType('word');
      setNewPhraseGroup('');
      showMessage(`English ${newCardType === 'phrase' ? 'phrase' : 'card'} added successfully`);
      return;
    }
    
    // Chinese card (existing logic)
    if (!newFlashcardWord.trim() || !newFlashcardCategory) return;
    
    const existingCard = flashcards.find(
      card => card.word.toLowerCase().trim() === newFlashcardWord.toLowerCase().trim()
    );
    
    if (existingCard) {
      const existingCategory = categories.find(c => c.id === existingCard.categoryId);
      const targetCategory = categories.find(c => c.id === newFlashcardCategory);
      
      const isSameCategory = existingCard.categoryId === newFlashcardCategory;
      const message = isSameCategory
        ? `"${newFlashcardWord}" already exists in "${existingCategory?.name || 'Unknown'}". Do you want to add it again?`
        : `"${newFlashcardWord}" already exists in "${existingCategory?.name || 'Unknown'}". Do you still want to add it to "${targetCategory?.name || 'Unknown'}"?`;
      
      if (!window.confirm(message)) {
        return;
      }
    }
    
    try {
      await addFlashcard(
        newFlashcardWord,
        newFlashcardCategory,
        newFlashcardEnglish,
        newFlashcardPinyin,
        newCardType,
        newCardType === 'phrase' ? newPhraseGroup : null,
        'zh'
      );
    } catch (err) {
      if (err?.message === 'FREE_LIMIT_REACHED') { navigate('/plans'); return; }
      throw err;
    }
    setNewFlashcardWord('');
    setNewFlashcardEnglish('');
    setNewFlashcardPinyin('');
    setNewCardType('word');
    setNewPhraseGroup('');
    setEnglishInput('');

    showMessage(`${newCardType === 'phrase' ? 'Phrase' : 'Flashcard'} added successfully`);
  };
  
 const handleEditFlashcard = (flashcard) => {
  setEditFlashcardId(flashcard.id);
  setEditFlashcardWord(flashcard.word);
  setEditFlashcardCategory(flashcard.categoryId);
  setEditFlashcardEnglish(flashcard.english || '');
  setEditFlashcardPinyin(flashcard.pinyin || '');
  setEditCardType(flashcard.card_type || 'word');
  setEditPhraseGroup(flashcard.phrase_group || '');
};
  
  const handleUpdateFlashcard = (e) => {
    e.preventDefault();
    if (!editFlashcardWord.trim() || !editFlashcardCategory || !editFlashcardId) return;
    
   updateFlashcard(editFlashcardId, {
  word: editFlashcardWord,
  english: editFlashcardEnglish,
  pinyin: editFlashcardPinyin,
  categoryId: editFlashcardCategory,
  card_type: editCardType,
  phrase_group: editCardType === 'phrase' ? editPhraseGroup : null
});

    
    setEditFlashcardId(null);
    setEditFlashcardWord('');
    setEditFlashcardCategory('');
    setEditCardType('word');
    setEditPhraseGroup('');
    showMessage('Flashcard updated successfully');
  };
  
  const handleDeleteFlashcard = (flashcardId) => {
    if (!window.confirm('Delete this flashcard?')) return;
    deleteFlashcard(flashcardId);
    showMessage('Flashcard deleted successfully');
  };
  
  return (
    <div>
      {/* Free plan usage banner */}
      {plan === 'free' && (
        <div className={`mb-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
          isAtFreeLimit
            ? 'bg-amber-50 border border-amber-200'
            : flashcards.length >= 40
            ? 'bg-amber-50 border border-amber-100'
            : 'bg-[hsl(var(--sprouttie-mint))] border border-[hsl(var(--border))]'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            <span>{isAtFreeLimit ? '⚠️' : '🃏'}</span>
            <span className="text-[hsl(var(--sprouttie-ink))] font-medium">
              {flashcards.length}/{FREE_CARD_LIMIT} cards used
            </span>
            {isAtFreeLimit && (
              <span className="text-amber-700">— You've reached the free limit.</span>
            )}
          </div>
          <button
            onClick={() => navigate('/plans')}
            className="flex-shrink-0 text-xs font-semibold text-white bg-[hsl(var(--sprouttie-green))] hover:bg-[hsl(var(--sprouttie-green-dark))] px-3 py-1.5 rounded-lg transition-colors"
          >
            Upgrade
          </button>
        </div>
      )}

      {/* CSV Import Modal — CSVImport renders its own full-screen overlay */}
      {showCSVImport && <CSVImport onClose={toggleCSVImport} />}

      {/* Flashed History + Import/Export Buttons */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate('/flashed-history')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--sprouttie-ink))] bg-white border border-[hsl(var(--border))] rounded-xl hover:border-[hsl(var(--sprouttie-green))] transition-colors"
        >
          <History className="w-4 h-4" />
          Flashed History
        </button>
        <div className="flex space-x-3">
        <button
          onClick={handleExportFlashcards}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
            />
          </svg>
          Export as CSV
        </button>
        <button
          onClick={toggleCSVImport}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" 
            />
          </svg>
          Import from CSV
        </button>
        </div>
      </div>
      
      {/* Notification Message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded ${
          message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex items-center justify-between mb-6 border-b">
        <div className="flex">
          <button
            className={`px-4 py-2 ${activeTab === 'categories' ? 'bg-blue-100 border-b-2 border-blue-500 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveTab('categories')}
          >
            Categories
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'flashcards' ? 'bg-blue-100 border-b-2 border-blue-500 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveTab('flashcards')}
          >
            Flashcards
          </button>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 mb-1 text-sm font-medium text-sprouttie-green border border-sprouttie-green rounded-lg hover:bg-sprouttie-mint/30 transition-colors"
          onClick={() => setActiveTab('print-flashcards')}
        >
          🖨️ Print
        </button>
      </div>
      
      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Add Category Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-medium mb-3">Add New Category</h3>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="Category name"
                className="flex-1 border rounded-md px-3 py-2"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
              />
              <button 
                type="submit"
                className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600"
>
                Add
              </button>
            </form>
          </div>
          
          {/* Categories List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-medium mb-3">Categories</h3>
            {categories.length === 0 ? (
              <p className="text-gray-500">No categories yet. Add one above.</p>
            ) : (
              <div className="space-y-2">
                {categories.map(category => (
                  <div key={category.id} className="border rounded-md p-3 flex justify-between items-center">
                    {editCategoryId === category.id ? (
                      <form onSubmit={handleUpdateCategory} className="flex-1 flex gap-2">
                        <input
                          type="text"
                          className="flex-1 border rounded-md px-3 py-1"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          required
                        />
                        <button 
                          type="submit"
                          className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button 
                          type="button"
                          className="bg-gray-200 px-3 py-1 rounded-md hover:bg-gray-300"
                          onClick={() => {
                            setEditCategoryId(null);
                            setEditCategoryName('');
                          }}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <span>{category.name}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditCategory(category)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Flashcards Tab */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          {/* Add Flashcard Form */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
            <h3 className="text-lg font-semibold mb-4">Add New Card</h3>
            <form onSubmit={handleAddFlashcard} className="space-y-4">
              {/* Card Language Toggle (top-level) */}
              <div>
                <label className="block text-sm font-medium mb-2">Flashcard Language</label>
                <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => { setCardLanguage('zh'); }}
                    className={`px-3 py-1.5 rounded-full transition ${
                      cardLanguage === 'zh' 
                        ? 'bg-white shadow-sm font-semibold text-slate-900' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🇨🇳 Chinese Card
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCardLanguage('en'); setInputMode('chinese'); setEnglishInput(''); }}
                    className={`px-3 py-1.5 rounded-full transition ${
                      cardLanguage === 'en' 
                        ? 'bg-white shadow-sm font-semibold text-slate-900' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🇬🇧 English Card
                  </button>
                </div>
              </div>

              {/* ===== ENGLISH CARD FORM ===== */}
              {cardLanguage === 'en' && (
                <>
                  {/* Card Type Toggle */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Card Type</label>
                    <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setNewCardType('word')}
                        className={`px-3 py-1.5 rounded-full transition ${
                          newCardType === 'word' 
                            ? 'bg-white shadow-sm font-semibold text-slate-900' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Single Word
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCardType('phrase')}
                        className={`px-3 py-1.5 rounded-full transition ${
                          newCardType === 'phrase' 
                            ? 'bg-white shadow-sm font-semibold text-slate-900' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Phrase / Sentence
                      </button>
                    </div>
                  </div>

                  {/* English Word */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {newCardType === 'word' ? 'English Word' : 'English Phrase'}
                    </label>
                    <input
                      type="text"
                      placeholder={newCardType === 'word' ? 'e.g. dog, cat, water' : 'e.g. drink water, sit down'}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newFlashcardEnglish}
                      onChange={(e) => setNewFlashcardEnglish(e.target.value)}
                      required
                    />
                  </div>

                  {/* Description / Hint (optional) */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Description / Hint <span className="text-xs text-slate-400">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. a furry pet that barks"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newFlashcardPinyin}
                      onChange={(e) => setNewFlashcardPinyin(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Add a hint or description to help your child remember this word
                    </p>
                  </div>

                  {/* Phrase Group - only for phrases */}
                  {newCardType === 'phrase' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Phrase Group (optional)</label>
                      <input
                        type="text"
                        placeholder="Daily Routine, Actions, Feelings"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newPhraseGroup}
                        onChange={(e) => setNewPhraseGroup(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newFlashcardCategory}
                      onChange={(e) => setNewFlashcardCategory(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
                    >
                      Add {newCardType === 'phrase' ? 'Phrase' : 'Card'}
                    </button>
                  </div>
                </>
              )}

              {/* ===== CHINESE CARD FORM (existing) ===== */}
              {cardLanguage === 'zh' && (
                <>
                  {/* Input Mode Toggle */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Input Language</label>
                    <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => { setInputMode('chinese'); setEnglishInput(''); }}
                        className={`px-3 py-1.5 rounded-full transition ${
                          inputMode === 'chinese' 
                            ? 'bg-white shadow-sm font-semibold text-slate-900' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        🇨🇳 Type in Chinese
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode('english')}
                        className={`px-3 py-1.5 rounded-full transition ${
                          inputMode === 'english' 
                            ? 'bg-white shadow-sm font-semibold text-slate-900' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        🇬🇧 Type in English
                      </button>
                    </div>
                  </div>

                  {/* Card Type Toggle */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Card Type</label>
                    <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setNewCardType('word')}
                        className={`px-3 py-1.5 rounded-full transition ${
                          newCardType === 'word' 
                            ? 'bg-white shadow-sm font-semibold text-slate-900' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Single Word
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCardType('phrase')}
                        className={`px-3 py-1.5 rounded-full transition ${
                          newCardType === 'phrase' 
                            ? 'bg-white shadow-sm font-semibold text-slate-900' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Phrase / Sentence
                      </button>
                    </div>
                  </div>

                  {/* English Input (when in English mode) */}
                  {inputMode === 'english' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Type in English
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={newCardType === 'word' ? 'e.g. dog, cat, water' : 'e.g. drink water, sit down'}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={englishInput}
                          onChange={(e) => handleEnglishInputChange(e.target.value)}
                        />
                        {aiLoading && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 animate-pulse">
                            ✨ Translating...
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        AI will auto-fill the Chinese word, pinyin & meaning below (Singapore Mandarin)
                      </p>
                    </div>
                  )}

                  {/* Main Chinese Text Field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {newCardType === 'word' ? 'Chinese Word' : 'Chinese Phrase'}
                      {inputMode === 'english' && <span className="text-xs text-slate-400 ml-1">(auto-filled)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={newCardType === 'word' ? '狗' : '喝水, 坐下, 我们走走'}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newFlashcardWord}
                        onChange={(e) => handleWordChange(e.target.value)}
                        required
                      />
                      {aiLoading && inputMode === 'chinese' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 animate-pulse">
                          ✨ AI filling...
                        </span>
                      )}
                    </div>
                    {newCardType === 'phrase' && inputMode === 'chinese' && (
                      <p className="text-xs text-slate-500 mt-1">
                        Short toddler phrases like "喝水", "坐下", "我们走走"
                      </p>
                    )}
                  </div>

                  {/* English Meaning */}
                  <div>
                    <label className="block text-sm font-medium mb-1">English Meaning</label>
                    <input
                      type="text"
                      placeholder={newCardType === 'word' ? 'dog' : 'drink water, sit down, let\'s go for a walk'}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newFlashcardEnglish}
                      onChange={(e) => setNewFlashcardEnglish(e.target.value)}
                    />
                  </div>

                  {/* Pinyin */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Pinyin</label>
                    <input
                      type="text"
                      placeholder="Pinyin"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newFlashcardPinyin}
                      onChange={(e) => setNewFlashcardPinyin(e.target.value)}
                    />
                  </div>

                  {/* Phrase Group - only for phrases */}
                  {newCardType === 'phrase' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Phrase Group (optional)</label>
                      <input
                        type="text"
                        placeholder="Daily Routine, Actions, Feelings"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newPhraseGroup}
                        onChange={(e) => setNewPhraseGroup(e.target.value)}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Group related phrases together for easier organization
                      </p>
                    </div>
                  )}

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newFlashcardCategory}
                      onChange={(e) => setNewFlashcardCategory(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
                    >
                      Add {newCardType === 'phrase' ? 'Phrase' : 'Card'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
          
          {/* Flashcards List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-medium mb-3">Flashcards</h3>
            
            {/* Category Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Filter by Category</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            {flashcards.length === 0 ? (
              <p className="text-gray-500">No flashcards yet. Add one above or import from CSV.</p>
            ) : (
              <div className="space-y-2">
                {flashcards
                  .filter(card => !selectedCategoryId || card.categoryId === selectedCategoryId)
                  .map(flashcard => {
                    const category = categories.find(c => c.id === flashcard.categoryId);
                    
                    return (
                      <div key={flashcard.id} className="border rounded-md p-3">
                        {editFlashcardId === flashcard.id ? (
                          <form onSubmit={handleUpdateFlashcard} className="space-y-3">
                            {/* Card Type Toggle */}
                            <div>
                              <label className="block text-sm font-medium mb-2">Card Type</label>
                              <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setEditCardType('word')}
                                  className={`px-3 py-1.5 rounded-full transition ${
                                    editCardType === 'word' 
                                      ? 'bg-white shadow-sm font-semibold text-slate-900' 
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  Single Word
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditCardType('phrase')}
                                  className={`px-3 py-1.5 rounded-full transition ${
                                    editCardType === 'phrase' 
                                      ? 'bg-white shadow-sm font-semibold text-slate-900' 
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  Phrase / Sentence
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">
                                {editCardType === 'word' ? 'Word (Chinese)' : 'Phrase (Chinese)'}
                              </label>
                              <input
                                type="text"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={editFlashcardWord}
                                onChange={(e) => setEditFlashcardWord(e.target.value)}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">English Meaning</label>
                              <input
                                type="text"
                                value={editFlashcardEnglish}
                                onChange={(e) => setEditFlashcardEnglish(e.target.value)}
                                placeholder="English meaning"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Pinyin</label>
                              <input
                                type="text"
                                value={editFlashcardPinyin}
                                onChange={(e) => setEditFlashcardPinyin(e.target.value)}
                                placeholder="Pinyin"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>

                            {/* Phrase Group - only for phrases */}
                            {editCardType === 'phrase' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">Phrase Group (optional)</label>
                                <input
                                  type="text"
                                  placeholder="Daily Routine, Actions, Feelings"
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  value={editPhraseGroup}
                                  onChange={(e) => setEditPhraseGroup(e.target.value)}
                                />
                              </div>
                            )}
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">Category</label>
                              <select
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={editFlashcardCategory}
                                onChange={(e) => setEditFlashcardCategory(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                required
                              >
                                {categories.map(category => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="flex gap-2">
                              <button 
                                type="submit"
                                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
                              >
                                Save
                              </button>
                              <button 
                                type="button"
                                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition"
                                onClick={() => {
                                  setEditFlashcardId(null);
                                  setEditFlashcardWord('');
                                  setEditFlashcardCategory('');
                                  setEditCardType('word');
                                  setEditPhraseGroup('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium">{flashcard.word}</div>
                                {flashcard.card_type === 'phrase' && (
                                  <span className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs font-medium text-purple-700">
                                    Phrase
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-600 space-y-0.5">
                                {flashcard.english && <div>English: {flashcard.english}</div>}
                                {flashcard.pinyin && <div>Pinyin: {flashcard.pinyin}</div>}
                                {flashcard.phrase_group && <div>Group: {flashcard.phrase_group}</div>}
                                <div className="text-xs text-slate-500">
                                  Category: {category ? category.name : 'Unknown'}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEditFlashcard(flashcard)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteFlashcard(flashcard.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Print Flashcards Tab */}
      {activeTab === 'print-flashcards' && (
        <PrintFlashcards />
      )}
    </div>
  );
};

export default FlashcardManager;