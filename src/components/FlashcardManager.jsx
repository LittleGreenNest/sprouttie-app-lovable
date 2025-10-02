// components/FlashcardManager.js
import React, { useState } from 'react';
import { useFlashcards } from '../context/FlashcardContext';
import CSVImport from './CSVImport';
import PrintFlashcards from './PrintFlashcards';

const FlashcardManager = () => {
  const { 
    categories, 
    flashcards, 
    addCategory,
    updateCategory,
    deleteCategory,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard
  } = useFlashcards();
  
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
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editFlashcardId, setEditFlashcardId] = useState(null);
  const [editFlashcardWord, setEditFlashcardWord] = useState('');
  const [editFlashcardCategory, setEditFlashcardCategory] = useState('');
const [editFlashcardEnglish, setEditFlashcardEnglish] = useState('');
const [editFlashcardPinyin, setEditFlashcardPinyin] = useState('');

  
  // Message state
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Show message function
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };
  
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
        alert('No flashcards to export.');
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
      alert('There was an error exporting the flashcards. Please try again.');
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
    const result = deleteCategory(categoryId);
    
    if (result.success) {
      showMessage('Category deleted successfully');
    } else {
      showMessage(result.message, 'error');
    }
  };
  
  // Handlers for Flashcards
  const handleAddFlashcard = (e) => {
    e.preventDefault();
    if (!newFlashcardWord.trim() || !newFlashcardCategory) return;
    
    addFlashcard(newFlashcardWord, newFlashcardCategory, newFlashcardEnglish, newFlashcardPinyin);
    setNewFlashcardWord('');
setNewFlashcardEnglish('');
setNewFlashcardPinyin('');

    showMessage('Flashcard added successfully');
  };
  
 const handleEditFlashcard = (flashcard) => {
  setEditFlashcardId(flashcard.id);
  setEditFlashcardWord(flashcard.word);
  setEditFlashcardCategory(flashcard.categoryId);
  setEditFlashcardEnglish(flashcard.english || '');
  setEditFlashcardPinyin(flashcard.pinyin || '');
};
  
  const handleUpdateFlashcard = (e) => {
    e.preventDefault();
    if (!editFlashcardWord.trim() || !editFlashcardCategory || !editFlashcardId) return;
    
   updateFlashcard(editFlashcardId, {
  word: editFlashcardWord,
  english: editFlashcardEnglish,
  pinyin: editFlashcardPinyin,
  categoryId: editFlashcardCategory
});

    
    setEditFlashcardId(null);
    setEditFlashcardWord('');
    setEditFlashcardCategory('');
    showMessage('Flashcard updated successfully');
  };
  
  const handleDeleteFlashcard = (flashcardId) => {
    deleteFlashcard(flashcardId);
    showMessage('Flashcard deleted successfully');
  };
  
  return (
    <div>
      {/* CSV Import Modal */}
      {showCSVImport && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <CSVImport onClose={toggleCSVImport} />
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Buttons */}
      <div className="flex justify-end mb-4 space-x-3">
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
      
      {/* Notification Message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded ${
          message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex mb-6 border-b">
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
        <button 
          className={`px-4 py-2 ${activeTab === 'print-flashcards' ? 'bg-blue-100 border-b-2 border-blue-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => setActiveTab('print-flashcards')}
        >
          Print Flashcards
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
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-medium mb-3">Add New Flashcard</h3>
            <form onSubmit={handleAddFlashcard} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
  Flashcard Word <span className="text-gray-500 text-xs">(input any English or Chinese word of your choice)</span>
</label>

                <input
                  type="text"
                  placeholder="Flashcard word"
                  className="w-full border rounded-md px-3 py-2"
                  value={newFlashcardWord}
                  onChange={(e) => setNewFlashcardWord(e.target.value)}
                  required
                />
              </div>
              <div>
<label className="block text-sm font-medium mb-1">
  English <span className="text-gray-500 text-xs">(for the back of the card, use with Chinese words)</span>
</label>  <input
    type="text"
    placeholder="English word"
    className="w-full border rounded-md px-3 py-2"
    value={newFlashcardEnglish}
    onChange={(e) => setNewFlashcardEnglish(e.target.value)}
  />
</div>

<div>
<label className="block text-sm font-medium mb-1">
  Pinyin <span className="text-gray-500 text-xs">(for the back of the card, use with Chinese words)</span>
</label>
  <input
    type="text"
    placeholder="Pinyin"
    className="w-full border rounded-md px-3 py-2"
    value={newFlashcardPinyin}
    onChange={(e) => setNewFlashcardPinyin(e.target.value)}
  />
</div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={newFlashcardCategory}
                  onChange={(e) => setNewFlashcardCategory(e.target.value)}
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
              
              <button 
                type="submit"
                className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600"
>
                Add Flashcard
              </button>
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
                          <form onSubmit={handleUpdateFlashcard} className="space-y-2">
                            <div>
                              <label className="block text-sm font-medium mb-1">Word</label>
                              <input
                                type="text"
                                className="w-full border rounded-md px-3 py-1"
                                value={editFlashcardWord}
                                onChange={(e) => setEditFlashcardWord(e.target.value)}
                                required
                              />
{/* English field for back of CN cards */}
<label className="block text-sm font-medium mb-1 mt-4">
  English <span className="text-gray-500 text-xs">(for the back of the card, use with Chinese words)</span>
</label>
<input
  type="text"
  value={editFlashcardEnglish}
  onChange={(e) => setEditFlashcardEnglish(e.target.value)}
  placeholder="English meaning"
  className="w-full border rounded-md px-3 py-2"
/>

{/* Pinyin field for back of CN cards */}
<label className="block text-sm font-medium mb-1 mt-4">
  Pinyin <span className="text-gray-500 text-xs">(for the back of the card, use with Chinese words)</span>
</label>
<input
  type="text"
  value={editFlashcardPinyin}
  onChange={(e) => setEditFlashcardPinyin(e.target.value)}
  placeholder="Pinyin"
  className="w-full border rounded-md px-3 py-2"
/>


                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">Category</label>
                              <select
                                className="w-full border rounded-md px-3 py-1"
                                value={editFlashcardCategory}
                                onChange={(e) => setEditFlashcardCategory(e.target.value)}
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
                                className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                              >
                                Save
                              </button>
                              <button 
                                type="button"
                                className="bg-gray-200 px-3 py-1 rounded-md hover:bg-gray-300"
                                onClick={() => {
                                  setEditFlashcardId(null);
                                  setEditFlashcardWord('');
                                  setEditFlashcardCategory('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{flashcard.word}</div>
                              <div className="text-xs text-gray-500">
                                Category: {category ? category.name : 'Unknown'}
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