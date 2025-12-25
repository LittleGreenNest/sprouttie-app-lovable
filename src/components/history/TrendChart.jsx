import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';

const TrendChart = ({ data = [] }) => {
  // Process history data into weekly trends
  const processData = () => {
    if (!data || data.length === 0) return [];
    
    // Group by week
    const weeklyData = {};
    data.forEach(session => {
      const date = new Date(session.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekKey,
          cards: 0,
          engagement: [],
          sessions: 0
        };
      }
      
      // Count cards
      const cardsCount = Object.values(session.setUsage || {}).reduce((sum, count) => sum + count, 0);
      weeklyData[weekKey].cards += cardsCount;
      weeklyData[weekKey].engagement.push(session.engagement || 0);
      weeklyData[weekKey].sessions += 1;
    });
    
    // Convert to array and calculate averages
    return Object.values(weeklyData)
      .map(week => ({
        week: new Date(week.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cards: week.cards,
        avgEngagement: week.engagement.reduce((sum, val) => sum + val, 0) / week.engagement.length,
        sessions: week.sessions
      }))
      .sort((a, b) => new Date(a.week) - new Date(b.week))
      .slice(-8); // Last 8 weeks
  };

  const chartData = processData();

  if (chartData.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md p-6 border border-[hsl(var(--border))]"
    >
      <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
        <span>📈</span> Progress This Month
      </h3>
      
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="week" 
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <YAxis 
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="cards" 
            stroke="hsl(var(--sprouttie-green))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--sprouttie-green))', r: 4 }}
            name="Cards Flashed"
            isAnimationActive={false}
          />
          <Line 
            type="monotone" 
            dataKey="avgEngagement" 
            stroke="hsl(var(--sprouttie-coral))" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: 'hsl(var(--sprouttie-coral))', r: 3 }}
            name="Avg Engagement"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[hsl(var(--sprouttie-green))]"></div>
          <span className="text-[hsl(var(--muted-foreground))]">Cards Flashed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[hsl(var(--sprouttie-coral))] border-t-2 border-dashed"></div>
          <span className="text-[hsl(var(--muted-foreground))]">Avg Engagement</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TrendChart;
