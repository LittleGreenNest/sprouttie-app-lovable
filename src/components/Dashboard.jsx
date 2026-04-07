import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFlashcards } from '../context/FlashcardContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ProgressHero from './dashboard/ProgressHero';
import MetricsRow from './dashboard/MetricsRow';
import TipsCarousel from './dashboard/TipsCarousel';
import ProgressGarden from './dashboard/ProgressGarden';
import CelebrationModal from './dashboard/CelebrationModal';
import MilestoneModal from './gamification/MilestoneModal';
import MilestonesListModal from './gamification/MilestonesListModal';
import FlashedWordsGrid from './tracking/FlashedWordsGrid';
import CSVImport from './CSVImport';
import ThisWeekCard from './thisweek/ThisWeekCard';
import ThisWeekFlow from './thisweek/ThisWeekFlow';
import ReflectionReminder from './dashboard/ReflectionReminder';
import { checkForNewMilestone } from '../utils/milestones';
import { getEncouragement } from '../utils/encouragements';
import { useAccessibility, useSkipLinks } from '../hooks/useAccessibility';

const Dashboard = () => {
  const { 
    flashcards = [], 
    categories = []
  } = useFlashcards() || {};
  
  const { currentUser } = useAuth() || {};
  const navigate = useNavigate();
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationWords, setCelebrationWords] = useState(0);
  const [showMilestone, setShowMilestone] = useState(false);
  const [showMilestonesList, setShowMilestonesList] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState(null);
  const [achievedMilestones, setAchievedMilestones] = useState([]);
  const [encouragement, setEncouragement] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showThisWeek, setShowThisWeek] = useState(false);
  const [trackingData, setTrackingData] = useState([]);
  
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

  // Fetch tracking data from Supabase
  useEffect(() => {
    if (currentUser) {
      fetchTrackingData();
    }
  }, [currentUser]);

  const fetchTrackingData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateString = thirtyDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('date', dateString)
        .order('date', { ascending: true });

      if (error) throw error;
      setTrackingData(data || []);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setTrackingData([]);
    }
  };
  
  // Calculate statistics
  useEffect(() => {
    const calculateStats = () => {
      const today = new Date().toISOString().split('T')[0];
      const todayTracking = trackingData.filter(t => t.date === today);
      
      // Calculate streak (consecutive days with any flashed activity)
      const uniqueDates = [...new Set(trackingData
        .filter(t => t.status === 'flashed')
        .map(t => t.date))]
        .sort((a, b) => new Date(b) - new Date(a));
      
      let streak = 0;
      const now = new Date();
      for (let i = 0; i < uniqueDates.length; i++) {
        const date = new Date(uniqueDates[i]);
        const dayDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (dayDiff === i) streak++;
        else break;
      }
      
      // Calculate avg engagement from tracking data
      const engagementRecords = trackingData.filter(t => t.engagement !== null);
      const avgEngagement = engagementRecords.length > 0
        ? engagementRecords.reduce((sum, t) => sum + t.engagement, 0) / engagementRecords.length
        : 0;
      
      // Get learned words (flashcards shown 5+ times)
      const flashcardCount = {};
      trackingData.filter(t => t.status === 'flashed' && t.flashcard_id).forEach(t => {
        flashcardCount[t.flashcard_id] = (flashcardCount[t.flashcard_id] || 0) + 1;
      });
      const learnedWords = Object.values(flashcardCount).filter(count => count >= 5).length;
      
      // Get best time of day
      const timeCount = {};
      trackingData.forEach(t => {
        if (t.time_of_day) {
          timeCount[t.time_of_day] = (timeCount[t.time_of_day] || 0) + 1;
        }
      });
      const bestTime = Object.keys(timeCount).length > 0
        ? Object.entries(timeCount).sort((a, b) => b[1] - a[1])[0][0]
        : '';
      
      // Get top categories from flashcards
      const categoryCount = {};
      flashcards.forEach(f => {
        const cat = f.categoryId || 'default';
        const categoryName = categories.find(c => c.id === cat)?.name || 'Other';
        categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
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
        const dateString = date.toISOString().split('T')[0];
        const dayTracking = trackingData.filter(t => t.date === dateString);
        const dayName = date.toLocaleDateString('en', { weekday: 'short' });
        
        // Count unique sessions (based on set-round combinations)
        const sessions = new Set(dayTracking
          .filter(t => t.notes)
          .map(t => {
            try {
              const metadata = JSON.parse(t.notes);
              return `${metadata.setId}-${metadata.round}`;
            } catch {
              return null;
            }
          })
          .filter(Boolean)
        ).size;
        
        weekData.push({
          day: dayName,
          sessions,
          engagement: dayTracking.length > 0 && dayTracking.some(t => t.engagement !== null)
            ? Math.round(dayTracking.filter(t => t.engagement !== null).reduce((sum, t) => sum + t.engagement, 0) / dayTracking.filter(t => t.engagement !== null).length)
            : 0
        });
      }
      
      // Count total unique sessions across all data
      const allSessions = new Set(trackingData
        .filter(t => t.notes)
        .map(t => {
          try {
            const metadata = JSON.parse(t.notes);
            return `${t.date}-${metadata.setId}-${metadata.round}`;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
      ).size;
      
      setStats({
        totalFlashcards: flashcards.length,
        avgEngagement: Math.round(avgEngagement),
        totalSessions: allSessions,
        currentStreak: streak,
        learnedWords,
        topCategories,
        bestTime,
        todayFlashes: todayTracking.filter(t => t.status === 'flashed').length,
        weekData
      });
    };
    
    calculateStats();
  }, [flashcards, trackingData, categories]);

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

      {/* Milestone Modal (for newly achieved milestones) */}
      <MilestoneModal 
        show={showMilestone}
        onClose={() => setShowMilestone(false)}
        milestone={currentMilestone}
      />

      {/* Milestones List Modal (for viewing all milestones) */}
      <MilestonesListModal
        show={showMilestonesList}
        onClose={() => setShowMilestonesList(false)}
        achievedMilestones={achievedMilestones}
        stats={stats}
      />

      {/* CSV Import Modal */}
      {showCSVImport && (
        <CSVImport onClose={() => setShowCSVImport(false)} />
      )}

      {/* This Week Flow */}
      <ThisWeekFlow show={showThisWeek} onClose={() => setShowThisWeek(false)} />

      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl shadow-xl p-8 mb-6 border border-white/50"
      >
        <div className="flex items-start gap-4 mb-6 text-left w-full">
          <div className="w-full">
            <h1 className="text-3xl md:text-4xl font-bold text-sprouttie-green-dark mb-2 text-left">
              Hi {firstName} 👋
            </h1>
            <p className="text-lg text-gray-600 text-left">Ready to continue growing your kid's language?</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/daily-tracking')}
            className="flex-1 bg-gradient-to-r from-sprouttie-green to-sprouttie-green-light text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all text-lg"
          >
            🌿 Start Flashcard Session
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/manage-flashcards')}
            className="bg-white text-sprouttie-green-dark font-semibold py-4 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all border-2 border-sprouttie-green"
          >
            + Add Flashcard
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCSVImport(true)}
            className="bg-white text-sprouttie-coral-dark font-semibold py-4 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all border-2 border-sprouttie-coral"
          >
            📥 Bulk Upload
          </motion.button>
        </div>
      </motion.div>

      {/* This Week Card */}
      <ThisWeekCard onOpen={() => setShowThisWeek(true)} />
      
      {/* Progress Hero - Words Learned & Current Streak */}
      <ProgressHero stats={stats} progressPercent={progressPercent} />
      
      {/* Metrics Row - Engagement, Total Cards, Sessions */}
      <MetricsRow stats={stats} />
      
      {/* Insights Section */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Today's Summary + Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6 shadow-lg"
        >
          <h2 className="text-xl font-bold text-sprouttie-green-dark mb-4">Today's Summary</h2>
          <div className="bg-sprouttie-coral-light/30 rounded-xl p-4 mb-4">
            <p className="text-gray-700 leading-relaxed">
              {stats.todayFlashes > 0 ? (
                <>You've flashed <span className="font-bold text-sprouttie-green-dark">{stats.todayFlashes}</span> cards today — amazing consistency! 🌟</>
              ) : (
                <>Start your first session today and watch your garden grow! 🌱</>
              )}
            </p>
          </div>
          
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Weekly Engagement</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} domain={[0, 5]} />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #d1fae5',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="engagement" 
                stroke="hsl(168, 85%, 65%)" 
                strokeWidth={3}
                dot={{ fill: 'hsl(168, 85%, 65%)', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
        
        {/* Categories & Best Time */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Most Used Categories */}
          <div className="glass rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-sprouttie-green-dark mb-4">Most Used Categories</h2>
            {stats.topCategories.length > 0 ? (
              <div className="space-y-3">
                {stats.topCategories.map((cat, idx) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center justify-between bg-gradient-to-r from-sprouttie-beige to-sprouttie-mint p-3 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{categoryEmojis[cat.name.toLowerCase()] || categoryEmojis.default}</span>
                      <span className="font-semibold text-gray-700 capitalize">{cat.name}</span>
                    </div>
                    <span className="bg-white px-3 py-1 rounded-full text-sm font-medium text-sprouttie-green-dark">
                      {cat.count} cards
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No categories yet. Start adding flashcards!</p>
            )}
          </div>
          
          {/* Best Time of Day */}
          <div className="glass rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-sprouttie-green-dark mb-4">Best Time of Day</h2>
            {stats.bestTime ? (
              <div className="flex items-center gap-4 bg-gradient-calm p-4 rounded-xl">
                <span className="text-5xl">{timeEmojis[stats.bestTime] || '⏰'}</span>
                <div>
                  <p className="text-lg font-bold text-gray-700">{stats.bestTime}</p>
                  <p className="text-sm text-gray-600">Peak engagement time ✨</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Complete sessions to discover your best time!</p>
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Sprouttie Tips Carousel */}
      <TipsCarousel />
      
      {/* Progress Garden Visualization */}
      <ProgressGarden stats={stats} />
      
      {/* Flashed Words Progress Grid */}
      <FlashedWordsGrid />
      
      {/* Create & Upload Flashcards Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-sprouttie-beige to-sprouttie-cream rounded-2xl p-6 shadow-lg mb-6 border-2 border-sprouttie-beige-dark"
      >
        <h2 className="text-xl font-bold text-sprouttie-green-dark mb-2">Create & Upload Flashcards</h2>
        <p className="text-gray-600 mb-4 text-sm">
          💡 Helper tip: Upload ~20 new words weekly to keep learning fresh.
        </p>
        
        <div className="grid sm:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCSVImport(true)}
            className="bg-gradient-to-r from-sprouttie-green to-sprouttie-green-light text-white font-bold py-4 px-4 rounded-xl shadow-md hover:shadow-xl transition-all"
          >
            💾 Bulk Upload CSV
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadExampleCSV}
            className="bg-white border-2 border-sprouttie-coral text-sprouttie-coral-dark font-semibold py-4 px-4 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            📄 Download Example
          </motion.button>
          
          <motion.button
            className="bg-gray-100 border-2 border-gray-300 text-gray-500 font-semibold py-4 px-4 rounded-xl shadow-md cursor-not-allowed opacity-60"
            disabled
          >
            🪴 AI Generate (Soon)
          </motion.button>
        </div>
      </motion.div>
      
      {/* Mobile Sticky Button - above bottom tab bar */}
      <div className="md:hidden fixed bottom-20 left-4 right-4 z-20">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full bg-gradient-to-r from-sprouttie-green to-sprouttie-green-light text-white font-bold py-4 px-8 rounded-2xl shadow-2xl focus:outline-none focus:ring-4 focus:ring-sprouttie-green/50"
          aria-label="Start flashcard learning session"
        >
          🌿 Start Session
        </motion.button>
      </div>
    </div>
  );
};

export default Dashboard;
