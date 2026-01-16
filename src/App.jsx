// App.js - Main Application File with Lazy Loading for Performance
import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { FlashcardProvider } from './context/FlashcardContext';

// Layout Components
import Navbar from './components/layout/Navbar';

// Auth Components
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';

// PWA Components
import InstallPrompt from './components/pwa/InstallPrompt';

// Supabase
import { supabase } from '@/integrations/supabase/client';

// Lazy-loaded components for better initial load
const PDFSuccess = lazy(() => import('./pdf-success'));
const Profile = lazy(() => import('./components/user/Profile'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const DailyTrackerImproved = lazy(() => import('./components/DailyTrackerImproved'));
const FlashcardManager = lazy(() => import('./components/FlashcardManager'));
const AllWords = lazy(() => import('./components/AllWords'));
const SpokenWords = lazy(() => import('./components/SpokenWords'));
const Plans = lazy(() => import('./components/subscription/Plans'));
const PrintFlashcards = lazy(() => import('./components/PrintFlashcards'));
const FlashedHistory = lazy(() => import('./components/FlashedHistory'));
const FlashingTrackerMockup = lazy(() => import('./components/tracking/FlashingTrackerMockup'));
const GardenGuide = lazy(() => import('./components/dashboard/GardenGuide'));
const Install = lazy(() => import('./pages/Install'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

const ComingSoonPage = lazy(() => import('./components/ui/ComingSoonPage'));
const PronunciationPortal = lazy(() => import('./components/pronunciation/PronunciationPortal'));
const WeeklyWordPlanner = lazy(() => import('./components/planner/WeeklyWordPlanner'));
const Support = lazy(() => import('@/pages/Support'));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
  </div>
);

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
    else if (path.includes('/word-planner')) setActiveTab('word-planner');
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

  return (
    <div className="App max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen">
      {/* Header with Sprouttie Mascot - improved spacing */}
      <div className="flex items-center mb-10">
        <img 
          src="/images/sprouttie-mascot.png" 
          alt="Sprouttie Mascot" 
          className="h-24 mr-6"
          loading="lazy"
          onError={(e) => {
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
          Session Log
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
          className={`px-4 py-2 whitespace-nowrap ${activeTab === 'word-planner' ? 'bg-green-100 border-b-2 border-green-500 font-medium' : 'hover:bg-gray-100'}`}
          onClick={() => handleTabChange('word-planner')}
        >
          📅 Word Planner
        </button>
        {/* Hidden tabs: Books, Bingo Generator, Activity History */}
      </div>

      {/* Active Tab Content with Suspense for lazy loading */}
      <Suspense fallback={<LoadingSpinner />}>
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
            <Route path="/manage-flashcards" element={<FlashcardManager />} />
            <Route path="/tracker-mockup" element={<FlashingTrackerMockup />} />
            <Route path="/garden-guide" element={<GardenGuide />} />
            
            <Route path="/pronunciation" element={<PronunciationPortal />} />
            <Route path="/word-planner" element={<WeeklyWordPlanner />} />

            {/* profile page */}
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* fallback for anything else under AppContent */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
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
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/support" element={<Support />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/pdf-success" element={<PDFSuccess />} />
                <Route path="/install" element={<Install />} />
                
                {/* Protected Print Flashcards route */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/print" element={<PrintFlashcards />} />
                </Route>

                {/* Protected routes */}
                <Route path="/*" element={<AppContent />} />
              </Routes>
            </Suspense>
            
            {/* PWA Install Prompt */}
            <InstallPrompt />
            
            {/* Toast Container for notifications */}
            <ToastContainer 
              position="top-center" 
              autoClose={3000} 
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
        </FlashcardProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
