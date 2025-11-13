import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFlashcards } from '../context/FlashcardContext';
import { useAuth } from '../hooks/useAuth';
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
  const [todayHistory, setTodayHistory] = useState([]);

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
      
      setTodayHistory(todayHistory);
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
  
  const timeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const nextPack = flashcards.length > 0 ? {
    name: flashcards[0].folder || 'Uncategorized',
    count: flashcards.filter(f => f.folder === flashcards[0].folder).length
  } : null;

  const sessionsThisWeek = history.filter(h => {
    const diff = Math.floor((new Date() - new Date(h.date)) / (1000 * 60 * 60 * 24));
    return diff < 7;
  }).length;

  const weeklyGoal = 10;
  const weeklyNewWords = history.filter(h => {
    const diff = Math.floor((new Date() - new Date(h.date)) / (1000 * 60 * 60 * 24));
    return diff < 7;
  }).reduce((sum, h) => sum + (h.flashcardsFlashed?.length || 0), 0);

  const daysToNextMilestone = Math.max(0, 7 - (stats.currentStreak % 7));
  const milestoneProgressPercent = ((stats.currentStreak % 7) / 7) * 100;

  return (
    <div className="min-h-screen bg-[#FFF8EE] pb-20" id="main-content">
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

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* 1. Hero Board - "Sprouttie Home" */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#F1D7B8] rounded-2xl px-5 py-4 mb-5 shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: greeting + actions */}
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8B7A65] mb-1">
                Sprouttie Home
              </p>
              <h1 className="text-xl font-semibold text-[#27333F] flex items-center gap-2">
                Hi {firstName} 👋
              </h1>
              <p className="text-sm text-[#8B7A65] mt-1">
                Ready to plant a few new words with your little sprout today?
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => navigate('/daily-tracking')}
                  className="inline-flex items-center gap-2 rounded-full bg-[#5CBE7B] hover:bg-[#46A362] text-white text-sm font-semibold px-4 py-2 transition-colors"
                >
                  <span>▶</span> Continue today's practice
                </button>
                <button
                  onClick={() => navigate('/manage-flashcards')}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D6C3A5] text-[#6B5A43] text-sm font-semibold px-4 py-2 bg-[#FFF8EE] hover:bg-[#FFF2E0] transition-colors"
                >
                  <span>➕</span> Add new words
                </button>
              </div>
            </div>

            {/* Right: compact core stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-[#FFF8EE] border border-[#F1D7B8] rounded-xl px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-[#8B7A65]">Words learned</p>
                <p className="text-lg font-semibold text-[#27333F]">
                  {stats.learnedWords}/{stats.totalFlashcards}
                </p>
                <p className="text-[11px] text-[#8B7A65]">so far</p>
              </div>
              <div className="bg-[#FFF8EE] border border-[#F1D7B8] rounded-xl px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-[#8B7A65]">Current streak</p>
                <p className="text-lg font-semibold text-[#27333F]">
                  {stats.currentStreak}d
                </p>
                <p className="text-[11px] text-[#8B7A65]">keep it going</p>
              </div>
              <div className="bg-[#FFF8EE] border border-[#F1D7B8] rounded-xl px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-[#8B7A65]">Sessions this week</p>
                <p className="text-lg font-semibold text-[#27333F]">
                  {sessionsThisWeek}
                </p>
                <p className="text-[11px] text-[#8B7A65]">goal: {weeklyGoal}</p>
              </div>
            </div>
          </div>
        </motion.div>
      
        {/* 2. Two-column section: Today's Plan + This Week */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Left: Today's Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-[#F1D7B8] rounded-2xl px-4 py-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#8B7A65]">Today</p>
                <h2 className="text-sm font-semibold text-[#27333F]">Today's Plan</h2>
              </div>
              <span className="text-lg">🌱</span>
            </div>

            <p className="text-sm text-[#8B7A65]">
              {stats.todayFlashes > 0 
                ? `Great start! You've flashed ${stats.todayFlashes} word${stats.todayFlashes === 1 ? '' : 's'} today.`
                : "Start your first session today and watch your garden grow!"}
            </p>

            <ul className="text-xs text-[#6B5A43] space-y-1">
              <li>• Do 2-3 mini-session(s) from Daily Tracking.</li>
              <li>• Review tricky words from yesterday.</li>
              <li>• Add 3-5 new words if you have time.</li>
            </ul>

            {nextPack && (
              <div className="mt-2 rounded-xl bg-[#FFF8EE] border border-dashed border-[#F1D7B8] px-3 py-2 text-xs text-[#6B5A43]">
                Next up: <span className="font-semibold">{nextPack.name}</span> · {nextPack.count} words
              </div>
            )}
          </motion.div>

          {/* Right: This Week at a Glance */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-[#F1D7B8] rounded-2xl px-4 py-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#8B7A65]">This Week</p>
                <h2 className="text-sm font-semibold text-[#27333F]">At a Glance</h2>
              </div>
              <span className="text-lg">📊</span>
            </div>

            {/* Weekly engagement chart */}
            <div className="mt-1 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1D7B8" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#8B7A65' }}
                    stroke="#D6C3A5"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#8B7A65' }}
                    stroke="#D6C3A5"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '1px solid #F1D7B8',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#5CBE7B" 
                    strokeWidth={2}
                    dot={{ fill: '#5CBE7B', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Best time + Most used category pills */}
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF8EE] border border-[#F1D7B8] px-3 py-1">
                <span className="text-[11px] uppercase tracking-wide text-[#8B7A65]">Best time</span>
                <span className="font-semibold text-[#27333F]">
                  {stats.bestTime ? `${timeEmoji[stats.bestTime] || ''} ${stats.bestTime}` : 'Discover after a few sessions'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF8EE] border border-[#F1D7B8] px-3 py-1">
                <span className="text-[11px] uppercase tracking-wide text-[#8B7A65]">Favourite category</span>
                <span className="font-semibold text-[#27333F]">
                  {stats.topCategories[0]?.name || 'Not enough data yet'}
                </span>
              </div>
            </div>

            {/* Tip of the day */}
            <div className="mt-2 rounded-xl bg-[#E7F7EE] border border-[#C5ECD7] px-3 py-2 text-xs text-[#27563A]">
              <p className="font-semibold mb-0.5">Today's tip</p>
              <p>Keep sessions short and sweet—1 second per card is perfect for little ones!</p>
            </div>
          </motion.div>
        </div>
      
        {/* 3. Progress Garden */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#F1D7B8] rounded-2xl px-4 py-4 mb-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8B7A65]">
                Long-term progress
              </p>
              <h2 className="text-sm font-semibold text-[#27333F]">Your Progress Garden</h2>
            </div>
            <span className="text-lg">🌼</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 items-center">
            {/* Garden illustration */}
            <div className="flex justify-center">
              <ProgressGarden stats={stats} />
            </div>

            {/* Progress info */}
            <div className="space-y-2 text-xs text-[#6B5A43]">
              <div className="flex items-center justify-between">
                <span>Streak</span>
                <span className="font-semibold text-[#27333F]">
                  {stats.currentStreak} day{stats.currentStreak === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Weekly growth</span>
                <span className="font-semibold text-[#27333F]">
                  {weeklyNewWords} new words
                </span>
              </div>
              <div className="mt-2">
                <div className="h-2 w-full rounded-full bg-[#F3E3CF] overflow-hidden">
                  <div
                    className="h-full bg-[#5CBE7B] transition-all duration-500"
                    style={{ width: `${milestoneProgressPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#8B7A65]">
                  {daysToNextMilestone} days to your next milestone badge.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Today's Flashed Words */}
        {stats.todayFlashes > 0 && (
          <FlashedWordsGrid todayHistory={todayHistory} flashcards={flashcards} />
        )}
        
        {/* 4. Flashcard Tools */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#F1D7B8] rounded-2xl px-4 py-4 mb-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8B7A65]">
                Flashcard tools
              </p>
              <h2 className="text-sm font-semibold text-[#27333F]">Create & upload cards</h2>
              <p className="text-xs text-[#8B7A65] mt-1">
                Helper tip: uploading around 20 new words weekly keeps learning fresh.
              </p>
            </div>
            <span className="text-lg">📇</span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setShowCSVImport(true)}
              className="rounded-full bg-[#5CBE7B] hover:bg-[#46A362] text-white text-xs font-semibold px-4 py-2 transition-colors"
            >
              Bulk upload CSV
            </button>
            <button
              onClick={downloadExampleCSV}
              className="rounded-full border border-[#D6C3A5] text-[#6B5A43] text-xs font-semibold px-4 py-2 bg-[#FFF8EE] hover:bg-[#FFF2E0] transition-colors"
            >
              View example file
            </button>
            <button
              disabled
              className="rounded-full border border-dashed border-[#D6C3A5] text-[#B19A7F] text-xs font-semibold px-4 py-2 bg-[#FFF8EE]/60 cursor-not-allowed"
            >
              AI generate (coming soon)
            </button>
          </div>
        </motion.div>
      </div>
      
      {/* 5. Toast / bottom message */}
      {encouragement && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 z-30"
        >
          <div className="bg-[#27333F] text-white text-xs rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
            <span>🌤️</span>
            <div>
              <p className="font-semibold">
                Good {timeOfDayGreeting()}, {firstName}!
              </p>
              <button
                onClick={() => setShowMilestone(true)}
                className="underline underline-offset-2 text-[11px] hover:text-white/80"
              >
                View milestones
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
