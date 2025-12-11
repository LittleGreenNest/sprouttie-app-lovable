// App.js - Main Application File
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import PDFSuccess from './pdf-success';
import ProtectedRoute from './components/auth/ProtectedRoute';


// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';

import { FlashcardProvider } from './context/FlashcardContext';

// Layout Components
import Navbar from './components/layout/Navbar';

// Auth Components
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ForgotPassword from './components/auth/ForgotPassword';
import Profile from './components/user/Profile';

// App Components
import Dashboard from './components/Dashboard';
import DailyTracker from './components/DailyTracker';
import DailyTrackerGrid from './components/DailyTrackerGrid';
import DailyTrackerImproved from './components/DailyTrackerImproved';
import FlashcardManager from './components/FlashcardManager';
import ActivityHistory from './components/ActivityHistory';
import AllWords from './components/AllWords';
import SpokenWords from './components/SpokenWords';
import BingoCardGenerator from './components/BingoCardGenerator';
import Plans from './components/subscription/Plans';
import PrintFlashcards from './components/PrintFlashcards';
import PronunciationPortal from './components/pronunciation/PronunciationPortal';
import FlashedHistory from './components/FlashedHistory';
import BookRecommendations from './components/books/BookRecommendations';


// Supabase
import { supabase } from '@/integrations/supabase/client';

export const fetchUserPlan = async (userEmail) => {
  const { data, error } = await supabase
    .from('users')
    .select('plan')
    .eq('email', userEmail)
    .single();

  if (error) {
    console.error('Error fetching plan:', error.message);
    return 'free'; // fallback
  }

  return data?.plan || 'free';
};

// AppContent component to handle tab navigation after authentication
const AppContent = () => {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();
  const location = useLocation();

  // Map paths to tab names
  React.useEffect(() => {
    // Set active tab based on current path
    const path = location.pathname;
    if (path.includes('/dashboard')) setActiveTab('dashboard');
    else if (path.includes('/daily-tracking')) setActiveTab('daily-tracking');
    else if (path.includes('/flashed-history')) setActiveTab('flashed-history');
    else if (path.includes('/all-words')) setActiveTab('all-words');
    else if (path.includes('/spoken-words')) setActiveTab('spoken-words');
    else if (path.includes('/pronunciation')) setActiveTab('pronunciation');
    else if (path.includes('/book-recommendations')) setActiveTab('book-recommendations');
    else if (path.includes('/bingo-generator')) setActiveTab('bingo-generator');
    else if (path.includes('/manage-flashcards')) setActiveTab('manage-flashcards');
    else if (path.includes('/activity-history')) setActiveTab('activity-history');
  }, [location]);

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/${tab}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated

  return (
    <div className="App max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen">
      {/* Header with Sprouttie Mascot - improved spacing */}
      <div className="flex items-center mb-10">
        <img 
          src="/images/sprouttie-mascot.png" 
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
      <div className="flex mb-6 border-b overflow-x-auto">
        <button 
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'daily-tracking' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('daily-tracking')}
        >
          Daily Tracking
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'flashed-history' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('flashed-history')}
        >
          Flashed History
        </button>
        <button
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'all-words' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('all-words')}
        >
          All Words
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'manage-flashcards' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('manage-flashcards')}
        >
          Manage Flashcards
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'spoken-words' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('spoken-words')}
        >
          Words He Says
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'pronunciation' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('pronunciation')}
        >
          🎧 Pronunciation
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'book-recommendations' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('book-recommendations')}
        >
          📚 Books
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'bingo-generator' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('bingo-generator')}
        >
          Bingo Generator
        </button>
        <button 
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'activity-history' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('activity-history')}
        >
          Activity History
        </button>
      </div>
                  {/* Active Tab Content */}
      <Routes>
        {/* Protected routes (must be logged in) */}
        <Route element={<ProtectedRoute />}>
          {/* default when landing on AppContent */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* tab pages */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/daily-tracking" element={<DailyTrackerImproved />} />
          <Route path="/flashed-history" element={<FlashedHistory />} />
          <Route path="/all-words" element={<AllWords />} />
          <Route path="/spoken-words" element={<SpokenWords />} />
          <Route path="/pronunciation" element={<PronunciationPortal />} />
          <Route path="/book-recommendations" element={<BookRecommendations />} />
          <Route path="/bingo-generator" element={<BingoCardGenerator />} />
          <Route path="/manage-flashcards" element={<FlashcardManager />} />
          <Route path="/activity-history" element={<ActivityHistory />} />

          {/* profile page */}
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* fallback for anything else under AppContent */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

    </div>
  );
};

// Main App component
function App() {
  return (
    <Router>
      <AuthProvider>
        <FlashcardProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/pdf-success" element={<PDFSuccess />} />
              
              {/* Protected Print Flashcards route */}
              <Route element={<ProtectedRoute />}>
                <Route path="/print" element={<PrintFlashcards />} />
              </Route>

              
              {/* Protected routes */}
              <Route path="/*" element={<AppContent />} />
            </Routes>
          </div>
        </FlashcardProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;