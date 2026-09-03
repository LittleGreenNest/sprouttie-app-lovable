// App.js - Main Application File with Lazy Loading for Performance
import React, { Suspense } from 'react';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import './App.css';

// Lazy load toast CSS - not needed for initial render
import('react-toastify/dist/ReactToastify.css');

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

// Supabase
import { supabase } from '@/integrations/supabase/client';

// Lazy-loaded components for better initial load
const PersonaliseFlow = lazyWithRetry(() => import('./components/onboarding/PersonaliseFlow'));
const PDFSuccess = lazyWithRetry(() => import('./pdf-success'));
const UpgradeSuccess = lazyWithRetry(() => import('./components/subscription/UpgradeSuccess'));
const Profile = lazyWithRetry(() => import('./components/user/Profile'));
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'));
const SessionLogTracker = lazyWithRetry(() => import('./components/tracking/SessionLogTracker'));
const FlashcardManager = lazyWithRetry(() => import('./components/FlashcardManager'));
const SpokenWords = lazyWithRetry(() => import('./components/SpokenWords'));

const Plans = lazyWithRetry(() => import('./components/subscription/Plans'));
const PrintFlashcards = lazyWithRetry(() => import('./components/PrintFlashcards'));
const FlashedHistory = lazyWithRetry(() => import('./components/FlashedHistory'));
const FlashingTrackerMockup = lazyWithRetry(() => import('./components/tracking/FlashingTrackerMockup'));
const GardenGuide = lazyWithRetry(() => import('./components/dashboard/GardenGuide'));
const Install = lazyWithRetry(() => import('./pages/Install'));
const Terms = lazyWithRetry(() => import('./pages/Terms'));
const Privacy = lazyWithRetry(() => import('./pages/Privacy'));

const ComingSoonPage = lazyWithRetry(() => import('./components/ui/ComingSoonPage'));
const PronunciationPortal = lazyWithRetry(() => import('./components/pronunciation/PronunciationPortal'));
const WeeklyWordPlanner = lazyWithRetry(() => import('./components/planner/WeeklyWordPlanner'));
const BookRecommendations = lazyWithRetry(() => import('./components/storybooks/BookRecommendations'));
const WordJourney = lazyWithRetry(() => import('./components/tracking/WordJourney'));
const PhotoScanner = lazyWithRetry(() => import('./components/import/PhotoScanner'));
const Support = lazyWithRetry(() => import('@/pages/Support'));


// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sprouttie-green"></div>
  </div>
);


export const fetchUserPlan = async (userEmail) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan')
    .eq('email', userEmail)
    .maybeSingle();

  if (error) {
    console.error('Error fetching plan:', error.message);
    return 'free'; // fallback
  }

  return data?.plan || 'free';
};

// BottomTabBar handles navigation now
import BottomTabBar from './components/layout/BottomTabBar';
const AppContent = () => {
  const { loading, currentUser, profile, profileLoading, refreshProfile } = useAuth();

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sprouttie-green"></div>
      </div>
    );
  }

  // Show onboarding if user hasn't completed it yet
  if (currentUser && profile && !profile.onboarding_completed) {
    return (
      <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <PersonaliseFlow onComplete={() => refreshProfile(currentUser)} />
      </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <div className="App max-w-4xl mx-auto p-4 pb-24 bg-[hsl(var(--background))] min-h-screen font-body">
      {/* Bottom Tab Bar */}
      <BottomTabBar />

      {/* Active Tab Content with Suspense for lazy loading */}
      <ErrorBoundary>
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
            <Route path="/words-said" element={<SpokenWords />} />
            <Route path="/cards" element={<FlashcardManager />} />
            {/* Legacy redirects */}
            <Route path="/words" element={<Navigate to="/words-said" replace />} />
            <Route path="/all-words" element={<Navigate to="/cards" replace />} />
            <Route path="/spoken-words" element={<Navigate to="/words-said" replace />} />
            <Route path="/manage-flashcards" element={<Navigate to="/cards" replace />} />
            <Route path="/tracker-mockup" element={<FlashingTrackerMockup />} />
            <Route path="/garden-guide" element={<GardenGuide />} />
            
            <Route path="/pronunciation" element={<PronunciationPortal />} />
            <Route path="/word-planner" element={<WeeklyWordPlanner />} />
            
            <Route path="/book-recommendations" element={<BookRecommendations />} />
            <Route path="/word-journey" element={<WordJourney />} />
            <Route path="/scan-flashcards" element={<PhotoScanner />} />

            {/* profile page */}
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* fallback for anything else under AppContent */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
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
        <div className="min-h-screen bg-[hsl(var(--background))]">
          <Navbar />
          <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public routes - NO FlashcardProvider needed */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
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
          </ErrorBoundary>
          
          
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
