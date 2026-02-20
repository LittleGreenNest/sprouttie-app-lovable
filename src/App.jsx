// App.js - Main Application File with Lazy Loading for Performance
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Landing Page
import LandingPage from './pages/LandingPage';

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
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sprouttie-green"></div>
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

// BottomTabBar handles navigation now
import BottomTabBar from './components/layout/BottomTabBar';
const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sprouttie-green"></div>
      </div>
    );
  }

  return (
    <div className="App max-w-4xl mx-auto p-4 pb-24 bg-[hsl(var(--background))] min-h-screen font-body">
      {/* Bottom Tab Bar */}
      <BottomTabBar />

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
        <div className="min-h-screen bg-[hsl(var(--background))]">
          <Navbar />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public routes - NO FlashcardProvider needed */}
              <Route path="/" element={<LandingPage />} />
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
