// components/HistoryView.js
import React, { useState } from 'react';
import { useFlashcards } from '../context/FlashcardContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import TrendChart from './history/TrendChart';
import EngagementChart from './history/EngagementChart';
import EmotionalFeedback from './history/EmotionalFeedback';
import EngagementStars from './history/EngagementStars';

const HistoryView = () => {
  const [selectedMonth, setSelectedMonth] = useState('April 2025');
  const [showTable, setShowTable] = useState(false);
  const { history, getFlashcardStats } = useFlashcards();
  
  // Get stats for summary displays
  const stats = getFlashcardStats();

  // Export function to handle the export button click
  const handleExport = () => {
    try {
      // Filter history based on selected month if needed
      const dataToExport = selectedMonth === 'All History' 
        ? history 
        : history.filter(item => {
            const itemDate = new Date(item.date);
            const monthYear = itemDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            return monthYear === selectedMonth;
          });
      
      if (dataToExport.length === 0) {
        alert('No data to export for the selected period.');
        return;
      }
      
      // Format the data for CSV export
      const csvRows = [];
      
      // Add headers
      csvRows.push([
        'Date', 
        'Day of Week', 
        'Sets Used', 
        'Total Flashes', 
        'Engagement Rating', 
        'Time of Day', 
        'Notes'
      ].join(','));
      
      // Add data rows
      dataToExport.forEach(day => {
        const date = new Date(day.date);
        const formattedDate = date.toLocaleDateString('en-US');
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        const setsUsed = (day.selectedSets || []).join(', ');
        const totalFlashes = Object.values(day.setUsage || {}).reduce((sum, count) => sum + count, 0);
        
        // Escape notes to handle commas and quotes properly for CSV
        const escapedNotes = day.notes ? `"${day.notes.replace(/"/g, '""')}"` : '';
        
        csvRows.push([
          formattedDate,
          dayOfWeek,
          setsUsed,
          totalFlashes,
          day.engagement || 0,
          day.timeOfDay || '',
          escapedNotes
        ].join(','));
      });
      
      // Create CSV content
      const csvContent = csvRows.join('\n');
      
      // Create a downloadable link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      const filename = `flashcard-history-${selectedMonth.replace(' ', '-')}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert('There was an error exporting the data. Please try again.');
    }
  };

  // Empty state check
  const hasData = history && history.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">📚 Flashcard History</h2>
        <div className="flex items-center space-x-3">
          <select 
            className="bg-white border border-[hsl(var(--border))] text-[hsl(var(--foreground))] py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sprouttie-green))] transition-all"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option>April 2025</option>
            <option>March 2025</option>
            <option>February 2025</option>
            <option>January 2025</option>
            <option>All History</option>
          </select>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-[hsl(var(--sprouttie-green))] text-white px-4 py-2 rounded-lg hover:bg-[hsl(var(--sprouttie-green-dark))] transition-colors flex items-center gap-2 shadow-md"
            onClick={handleExport}
            title="Download your progress summary"
          >
            <Download size={16} />
            Save as PDF
          </motion.button>
        </div>
      </div>

      {/* Empty State */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 px-6"
        >
          <div className="text-8xl mb-6">😴</div>
          <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-3">
            No sessions yet this month
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-md">
            Let's start flashing today! Your little sprout is ready to learn.
          </p>
          <motion.a
            href="/"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[hsl(var(--sprouttie-green))] text-white px-6 py-3 rounded-lg hover:bg-[hsl(var(--sprouttie-green-dark))] transition-colors font-medium shadow-md"
          >
            Go to Dashboard → Start Flashing
          </motion.a>
        </motion.div>
      )}

      {/* Content - only show if we have data */}
      {hasData && (
        <>
          {/* Emotional Feedback */}
          <EmotionalFeedback history={history} stats={stats} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <TrendChart data={history} />
            <EngagementChart history={history} />
          </div>
          {/* Collapsible History Table */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-md border border-[hsl(var(--border))] mb-6 overflow-hidden"
          >
            <button
              onClick={() => setShowTable(!showTable)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[hsl(var(--sprouttie-mint))] to-[hsl(var(--sprouttie-cream))] hover:from-[hsl(168,60%,93%)] hover:to-[hsl(45,60%,95%)] transition-all"
            >
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <span>📋</span> View Session Details
              </h3>
              {showTable ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            <AnimatePresence>
              {showTable && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[hsl(var(--border))]">
                      <thead className="bg-[hsl(var(--muted))]">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                            Sets Used
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                            Flashcards
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                            Engagement
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[hsl(var(--border))]">
                        {history.map((day, index) => (
                          <motion.tr 
                            key={day.date}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-[hsl(var(--muted))] transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-[hsl(var(--foreground))]">{day.date}</div>
                              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1">
                                {(day.selectedSets || []).map((setId, idx) => (
                                  <span 
                                    key={setId} 
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      idx === 0 ? 'bg-[#D9EFFF] text-[hsl(220,70%,40%)]' :
                                      idx === 1 ? 'bg-[#DFFFEA] text-[hsl(140,60%,35%)]' :
                                      'bg-[#FFF0E1] text-[hsl(30,70%,40%)]'
                                    }`}
                                  >
                                    Set {setId}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-[hsl(var(--foreground))]">
                                {Object.keys(day.setUsage || {}).length > 0 ? 'Used' : 'None'}
                              </div>
                              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                {Object.keys(day.setUsage || {}).reduce((total, key) => total + (day.setUsage[key] || 0), 0)} flashes
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <EngagementStars level={day.engagement || 0} />
                              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1 flex gap-1">
                                {(day.engagementTimes || []).map(time => (
                                  <span key={time}>
                                    {time === 'morning' ? '🌞' : 
                                     time === 'afternoon' ? '☀️' : 
                                     time === 'evening' ? '🌆' : '🌙'}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-[hsl(var(--foreground))] max-w-xs truncate">
                                {day.notes || '-'}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          {/* Summary Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6 border border-[hsl(var(--border))]"
          >
            <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
              <span>📊</span> Monthly Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-[hsl(var(--sprouttie-mint))] to-[hsl(var(--sprouttie-cream))] p-4 rounded-lg border border-[hsl(var(--border))]">
                <h4 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Total Sessions</h4>
                <p className="text-3xl font-bold text-[hsl(var(--foreground))]">{history.length}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">This month</p>
              </div>
              <div className="bg-gradient-to-br from-[hsl(168,70%,90%)] to-[hsl(168,60%,95%)] p-4 rounded-lg border border-[hsl(var(--border))]">
                <h4 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Avg. Engagement</h4>
                <div className="flex items-baseline gap-2">
                  <EngagementStars level={stats?.averageEngagement || 0} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-[hsl(15,70%,90%)] to-[hsl(45,70%,95%)] p-4 rounded-lg border border-[hsl(var(--border))]">
                <h4 className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">Cards Learned</h4>
                <p className="text-3xl font-bold text-[hsl(var(--foreground))]">
                  {Object.keys(stats).length > 0 ? Object.keys(stats).length : 0}
                </p>
                <p className="text-sm text-[hsl(140,60%,40%)]">
                  Keep growing! 🌱
                </p>
              </div>
            </div>
            
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3 flex items-center gap-2">
              <span>🏆</span> Most Used Flashcard Sets
            </h4>
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-2 bg-[#D9EFFF] rounded-lg border border-[hsl(220,60%,80%)]">
                <div className="font-medium text-[hsl(220,70%,40%)]">Set 1</div>
                <div className="text-xs text-[hsl(220,60%,50%)]">Most used</div>
              </div>
              <div className="px-3 py-2 bg-[#DFFFEA] rounded-lg border border-[hsl(140,50%,75%)]">
                <div className="font-medium text-[hsl(140,60%,35%)]">Set 2</div>
                <div className="text-xs text-[hsl(140,50%,45%)]">Popular</div>
              </div>
              <div className="px-3 py-2 bg-[#FFF0E1] rounded-lg border border-[hsl(30,60%,80%)]">
                <div className="font-medium text-[hsl(30,70%,40%)]">Set 3</div>
                <div className="text-xs text-[hsl(30,60%,50%)]">Growing</div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default HistoryView;