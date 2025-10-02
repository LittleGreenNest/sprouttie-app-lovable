// App.js - Main Application File
import React, { useState, useEffect } from 'react';
import './App.css';
import DailyTracker from './components/DailyTracker';
import FlashcardManager from './components/FlashcardManager';
import HistoryView from './components/HistoryView';
import { FlashcardProvider } from './context/FlashcardContext';

function App() {
  const [activeTab, setActiveTab] = useState('daily-tracking');

  return (
    <FlashcardProvider>
      <div className="App max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen">
        {/* Header with Sprouttie Mascot - improved spacing */}
        <div className="flex items-center mb-10">
          <img 
            src="/sprouttie-mascot.png" 
            alt="Sprouttie Mascot" 
            className="h-24 mr-6"
            onError={(e) => {
              // Fallback in case the image doesn't load
              e.target.style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-3xl font-bold text-green-800 mb-2">Sprouttie</h1>
            <h2 className="text-xl text-green-700">Sprouttie Flashcard System</h2>
          </div>
        </div>
        
        {/* Navigation Tabs - with proper spacing from header */}
        <div className="flex mb-6 border-b">
          <button 
            className={`px-4 py-2 ${activeTab === 'daily-tracking' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveTab('daily-tracking')}
          >
            Daily Tracking
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'manage-flashcards' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveTab('manage-flashcards')}
          >
            Manage Flashcards
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'history' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
        
        {/* Active Tab Content */}
        {activeTab === 'daily-tracking' && <DailyTracker />}
        {activeTab === 'manage-flashcards' && <FlashcardManager />}
        {activeTab === 'history' && <HistoryView />}
      </div>
    </FlashcardProvider>
  );
}

export default App;