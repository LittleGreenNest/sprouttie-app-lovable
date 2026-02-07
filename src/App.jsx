// App.js - Main Application File with Lazy Loading for Performance
import React, { useState, Suspense, lazy, useRef, useEffect as useReactEffect } from 'react';
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
const UpgradeSuccess = lazy(() => import('./components/subscription/UpgradeSuccess'));
const Profile = lazy(() => import('./components/user/Profile'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const SessionLogTracker = lazy(() => import('./components/tracking/SessionLogTracker'));
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
const BookRecommendations = lazy(() => import('./components/storybooks/BookRecommendations'));
const Support = lazy(() => import('@/pages/Support'));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
  </div>
);

// Navigation tab configuration
const PRIMARY_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'daily-tracking', label: 'Session Log' },
  { id: 'manage-flashcards', label: 'Flashcards' },
  { id: 'book-recommendations', label: '📚 Books' },
];

const MORE_TABS = [
  { id: 'flashed-history', label: 'Flashed History' },
  { id: 'all-words', label: 'All Words' },
  { id: 'spoken-words', label: 'Words He Says' },
  { id: 'pronunciation', label: '🎧 Pronunciation' },
  { id: 'word-planner', label: '📅 Word Planner' },
];

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

// Navigation Tabs Component with "More" dropdown
const NavigationTabs = ({ activeTab, onTabChange }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useReactEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMoreTabActive = MORE_TABS.some(tab => tab.id === activeTab);
  const activeMoreLabel = MORE_TABS.find(tab => tab.id === activeTab)?.label;

  return (
    <div className="flex mb-6 border-b items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent -mx-4 px-4 sm:mx-0 sm:px-0">
      {/* Primary tabs */}
      {PRIMARY_TABS.map(tab => (
        <button
          key={tab.id}
          className={`px-3 sm:px-4 py-2 whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${
            activeTab === tab.id 
              ? 'bg-green-100 border-b-2 border-green-500 font-medium' 
              : 'hover:bg-gray-100'
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}

      {/* More dropdown - flex-shrink-0 prevents it from shrinking */}
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          className={`px-3 sm:px-4 py-2 whitespace-nowrap text-sm sm:text-base flex items-center gap-1 ${
            isMoreTabActive 
              ? 'bg-green-100 border-b-2 border-green-500 font-medium' 
              : 'hover:bg-gray-100'
          }`}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          {isMoreTabActive ? activeMoreLabel : 'More'}
          <svg 
            className={`w-3 h-3 transition-transform ${moreOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {moreOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {MORE_TABS.map(tab => (
              <button
                key={tab.id}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  activeTab === tab.id ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'
                }`}
                onClick={() => {
                  onTabChange(tab.id);
                  setMoreOpen(false);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
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
      {/* Header with Sprouttie Mascot - responsive spacing */}
      <div className="flex items-center mb-6 sm:mb-10">
        <img 
          src="/images/sprouttie-mascot.png" 
          alt="Sprouttie Mascot" 
          className="h-16 sm:h-24 mr-3 sm:mr-6"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-green-800 mb-1 sm:mb-2">Sprouttie</h1>
          <h2 className="text-base sm:text-xl text-green-700">Sprouttie Flashcard System</h2>
        </div>
      </div>
      
      {/* Navigation Tabs - with dropdown for secondary tabs */}
      <NavigationTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Active Tab Content with Suspense for lazy loading */}
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Protected routes (must be logged in) */}
          <Route element={<ProtectedRoute />}>
            {/* default when landing on AppContent */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* tab pages */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/daily-tracking" element={<SessionLogTracker />} />
            <Route path="/flashed-history" element={<FlashedHistory />} />
            <Route path="/all-words" element={<AllWords />} />
            <Route path="/spoken-words" element={<SpokenWords />} />
            <Route path="/manage-flashcards" element={<FlashcardManager />} />
            <Route path="/tracker-mockup" element={<FlashingTrackerMockup />} />
            <Route path="/garden-guide" element={<GardenGuide />} />
            
            <Route path="/pronunciation" element={<PronunciationPortal />} />
            <Route path="/word-planner" element={<WeeklyWordPlanner />} />
            <Route path="/book-recommendations" element={<BookRecommendations />} />

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

// Wrapper that adds FlashcardProvider only for authenticated routes
const AuthenticatedApp = () => {
  return (
    <FlashcardProvider>
      <AppContent />
    </FlashcardProvider>
  );
};

// Protected wrapper for print route
const ProtectedPrint = () => {
  return (
    <FlashcardProvider>
      <PrintFlashcards />
    </FlashcardProvider>
  );
};

// Main App component
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public routes - NO FlashcardProvider needed */}
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
              <Route path="/upgrade-success" element={<UpgradeSuccess />} />
              <Route path="/install" element={<Install />} />
              
              {/* Protected Print Flashcards route - with FlashcardProvider */}
              <Route element={<ProtectedRoute />}>
                <Route path="/print" element={<ProtectedPrint />} />
              </Route>

              {/* Protected routes - FlashcardProvider wraps AppContent */}
              <Route path="/*" element={<AuthenticatedApp />} />
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
      </AuthProvider>
    </Router>
  );
}

export default App;
