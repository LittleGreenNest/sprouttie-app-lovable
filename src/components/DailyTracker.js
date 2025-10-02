// components/DailyTracker.js
import React, { useState, useEffect } from 'react';
import { useFlashcards } from '../context/FlashcardContext';

const DailyTracker = () => {
  const { sets, categories, flashcards, getFlashcardsForSet, saveTrackingData, getTrackingData, addFlashcard, deleteFlashcard, updateSetFlashcards } = useFlashcards();
  
  // Current date formatted as YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  
  // State for today's tracking
  const [selectedSets, setSelectedSets] = useState([]);
  const [setUsage, setSetUsage] = useState({});
  const [engagement, setEngagement] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  
  // New state for flashcard management
  const [showFlashcardManager, setShowFlashcardManager] = useState(false);
  const [selectedSetForManage, setSelectedSetForManage] = useState(null);
  const [newFlashcardWord, setNewFlashcardWord] = useState('');
  const [newFlashcardCategory, setNewFlashcardCategory] = useState('');
  
  // Load today's data if it exists
  useEffect(() => {
    const todayData = getTrackingData(today);
    
    if (todayData) {
      // Convert set IDs from strings to numbers if needed
      const setIds = todayData.selectedSets || [];
      setSelectedSets(setIds.map(id => typeof id === 'string' ? parseInt(id) : id));
      
      // Set usage might be stored with string keys, convert to numbers
      const usage = {};
      Object.entries(todayData.setUsage || {}).forEach(([setId, count]) => {
        usage[parseInt(setId)] = count;
      });
      
      setSetUsage(usage);
      setEngagement(todayData.engagement || 0);
      setTimeOfDay(todayData.timeOfDay || '');
      setNotes(todayData.notes || '');
    }
  }, [today, getTrackingData]);
  
  // Toggle a set's selection
  const toggleSet = (setId) => {
    if (selectedSets.includes(setId)) {
      setSelectedSets(selectedSets.filter(id => id !== setId));
      // Also remove from usage if deselected
      const newUsage = { ...setUsage };
      delete newUsage[setId];
      setSetUsage(newUsage);
    } else {
      setSelectedSets([...selectedSets, setId]);
      // Initialize usage count to 0
      setSetUsage({ ...setUsage, [setId]: 0 });
    }
  };
  
  // Increment usage count for a set
  const incrementCount = (setId) => {
    setSetUsage({
      ...setUsage,
      [setId]: (setUsage[setId] || 0) + 1
    });
  };
  
  // Decrement usage count for a set
  const decrementCount = (setId) => {
    if (setUsage[setId] && setUsage[setId] > 0) {
      setSetUsage({
        ...setUsage,
        [setId]: setUsage[setId] - 1
      });
    }
  };
  
  // Save today's data
  const saveData = () => {
    try {
      // Create record for today
      const todayData = {
        date: today,
        selectedSets,
        setUsage,
        engagement,
        timeOfDay,
        notes
      };
      
      // Save the data
      saveTrackingData(todayData);
      
      // Show success message
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error("Error saving data:", error);
      setSaveStatus('Error saving data');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // Get category for a flashcard
  const getCategoryForFlashcard = (flashcardId) => {
    const flashcard = flashcards.find(f => f.id === flashcardId);
    if (!flashcard) return "Unknown";
    
    const category = categories.find(c => c.id === flashcard.categoryId);
    return category ? category.name : "Unknown";
  };

  // Find the oldest flashcard in a set
  const getOldestFlashcard = (setId) => {
    const set = sets.find(s => s.id === setId);
    if (!set || !set.flashcardIds || set.flashcardIds.length === 0) return null;
    
    // In a real app, you might have timestamps or creation dates
    // Here we just use the first card as "oldest"
    return set.flashcardIds[0];
  };

  // Open flashcard manager modal for a specific set
  const openFlashcardManager = (setId) => {
    setSelectedSetForManage(setId);
    setShowFlashcardManager(true);
  };

  // Close flashcard manager modal
  const closeFlashcardManager = () => {
    setSelectedSetForManage(null);
    setShowFlashcardManager(false);
    setNewFlashcardWord('');
    setNewFlashcardCategory('');
  };

  // Add new flashcard to a set
  const handleAddFlashcardToSet = (e) => {
    e.preventDefault();
    
    if (!newFlashcardWord || !newFlashcardCategory || !selectedSetForManage) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      // First create the flashcard
      const newCard = addFlashcard(newFlashcardWord, newFlashcardCategory);
      
      // Then add it to the set
      const set = sets.find(s => s.id === selectedSetForManage);
      if (set) {
        const updatedIds = [...set.flashcardIds, newCard.id];
        updateSetFlashcards(selectedSetForManage, updatedIds);
      }
      
      // Clear the form
      setNewFlashcardWord('');
      
      // Show success message
      alert('Flashcard added successfully to the set!');
    } catch (error) {
      console.error("Error adding flashcard:", error);
      alert('Error adding flashcard');
    }
  };

  // Remove flashcard from a set
  const removeFlashcardFromSet = (setId, flashcardId) => {
    try {
      const set = sets.find(s => s.id === setId);
      if (!set) return;
      
      const updatedIds = set.flashcardIds.filter(id => id !== flashcardId);
      updateSetFlashcards(setId, updatedIds);
      
      // Show success message
      alert('Flashcard removed from set!');
    } catch (error) {
      console.error("Error removing flashcard:", error);
      alert('Error removing flashcard');
    }
  };
  
  return (
    <div>
      {/* Set Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="font-medium mb-3">Select sets for today:</h3>
        <div className="flex flex-wrap gap-2">
          {sets.map((set) => (
            <button
              key={set.id}
              onClick={() => toggleSet(set.id)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedSets.includes(set.id)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {set.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tracking Selected Sets */}
      {selectedSets.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-medium mb-3">Track flashes:</h3>
          <div className="space-y-4">
            {sets
              .filter((set) => selectedSets.includes(set.id))
              .map((set) => {
                const flashcards = getFlashcardsForSet(set.id);
                const oldestFlashcardId = getOldestFlashcard(set.id);
                
                return (
                  <div key={set.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{set.name}</h4>
                      <div className="flex items-center">
                        <div className="text-gray-500 text-sm mr-4">{flashcards.length} words</div>
                        <button
                          onClick={() => openFlashcardManager(set.id)}
                          className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Manage Words
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      {flashcards.map((card, index) => (
                        <span key={card.id} className={`${oldestFlashcardId === card.id ? 'text-yellow-600 font-medium' : ''} ${index !== 0 ? 'ml-1' : ''}`}>
                          {card.word} 
                          <span className="text-xs text-gray-400">({getCategoryForFlashcard(card.id)})</span>
                          {oldestFlashcardId === card.id && <span className="text-xs text-yellow-600 ml-1">(oldest)</span>}
                          {index < flashcards.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => decrementCount(set.id)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
                      >
                        -
                      </button>
                      
                      <span className="mx-3 text-xl font-medium">
                        {setUsage[set.id] || 0}
                      </span>
                      
                      <button
                        onClick={() => incrementCount(set.id)}
                        className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      
      {/* Engagement Tracking */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="font-medium mb-3">Track Child's Engagement</h3>
        
        {/* Engagement Rating */}
        <div className="mb-4">
          <div className="text-sm mb-2">How engaged was your child today?</div>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setEngagement(rating)}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  rating <= engagement
                    ? 'bg-yellow-400 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {rating <= 2 ? '😐' : rating <= 4 ? '😊' : '😃'}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            1 = Minimal Interest • 5 = Highly Engaged
          </div>
        </div>
        
        {/* Time of Day */}
        <div className="mb-4">
          <div className="text-sm mb-2">When was your child most engaged?</div>
          <div className="flex flex-wrap gap-2">
            {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
              <button
                key={time}
                onClick={() => setTimeOfDay(time)}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeOfDay === time
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {time} {time === 'Morning' ? '🌅' : time === 'Afternoon' ? '☀️' : time === 'Evening' ? '🌆' : '🌙'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Notes */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2" htmlFor="notes">
            Notes for Today
          </label>
          <textarea
            id="notes"
            rows="3"
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Record observations, words recognized, special moments..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      
      {/* Save Button */}
      <div className="mt-4 flex justify-end">
        {saveStatus && (
          <div className={`mr-4 py-2 px-4 rounded ${
            saveStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {saveStatus}
          </div>
        )}
        <button
          onClick={saveData}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          Save Today's Records
        </button>
      </div>

      {/* Flashcard Manager Modal */}
      {showFlashcardManager && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Manage Flashcards for {sets.find(s => s.id === selectedSetForManage)?.name}
                    </h3>
                    
                    {/* Current Flashcards in Set */}
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Current Flashcards:</h4>
                      <div className="border rounded-md p-3 mb-4">
                        {getFlashcardsForSet(selectedSetForManage).map((card) => (
                          <div key={card.id} className="flex justify-between items-center py-1 border-b last:border-b-0">
                            <div>
                              <span className="font-medium">{card.word}</span>
                              <span className="text-xs text-gray-500 ml-2">({getCategoryForFlashcard(card.id)})</span>
                              {getOldestFlashcard(selectedSetForManage) === card.id && 
                                <span className="text-xs text-yellow-600 ml-1">(oldest)</span>
                              }
                            </div>
                            <button 
                              onClick={() => removeFlashcardFromSet(selectedSetForManage, card.id)}
                              className="text-red-500 text-xs hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Add New Flashcard Form */}
                    <form onSubmit={handleAddFlashcardToSet} className="mt-4">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Add New Flashcard:</h4>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new-word">
                          Word
                        </label>
                        <input
                          type="text"
                          id="new-word"
                          className="w-full border rounded-md px-3 py-2 text-sm"
                          value={newFlashcardWord}
                          onChange={(e) => setNewFlashcardWord(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new-category">
                          Category
                        </label>
                        <select
                          id="new-category"
                          className="w-full border rounded-md px-3 py-2 text-sm"
                          value={newFlashcardCategory}
                          onChange={(e) => setNewFlashcardCategory(e.target.value)}
                          required
                        >
                          <option value="">Select a category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex justify-end space-x-3 mt-4">
                        <button
                          type="button"
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          onClick={closeFlashcardManager}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Add Flashcard
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTracker;