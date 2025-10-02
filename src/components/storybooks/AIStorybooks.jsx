// src/components/storybooks/AIStorybooks.js
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFlashcards } from '../../context/FlashcardContext';

const AIStorybooks = () => {
  const { currentUser } = useAuth();
  const { categories, flashcards, sets, getFlashcardsForSet } = useFlashcards();
  
  const [selectedWords, setSelectedWords] = useState([]);
  const [selectedSet, setSelectedSet] = useState('');
  const [theme, setTheme] = useState('adventure');
  const [loading, setLoading] = useState(false);
  const [generatedStory, setGeneratedStory] = useState(null);
  const [error, setError] = useState('');

  // Themes for stories
  const themes = [
    { id: 'adventure', name: 'Adventure', emoji: '🧭' },
    { id: 'fantasy', name: 'Fantasy', emoji: '🦄' },
    { id: 'space', name: 'Space', emoji: '🚀' },
    { id: 'ocean', name: 'Ocean', emoji: '🐠' },
    { id: 'forest', name: 'Forest', emoji: '🌲' },
    { id: 'animals', name: 'Animals', emoji: '🦁' },
    { id: 'dinosaurs', name: 'Dinosaurs', emoji: '🦕' },
    { id: 'vehicles', name: 'Vehicles', emoji: '🚗' },
  ];

  // Handle set selection change
  const handleSetChange = (e) => {
    const setId = e.target.value;
    setSelectedSet(setId);
    
    if (setId) {
      // Reset selected words when changing sets
      setSelectedWords([]);
    }
  };

  // Toggle word selection
  const toggleWordSelection = (flashcardId) => {
    setSelectedWords(prev => {
      if (prev.includes(flashcardId)) {
        return prev.filter(id => id !== flashcardId);
      } else {
        return [...prev, flashcardId];
      }
    });
  };

  // Generate story
  const handleGenerateStory = async () => {
    if (selectedWords.length < 3) {
      setError('Please select at least 3 words for your story');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Get the selected flashcards
      const wordsForStory = selectedWords.map(id => {
        const card = flashcards.find(f => f.id === id);
        return card ? card.word : '';
      }).filter(Boolean);
      
      // In a real app, this would make an API call to your Python backend
      // For now, we'll use a dummy delay and mock response
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock generated story - this would come from your AI backend
      setGeneratedStory({
        title: `The ${theme.charAt(0).toUpperCase() + theme.slice(1)} of ${wordsForStory[0]}`,
        content: `Once upon a time, there was a ${wordsForStory[0]} who loved to go on adventures. 
        One day, the ${wordsForStory[0]} found a ${wordsForStory[1]} in the forest. 
        "What a wonderful ${wordsForStory[1]}!" exclaimed the ${wordsForStory[0]}.
        
        The ${wordsForStory[0]} decided to take the ${wordsForStory[1]} to show ${wordsForStory[2]}. 
        When ${wordsForStory[2]} saw it, they were amazed!
        
        "Let's go on an adventure with the ${wordsForStory[1]}," suggested ${wordsForStory[2]}.
        
        And so, ${wordsForStory[0]} and ${wordsForStory[2]} went on an incredible journey with their ${wordsForStory[1]}.
        ${wordsForStory.length > 3 ? `They also met a ${wordsForStory[3]} along the way!` : ''}
        
        The end.`,
        theme,
        words: wordsForStory,
        createDate: new Date().toISOString(),
        id: `story_${Date.now()}`
      });
      
    } catch (err) {
      setError('Failed to generate story. Please try again.');
      console.error('Story generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Download story as PDF
  const handleDownloadStory = () => {
    // In a real app, this would generate a PDF
    alert('In a production app, this would download a PDF of the story.');
  };

  // Check if user has access based on subscription
  if (currentUser && (currentUser.plan === 'basic' || currentUser.plan === 'premium')) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-green-800 mb-6">AI Storybooks</h1>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
            {error}
          </div>
        )}
        
        {!generatedStory ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Create a new storybook</h2>
            
            {/* Story Theme Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a Theme
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {themes.map(themeOption => (
                  <button
                    key={themeOption.id}
                    type="button"
                    onClick={() => setTheme(themeOption.id)}
                    className={`flex items-center justify-center p-3 rounded-md border ${
                      theme === themeOption.id
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2 text-xl">{themeOption.emoji}</span>
                    <span>{themeOption.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Set Selection */}
            <div className="mb-6">
              <label htmlFor="set-select" className="block text-sm font-medium text-gray-700 mb-2">
                Choose a Flashcard Set
              </label>
              <select
                id="set-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                value={selectedSet}
                onChange={handleSetChange}
              >
                <option value="">Select a flashcard set</option>
                {sets.map(set => (
                  <option key={set.id} value={set.id}>
                    {set.name} ({getFlashcardsForSet(set.id).length} words)
                  </option>
                ))}
              </select>
            </div>
            
            {/* Word Selection */}
            {selectedSet && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Words for Your Story
                  </label>
                  <span className="text-xs text-gray-500">
                    {selectedWords.length} words selected
                  </span>
                </div>
                <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {getFlashcardsForSet(selectedSet).map(flashcard => {
                      const category = categories.find(c => c.id === flashcard.categoryId);
                      return (
                        <button
                          key={flashcard.id}
                          type="button"
                          onClick={() => toggleWordSelection(flashcard.id)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                            selectedWords.includes(flashcard.id)
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-800 border border-gray-300'
                          }`}
                        >
                          {flashcard.word}
                          {category && (
                            <span className="ml-1 text-xs text-gray-500">
                              ({category.name})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Choose at least 3 words to include in your story
                </p>
              </div>
            )}
            
            {/* Generate Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGenerateStory}
                disabled={loading || selectedWords.length < 3}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                  (loading || selectedWords.length < 3) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Story...
                  </>
                ) : (
                  'Generate Story'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{generatedStory.title}</h2>
              <div>
                <button
                  type="button"
                  onClick={handleDownloadStory}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Download PDF
                </button>
              </div>
            </div>
            
            <div className="prose max-w-none mb-6">
              {generatedStory.content.split('\n').map((paragraph, index) => (
                <p key={index} className={index === 0 ? "text-lg" : ""}>
                  {paragraph}
                </p>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Featured Words</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {generatedStory.words.map((word, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setGeneratedStory(null)}
                    className="text-sm font-medium text-green-600 hover:text-green-500"
                  >
                    Create Another Story
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {currentUser.plan === 'basic' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-700 mb-6">
            <h3 className="text-sm font-medium mb-1">Basic Plan Limit</h3>
            <p className="text-sm">
              You can generate up to 5 storybooks per month with your Basic plan.
              You've used 2 of 5 storybooks this month. 
              <a href="/plans" className="ml-1 font-medium text-yellow-800 underline">
                Upgrade to Premium
              </a> for unlimited storybooks.
            </p>
          </div>
        )}
        
        {/* Previous Storybooks */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Your Storybooks</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedStory && (
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium mb-1">{generatedStory.title}</h3>
                <p className="text-sm text-gray-500 mb-2">
                  Created: {new Date(generatedStory.createDate).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {generatedStory.words.slice(0, 3).map((word, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full"
                    >
                      {word}
                    </span>
                  ))}
                  {generatedStory.words.length > 3 && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">
                      +{generatedStory.words.length - 3} more
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <button className="text-sm text-blue-600 hover:text-blue-500">
                    View
                  </button>
                  <button className="text-sm text-green-600 hover:text-green-500">
                    Download
                  </button>
                </div>
              </div>
            )}
            
            {/* Example previous story */}
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-medium mb-1">The Adventure of Dog</h3>
              <p className="text-sm text-gray-500 mb-2">
                Created: {new Date('2025-04-15').toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                  Dog
                </span>
                <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                  Ball
                </span>
                <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                  Park
                </span>
              </div>
              <div className="flex justify-between">
                <button className="text-sm text-blue-600 hover:text-blue-500">
                  View
                </button>
                <button className="text-sm text-green-600 hover:text-green-500">
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // User doesn't have access to this feature
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-green-800 mb-6">AI Storybooks</h1>
        
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Upgrade to Access AI Storybooks</h2>
          <p className="text-gray-600 mb-6">
            Generate custom storybooks featuring your child's learning words with our AI technology.
            Available on Basic and Premium plans.
          </p>
          <a
            href="/plans"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            View Subscription Plans
          </a>
        </div>
      </div>
    );
  }
};

export default AIStorybooks;