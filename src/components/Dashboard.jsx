import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFlashcards } from '../context/FlashcardContext';
import { useAuth } from '../hooks/useAuth';
import ProgressHero from './dashboard/ProgressHero';
import MetricsRow from './dashboard/MetricsRow';
import TipsCarousel from './dashboard/TipsCarousel';
import ProgressGarden from './dashboard/ProgressGarden';
import CelebrationModal from './dashboard/CelebrationModal';

const Dashboard = () => {
  const { 
    flashcards = [], 
    history = [],
    getFlashcardStats = () => ({})
  } = useFlashcards() || {};
  
  const { currentUser } = useAuth() || {};
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationWords, setCelebrationWords] = useState(0);
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
  
  return (
    <div className="min-h-screen pb-20">
      {/* Celebration Modal */}
      <CelebrationModal 
        show={showCelebration} 
        onClose={() => setShowCelebration(false)}
        wordsFlashed={celebrationWords}
      />

      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl shadow-xl p-8 mb-6 border border-white/50"
      >
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-6xl"
          >
            🌱
          </motion.div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-sprouttie-green-dark mb-2">
              Hi {firstName} 👋
            </h1>
            <p className="text-lg text-gray-600">Ready to grow today's words?</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerCelebration(3)}
            className="flex-1 bg-gradient-to-r from-sprouttie-green to-sprouttie-green-light text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all text-lg"
          >
            🌿 Start Flashcard Session
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-sprouttie-green-dark font-semibold py-4 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all border-2 border-sprouttie-green"
          >
            + Add Flashcard
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-sprouttie-coral-dark font-semibold py-4 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all border-2 border-sprouttie-coral"
          >
            📥 Bulk Upload
          </motion.button>
        </div>
      </motion.div>
      
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
            className="bg-gradient-to-r from-sprouttie-green to-sprouttie-green-light text-white font-bold py-4 px-4 rounded-xl shadow-md hover:shadow-xl transition-all"
          >
            💾 Bulk Upload CSV
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white border-2 border-sprouttie-coral text-sprouttie-coral-dark font-semibold py-4 px-4 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            📄 View Example
          </motion.button>
          
          <motion.button
            className="bg-gray-100 border-2 border-gray-300 text-gray-500 font-semibold py-4 px-4 rounded-xl shadow-md cursor-not-allowed opacity-60"
            disabled
          >
            🪴 AI Generate (Soon)
          </motion.button>
        </div>
      </motion.div>
      
      {/* Notifications Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌞</span>
            <p className="text-gray-700 font-medium">Keep up the great work! Your consistency is amazing.</p>
          </div>
          <button className="text-sprouttie-green-dark hover:text-sprouttie-green font-semibold text-sm">
            View All →
          </button>
        </div>
      </motion.div>
      
      {/* Mobile Sticky Button */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full bg-gradient-to-r from-sprouttie-green to-sprouttie-green-light text-white font-bold py-4 px-8 rounded-2xl shadow-2xl"
        >
          🌿 Start Session
        </motion.button>
      </div>
    </div>
  );
};

export default Dashboard;
