import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFlashcards } from '../context/FlashcardContext';
import { useAuth } from '../hooks/useAuth';
import gardenStage0 from '../assets/garden-stage-0.png';
import gardenStage1 from '../assets/garden-stage-1.png';
import gardenStage2 from '../assets/garden-stage-2.png';
import gardenStage3 from '../assets/garden-stage-3.png';
import gardenStage4 from '../assets/garden-stage-4.png';
import gardenStage5 from '../assets/garden-stage-5.png';

const Dashboard = () => {
  const { 
    flashcards = [], 
    history = [],
    getFlashcardStats = () => ({})
  } = useFlashcards() || {};
  
  const { currentUser } = useAuth() || {};
  
  const [currentTip, setCurrentTip] = useState(0);
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
  
  // Tips carousel
  const tips = [
    {
      icon: '⏱',
      title: 'Timing Is Key',
      description: '1 second per card keeps it fun'
    },
    {
      icon: '🎈',
      title: 'Make It Fun',
      description: 'Always stop before your child loses interest'
    },
    {
      icon: '🌿',
      title: 'Be Consistent',
      description: 'Short daily sessions grow big results'
    },
    {
      icon: '📦',
      title: 'Introduce New Cards Gradually',
      description: 'Rotate weekly for best results'
    }
  ];
  
  // Auto-rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tips.length]);
  
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
  
  // Progress Garden Visualization with AI-generated images
  const gardenStages = [
    gardenStage0, gardenStage1, gardenStage2, 
    gardenStage3, gardenStage4, gardenStage5
  ];

  const getGardenStage = () => {
    if (stats.currentStreak === 0) return { stage: 0, image: gardenStages[0] };
    if (stats.currentStreak <= 3) return { stage: 1, image: gardenStages[1] };
    if (stats.currentStreak <= 7) return { stage: 2, image: gardenStages[2] };
    if (stats.currentStreak <= 14) return { stage: 3, image: gardenStages[3] };
    if (stats.currentStreak <= 21) return { stage: 4, image: gardenStages[4] };
    return { stage: 5, image: gardenStages[5] };
  };

  const getGardenMessage = () => {
    if (stats.currentStreak === 0) return "Plant your first seed today!";
    if (stats.currentStreak <= 3) return "Your seedling is taking root!";
    if (stats.currentStreak <= 7) return "Beautiful blooms are emerging!";
    if (stats.currentStreak <= 14) return "Your garden is flourishing!";
    if (stats.currentStreak <= 21) return "Gorgeous flowers in full bloom!";
    return "A magnificent garden bursting with life!";
  };
  
  return (
    <div className="min-h-screen pb-20">
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
      
      {/* Overview Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {/* Words Learned - Circular Progress */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="col-span-2 md:col-span-1 glass rounded-2xl p-6 shadow-lg hover-glow"
        >
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-3">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-sprouttie-beige"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - progressPercent / 100)}`}
                  className="text-sprouttie-green transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-sprouttie-green-dark">{progressPercent}%</span>
                <span className="text-xl animate-bounce-leaf">🌱</span>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Words Learned</h3>
            <p className="text-lg font-bold text-gray-700">{stats.learnedWords} / {stats.totalFlashcards}</p>
          </div>
        </motion.div>
        
        {/* Avg Engagement */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 shadow-lg hover-lift"
        >
          <div className="flex flex-col items-center text-center">
            <div className="text-4xl mb-2">
              {stats.avgEngagement >= 4 ? '😍' : stats.avgEngagement >= 3 ? '😊' : stats.avgEngagement >= 2 ? '🙂' : '😐'}
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Avg Engagement</h3>
            <p className="text-2xl font-bold text-gray-700">{stats.avgEngagement.toFixed(1)}</p>
            <p className="text-xs text-gray-400">out of 5</p>
          </div>
        </motion.div>
        
        {/* Total Flashcards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6 shadow-lg hover-lift"
        >
          <div className="flex flex-col items-center text-center">
            <div className="text-4xl mb-2">📚</div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Flashcards</h3>
            <p className="text-2xl font-bold text-gray-700">{stats.totalFlashcards}</p>
          </div>
        </motion.div>
        
        {/* Total Sessions */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6 shadow-lg hover-lift"
        >
          <div className="flex flex-col items-center text-center">
            <div className="text-4xl mb-2">📅</div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Sessions</h3>
            <p className="text-2xl font-bold text-gray-700">{stats.totalSessions}</p>
          </div>
        </motion.div>
        
        {/* Current Streak */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-6 shadow-lg hover-lift"
        >
          <div className="flex flex-col items-center text-center">
            <div className="text-4xl mb-2">🔥</div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Current Streak</h3>
            <p className="text-2xl font-bold text-gray-700">{stats.currentStreak}</p>
            <p className="text-xs text-gray-400">days</p>
          </div>
        </motion.div>
      </div>
      
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 shadow-lg mb-6 overflow-hidden"
      >
        <h2 className="text-xl font-bold text-sprouttie-green-dark mb-4">Sprouttie Tips 💡</h2>
        <div className="relative h-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-gradient-sprouttie rounded-xl p-6 flex items-center gap-4"
            >
              <div className="text-5xl">{tips[currentTip].icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">{tips[currentTip].title}</h3>
                <p className="text-white/90">{tips[currentTip].description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="flex justify-center gap-2 mt-4">
          {tips.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentTip(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentTip ? 'bg-sprouttie-green w-8' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </motion.div>
      
      {/* Progress Garden Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass p-8 rounded-3xl shadow-lg mb-6"
      >
        <h3 className="text-2xl font-bold text-sprouttie-green mb-6">🌿 Your Progress Garden</h3>
        
        <div className="flex items-center justify-center mb-6">
          <motion.div
            animate={{ 
              scale: [1, 1.02, 1],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative w-64 h-64 flex items-center justify-center"
          >
            <img 
              src={getGardenStage().image} 
              alt={`Garden growth stage ${getGardenStage().stage}`}
              className="w-full h-full object-contain drop-shadow-lg print:max-w-full"
            />
          </motion.div>
        </div>

        <div className="text-center">
          <p className="text-lg text-gray-700 mb-2 font-medium">{getGardenMessage()}</p>
          <p className="text-sm text-gray-500">
            {stats.currentStreak} day streak • Keep growing! 🌱
          </p>
        </div>

        <div className="mt-6 bg-sprouttie-beige/30 rounded-full h-4 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((stats.currentStreak / 30) * 100, 100)}%` }}
            transition={{ duration: 1, delay: 0.7 }}
            className="h-full bg-gradient-to-r from-sprouttie-green to-sprouttie-mint rounded-full"
          />
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          {30 - stats.currentStreak > 0 ? `${30 - stats.currentStreak} days to master gardener!` : 'Master Gardener achieved! 🎉'}
        </p>
      </motion.div>
      
      {/* Create Flashcards Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 shadow-lg mb-6"
      >
        <h2 className="text-xl font-bold text-sprouttie-green-dark mb-2">Create & Upload Flashcards Easily</h2>
        <p className="text-gray-600 mb-4 text-sm">Short on time? Upload 20 new words each week to keep learning fresh.</p>
        
        <div className="grid sm:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white border-2 border-sprouttie-green text-sprouttie-green-dark font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            💾 Bulk Upload CSV
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white border-2 border-sprouttie-coral text-sprouttie-coral-dark font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            📄 View Example
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gray-100 border-2 border-gray-300 text-gray-500 font-semibold py-3 px-4 rounded-xl shadow-md cursor-not-allowed"
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
