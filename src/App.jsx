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
import FlashcardManager from './components/FlashcardManager';
import HistoryView from './components/HistoryView';
import Plans from './components/subscription/Plans';

// Supabase
import { supabase } from './supabaseClient';

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
    else if (path.includes('/manage-flashcards')) setActiveTab('manage-flashcards');
    else if (path.includes('/history')) setActiveTab('history');
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
          className={`px-4 py-2 ${activeTab === 'dashboard' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'daily-tracking' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('daily-tracking')}
        >
          Daily Tracking
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'manage-flashcards' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('manage-flashcards')}
        >
          Manage Flashcards
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'history' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('history')}
        >
          History
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
          <Route path="/daily-tracking" element={<DailyTracker />} />
          <Route path="/manage-flashcards" element={<FlashcardManager />} />
          <Route path="/history" element={<HistoryView />} />

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