import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFlashcards } from '../context/FlashcardContext';
import { useAuth } from '../hooks/useAuth';
import ProgressHero from './dashboard/ProgressHero';
import MetricsRow from './dashboard/MetricsRow';
import TipsCarousel from './dashboard/TipsCarousel';
import ProgressGarden from './dashboard/ProgressGarden';
import CelebrationModal from './dashboard/CelebrationModal';
import MilestoneModal from './gamification/MilestoneModal';
import FlashedWordsGrid from './tracking/FlashedWordsGrid';
import CSVImport from './CSVImport';
import { checkForNewMilestone } from '../utils/milestones';
import { getEncouragement } from '../utils/encouragements';
import { useAccessibility, useSkipLinks } from '../hooks/useAccessibility';

const Dashboard = () => {
  const { 
    flashcards = [], 
    history = [],
    getFlashcardStats = () => ({})
  } = useFlashcards() || {};
  
  const { currentUser } = useAuth() || {};
  const navigate = useNavigate();
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationWords, setCelebrationWords] = useState(0);
  const [showMilestone, setShowMilestone] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState(null);
  const [achievedMilestones, setAchievedMilestones] = useState([]);
  const [encouragement, setEncouragement] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  
  const [stats, setStats] = useState({
    totalFlashcards: 0,
    avgEngagement: 0,
    totalSessions: 0,
    currentStreak: 0,
    learnedWords: 0,
    topCategories: [],
    bestTime: '',
    todayFlashes: 0,
    weekData: []
  });

  // Accessibility hooks
  const { announce } = useAccessibility();
  useSkipLinks();
  
  // Calculate statistics
  useEffect(() => {
    const calculateStats = () => {
      const today = new Date().toDateString();
      const todayHistory = history.filter(h => new Date(h.date).toDateString() === today);
      
      // Calculate streak
      const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
      let streak = 0;
      const now = new Date();
      for (let i = 0; i < sortedHistory.length; i++) {
        const dayDiff = Math.floor((now - new Date(sortedHistory[i].date)) / (1000 * 60 * 60 * 24));
        if (dayDiff === i) streak++;
        else break;
      }
      
      // Calculate avg engagement
      const avgEngagement = history.length > 0
        ? history.reduce((sum, h) => sum + (h.engagement || 0), 0) / history.length
        : 0;
      
      // Get learned words (flashcards shown 5+ times)
      const flashcardStats = getFlashcardStats();
      const learnedWords = Object.values(flashcardStats).filter(count => count >= 5).length;
      
      // Get best time of day
      const timeCount = {};
      history.forEach(h => {
        if (h.timeOfDay) {
          timeCount[h.timeOfDay] = (timeCount[h.timeOfDay] || 0) + 1;
        }
      });
      const bestTime = Object.keys(timeCount).length > 0
        ? Object.entries(timeCount).sort((a, b) => b[1] - a[1])[0][0]
        : '';
      
      // Get top categories (simplified - using folder field)
      const categoryCount = {};
      flashcards.forEach(f => {
        const cat = f.folder || 'default';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
      
      // Week data for chart (last 7 days)
      const weekData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayHistory = history.filter(h => 
          new Date(h.date).toDateString() === date.toDateString()
        );
        weekData.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          engagement: dayHistory.length > 0 
            ? dayHistory.reduce((sum, h) => sum + (h.engagement || 0), 0) / dayHistory.length 
            : 0
        });
      }
      
      // Today's flashes
      const todayFlashes = todayHistory.reduce((sum, h) => {
        return sum + Object.values(h.setUsage || {}).reduce((s, c) => s + c, 0);
      }, 0);
      
      setStats({
        totalFlashcards: flashcards.length,
        avgEngagement,
        totalSessions: history.length,
        currentStreak: streak,
        learnedWords,
        topCategories,
        bestTime,
        todayFlashes,
        weekData
      });
    };
    
    calculateStats();
  }, [flashcards, history, getFlashcardStats]);

  // Load achieved milestones from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('achievedMilestones');
    if (saved) {
      setAchievedMilestones(JSON.parse(saved));
    }
  }, []);

  // Check for milestones and generate encouragement
  useEffect(() => {
    if (stats.totalFlashcards > 0) {
      // Check for new milestone
      const newMilestone = checkForNewMilestone(stats, achievedMilestones);
      if (newMilestone) {
        setCurrentMilestone(newMilestone);
        setShowMilestone(true);
        
        // Save milestone achievement
        const updated = [...achievedMilestones, newMilestone.id];
        setAchievedMilestones(updated);
        localStorage.setItem('achievedMilestones', JSON.stringify(updated));
        
        // Announce to screen readers
        announce(`Milestone achieved: ${newMilestone.title}`, 'assertive');
      }

      // Generate encouragement message
      setEncouragement(getEncouragement(stats));
    }
  }, [stats, achievedMilestones, announce]);
  
  // Get user's first name
  const firstName = currentUser?.user_metadata?.name?.split(' ')[0] || 'Friend';
  
  // Progress percentage for circular progress
  const progressPercent = flashcards.length > 0 
    ? Math.min(100, Math.round((stats.learnedWords / flashcards.length) * 100))
    : 0;
  
  // Category emojis
  const categoryEmojis = {
    'animals': '🐻',
    'vehicles': '🚗',
    'home': '🏠',
    'food': '🍎',
    'colors': '🎨',
    'default': '📚'
  };
  
  // Time of day emojis
  const timeEmojis = {
    'Morning': '🌅',
    'Afternoon': '☀️',
    'Evening': '🌆',
    'Night': '🌙'
  };

  // Simulate celebration (you can trigger this from actual session completion)
  const triggerCelebration = (wordsCount) => {
    setCelebrationWords(wordsCount);
    setShowCelebration(true);
  };

  const downloadExampleCSV = () => {
    const exampleData = `english,pinyin,hanzi,folder
apple,píng guǒ,苹果,Food
cat,māo,猫,Animals
red,hóng sè,红色,Colors
mother,mā ma,妈妈,Family
one,yī,一,Numbers`;
    
    const blob = new Blob([exampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sprouttie-flashcards-example.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };
  
  return (
    <div className="min-h-screen pb-20" id="main-content">
      {/* Celebration Modal */}
      <CelebrationModal 
        show={showCelebration} 
        onClose={() => setShowCelebration(false)}
        wordsFlashed={celebrationWords}
      />

      {/* Milestone Modal */}
      <MilestoneModal 
        show={showMilestone}
        onClose={() => setShowMilestone(false)}
        milestone={currentMilestone}
      />

      {/* CSV Import Modal */}
      {showCSVImport && (
        <CSVImport onClose={() => setShowCSVImport(false)} />
      )}

      {/* Simple Page Header matching All Words */}
      <h1 className="text-2xl font-semibold mb-4 text-slate-900">Dashboard</h1>

      {/* Hero Row - Stats + Sprouttie Mascot */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)] gap-4 mb-6">
        {/* Core stats card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Overview</p>
              <p className="text-sm text-slate-900 font-semibold">How things look today</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/daily-tracking')}
                className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
              >
                Start session
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/manage-flashcards')}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium bg-white hover:bg-slate-50 transition-colors"
              >
                Add flashcards
              </motion.button>
            </div>
          </div>

          {/* 3 stats in a row */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <p className="text-xs text-slate-500">Words learned</p>
              <p className="text-lg font-semibold text-slate-900">
                {stats.learnedWords}/{stats.totalFlashcards}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <p className="text-xs text-slate-500">Current streak</p>
              <p className="text-lg font-semibold text-slate-900">
                {stats.currentStreak} days
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <p className="text-xs text-slate-500">Sessions</p>
              <p className="text-lg font-semibold text-slate-900">
                {stats.totalSessions}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Sprouttie mascot card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col items-center justify-center text-center"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0], y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="mb-2"
          >
            <img 
              src="/images/sprouttie-mascot.png" 
              alt="Sprouttie mascot" 
              className="w-20 h-20 object-contain"
            />
          </motion.div>
          <p className="text-sm font-semibold text-slate-900">Hi, I'm Sprouttie 🌱</p>
          <p className="text-xs text-slate-500 mt-1">
            Short, frequent sessions keep things fun. Aim for 2–3 mini sessions today.
          </p>
        </motion.div>
      </div>
      
      {/* Middle Row - Today & Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Today's practice plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5"
        >
          <p className="text-xs text-slate-500 uppercase tracking-wide">Today</p>
          <p className="text-sm font-semibold text-slate-900 mb-2">
            Today's practice plan
          </p>
          <p className="text-sm text-slate-600 mb-3">
            {stats.todayFlashes > 0 
              ? `You've flashed ${stats.todayFlashes} cards today — amazing consistency!`
              : `Start your first session today and watch your progress grow!`
            }
          </p>

          <ul className="text-xs text-slate-600 space-y-1">
            <li>• {stats.todayFlashes > 0 ? 'Keep going with' : 'Start with'} 2-3 mini sessions</li>
            <li>• Review {Math.min(stats.learnedWords, 10)} previously learned words</li>
            <li>• Add 3-5 new words if you have time</li>
          </ul>
        </motion.div>

        {/* Week snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5"
        >
          <p className="text-xs text-slate-500 uppercase tracking-wide">This week</p>
          <p className="text-sm font-semibold text-slate-900 mb-2">
            Weekly snapshot
          </p>

          {/* Weekly chart - compact */}
          <div className="mb-3">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={stats.weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 5]} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="engagement" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {stats.bestTime && (
              <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1">
                Best time: <span className="ml-1 font-semibold text-slate-800">{stats.bestTime}</span>
              </span>
            )}
            {stats.topCategories[0] && (
              <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1">
                Top category: <span className="ml-1 font-semibold text-slate-800 capitalize">{stats.topCategories[0].name}</span>
              </span>
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Progress Garden - flat style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 mb-6"
      >
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Your Progress</p>
        <p className="text-sm font-semibold text-slate-900 mb-3">Learning journey</p>
        
        <ProgressGarden stats={stats} />
      </motion.div>

      {/* Flashed Words Progress Grid */}
      <div className="mb-6">
        <FlashedWordsGrid />
      </div>
      
      {/* Create & Upload Flashcards - flat style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 mb-6"
      >
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Flashcard Tools</p>
        <p className="text-sm font-semibold text-slate-900 mb-2">Create & Upload</p>
        <p className="text-xs text-slate-500 mb-4">
          💡 Tip: Upload ~20 new words weekly to keep learning fresh
        </p>
        
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCSVImport(true)}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            💾 Bulk Upload CSV
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadExampleCSV}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium bg-white hover:bg-slate-50 transition-colors"
          >
            📄 Download Example
          </motion.button>
          
          <button
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-400 text-sm font-medium bg-slate-50 cursor-not-allowed"
            disabled
          >
            🪴 AI Generate (Soon)
          </button>
        </div>
      </motion.div>
      
      {/* Encouragement Bar - flat style */}
      {encouragement && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">{encouragement.icon}</span>
              <p className="text-slate-700 text-sm font-medium">{encouragement.message}</p>
            </div>
            <button 
              onClick={() => setShowMilestone(true)}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg px-2 py-1 transition-colors"
              aria-label="View milestones and achievements"
            >
              View Milestones →
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Mobile Sticky Button */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/daily-tracking')}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/50 transition-colors"
          aria-label="Start flashcard learning session"
        >
          🌿 Start Session
        </motion.button>
      </div>
    </div>
  );
};

export default Dashboard;
