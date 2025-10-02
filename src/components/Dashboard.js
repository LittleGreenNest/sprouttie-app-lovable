// components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useFlashcards } from '../context/FlashcardContext';

const Dashboard = () => {
  const { 
    categories = [], 
    flashcards = [], 
    sets = [], 
    history = [],
    getFlashcardStats = () => ({})
  } = useFlashcards() || {};
  
  const [summaryStats, setSummaryStats] = useState({
    totalFlashcards: 0,
    totalCategories: 0,
    totalSets: 0,
    totalSessions: 0,
    avgEngagement: 0,
    recentActivity: [],
    topCategories: [],
    topTimeOfDay: '',
    learnedWords: 0
  });
  
  // Color choices for different UI elements
  const categoryColors = [
    'bg-blue-50 border-blue-100 text-blue-800',
    'bg-green-50 border-green-100 text-green-800',
    'bg-yellow-50 border-yellow-100 text-yellow-800',
    'bg-purple-50 border-purple-100 text-purple-800',
    'bg-red-50 border-red-100 text-red-800'
  ];
  
  // Calculate learned words (simplified logic - in a real app you'd have more complex criteria)
  const calculateLearnedWords = () => {
    try {
      // For this example, we'll count a word as "learned" if it has been shown at least 5 times
      const stats = getFlashcardStats();
      return Object.values(stats).filter(count => count >= 5).length;
    } catch (error) {
      console.error("Error calculating learned words:", error);
      return 0;
    }
  };
  
  // Calculate top categories by usage
  const calculateTopCategories = () => {
    try {
      const stats = getFlashcardStats();
      
      if (!stats || !categories || categories.length === 0) {
        return [];
      }
      
      // Group stats by category
      const categoryUsage = {};
      categories.forEach(category => {
        if (category && category.id) {
          categoryUsage[category.id] = 0;
        }
      });
      
      // Add usage counts from stats
      Object.entries(stats).forEach(([id, count]) => {
        const category = categories.find(c => c && c.id === id);
        if (category) {
          categoryUsage[id] = count;
        }
      });
      
      // Sort and return top 3
      return Object.entries(categoryUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => ({
          id,
          name: categories.find(c => c && c.id === id)?.name || 'Unknown',
          count
        }));
    } catch (error) {
      console.error("Error calculating top categories:", error);
      return [];
    }
  };
  
  // Calculate most common time of day for flashcard sessions
  const calculateTopTimeOfDay = () => {
    try {
      if (!history || history.length === 0) {
        return '';
      }
      
      const timeCount = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
      
      history.forEach(day => {
        if (day && day.timeOfDay) {
          timeCount[day.timeOfDay] = (timeCount[day.timeOfDay] || 0) + 1;
        }
      });
      
      const entries = Object.entries(timeCount).filter(([_, count]) => count > 0);
      return entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0]?.[0] || '' : '';
    } catch (error) {
      console.error("Error calculating top time of day:", error);
      return '';
    }
  };
  
  // Calculate average engagement
  const calculateAvgEngagement = () => {
    try {
      if (!history || history.length === 0) return 0;
      
      const validEntries = history.filter(day => day && typeof day.engagement === 'number');
      if (validEntries.length === 0) return 0;
      
      const sum = validEntries.reduce((total, day) => total + (day.engagement || 0), 0);
      return sum / validEntries.length;
    } catch (error) {
      console.error("Error calculating average engagement:", error);
      return 0;
    }
  };
  
  // Calculate all stats
  useEffect(() => {
    try {
      const calculateStats = () => {
        // Sort history by date (newest first)
        const sortedHistory = [...(history || [])].sort((a, b) => {
          if (!a || !a.date) return 1;
          if (!b || !b.date) return -1;
          return new Date(b.date) - new Date(a.date);
        });
        
        // Get latest 5 sessions
        const recentActivity = sortedHistory.slice(0, 5);
        
        setSummaryStats({
          totalFlashcards: flashcards?.length || 0,
          totalCategories: categories?.length || 0,
          totalSets: sets?.length || 0,
          totalSessions: history?.length || 0,
          avgEngagement: calculateAvgEngagement(),
          recentActivity,
          topCategories: calculateTopCategories(),
          topTimeOfDay: calculateTopTimeOfDay(),
          learnedWords: calculateLearnedWords()
        });
      };
      
      calculateStats();
    } catch (error) {
      console.error("Error calculating dashboard stats:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcards, categories, sets, history]);
  
  // Emoji for different times of day
  const getTimeEmoji = (time) => {
    switch (time) {
      case 'Morning': return <span role="img" aria-label="Morning">🌅</span>;
      case 'Afternoon': return <span role="img" aria-label="Afternoon">☀️</span>;
      case 'Evening': return <span role="img" aria-label="Evening">🌆</span>;
      case 'Night': return <span role="img" aria-label="Night">🌙</span>;
      default: return <span role="img" aria-label="Clock">⏰</span>;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Welcome / Stats Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-green-800 mb-4">Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Flashcards */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Flashcards</h3>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalFlashcards}</p>
              </div>
              <div className="text-green-500 text-3xl">
                <span role="img" aria-label="Books">📚</span>
              </div>
            </div>
          </div>
          
          {/* Categories */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Categories</h3>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalCategories}</p>
              </div>
              <div className="text-blue-500 text-3xl">
                <span role="img" aria-label="Tags">🏷️</span>
              </div>
            </div>
          </div>
          
          {/* Sets */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Sets</h3>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalSets}</p>
              </div>
              <div className="text-purple-500 text-3xl">
                <span role="img" aria-label="Folder">🗂️</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sessions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Sessions</h3>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalSessions}</p>
              </div>
              <div className="text-orange-500 text-3xl">
                <span role="img" aria-label="Calendar">📆</span>
              </div>
            </div>
          </div>
          
          {/* Average Engagement */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Avg. Engagement</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {summaryStats.avgEngagement.toFixed(1)}/5
                </p>
              </div>
              <div className="text-yellow-500 text-3xl">
                <span role="img" aria-label={summaryStats.avgEngagement > 3.5 ? "Very Happy Face" : summaryStats.avgEngagement > 2 ? "Happy Face" : "Neutral Face"}>
                  {summaryStats.avgEngagement > 3.5 ? '😃' : summaryStats.avgEngagement > 2 ? '😊' : '😐'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Words Learned */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Words Learned</h3>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.learnedWords}</p>
              </div>
              <div className="text-green-500 text-3xl">
                <span role="img" aria-label="Brain">🧠</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-medium mb-4">Recent Activity</h3>
        
        {!summaryStats.recentActivity || summaryStats.recentActivity.length === 0 ? (
          <p className="text-gray-500">No activity recorded yet. Start tracking daily flashcard sessions!</p>
        ) : (
          <div className="space-y-4">
            {summaryStats.recentActivity.map((activity, index) => (
              <div key={activity?.date || index} className="border-l-4 border-green-500 pl-4 py-2">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">
                      {activity?.date ? new Date(activity.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) : 'Unknown Date'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {activity?.selectedSets?.length || 0} sets used • 
                      {Object.values(activity?.setUsage || {}).reduce((sum, count) => sum + count, 0)} flashes
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-3 text-sm">
                      {getTimeEmoji(activity?.timeOfDay)}
                      <span className="ml-1">{activity?.timeOfDay || 'Time not recorded'}</span>
                    </div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      (activity?.engagement || 0) >= 4 ? 'bg-green-100 text-green-800' :
                      (activity?.engagement || 0) >= 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {activity?.engagement || 0}
                    </div>
                  </div>
                </div>
                {activity?.notes && (
                  <div className="text-sm mt-1 text-gray-600 italic">
                    "{activity.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-medium mb-4">Most Used Categories</h3>
          
          {!summaryStats.topCategories || summaryStats.topCategories.length === 0 ? (
            <p className="text-gray-500">No category usage data yet.</p>
          ) : (
            <div className="space-y-3">
              {summaryStats.topCategories.map((category, index) => (
                <div key={category.id || index} className={`px-4 py-3 rounded-lg border ${categoryColors[index % categoryColors.length]}`}>
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm">Used {category.count} times</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Best Time of Day */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-medium mb-4">Best Engagement Time</h3>
          
          {!summaryStats.topTimeOfDay ? (
            <p className="text-gray-500">No time of day data recorded yet.</p>
          ) : (
            <div className="flex items-center px-4 py-3 rounded-lg border bg-blue-50 border-blue-100">
              <div className="text-4xl mr-4">
                {getTimeEmoji(summaryStats.topTimeOfDay)}
              </div>
              <div>
                <div className="text-lg font-medium text-blue-800">
                  {summaryStats.topTimeOfDay}
                </div>
                <div className="text-sm text-blue-600">
                  This is when your child tends to be most engaged!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Tips */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-medium mb-4">Sprouttie</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-yellow-50">
            <h4 className="font-medium text-yellow-800 mb-2">Timing Is Key</h4>
            <p className="text-sm text-yellow-700">
              Show each card for just 1 second. Keep sessions short (no more than 5 minutes) and have multiple sessions per day.
            </p>
          </div>
          
          <div className="border rounded-lg p-4 bg-green-50">
            <h4 className="font-medium text-green-800 mb-2">Make It Fun</h4>
            <p className="text-sm text-green-700">
              Always keep flashcard sessions positive and upbeat. Stop before your child loses interest.
            </p>
          </div>
          
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium text-blue-800 mb-2">Be Consistent</h4>
            <p className="text-sm text-blue-700">
              Create a routine with regular times for flashcard sessions. Consistency helps reinforce learning.
            </p>
          </div>
          
          <div className="border rounded-lg p-4 bg-purple-50">
            <h4 className="font-medium text-purple-800 mb-2">Introduce New Cards Gradually</h4>
            <p className="text-sm text-purple-700">
              Add one new card per set each day while phasing out older ones. This keeps content fresh and engaging.
            </p>
          </div>
        </div>
      </div>
      
      {/* Create Sample CSV Template Button */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-medium mb-4">Create Flashcards Easily</h3>
        <p className="text-gray-600 mb-4">
          Need to create multiple flashcards at once? Use our CSV import feature to add many flashcards quickly.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4">
          <a 
            href="data:text/csv;charset=utf-8,Body Parts,Clothing,Animals%0Aarm,shirt,dog%0Aleg,pants,cat%0Ahead,shoes,bird"
            download="flashcard_template.csv"
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            Download CSV Template
          </a>
          
          <button
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/e/2PACX-1vQB8-EhHYHSoZRw1cPjhxw71lKTb4awDLTsuVY3tU8JfACyVAOOsLbU5KY2PiFBVg/pub?output=csv', '_blank')}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
              />
            </svg>
            View Example Spreadsheet
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;