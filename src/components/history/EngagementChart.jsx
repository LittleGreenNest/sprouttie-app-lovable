import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

const EngagementChart = ({ history = [] }) => {
  // Calculate engagement times distribution
  const calculateTimeDistribution = () => {
    const timeCounts = {
      morning: { count: 0, icon: '🌅', label: 'Morning', color: 'hsl(168, 85%, 70%)' },
      afternoon: { count: 0, icon: '☀️', label: 'Afternoon', color: 'hsl(45, 90%, 65%)' },
      evening: { count: 0, icon: '🌆', label: 'Evening', color: 'hsl(280, 60%, 70%)' },
      night: { count: 0, icon: '🌙', label: 'Night', color: 'hsl(220, 70%, 70%)' }
    };
    
    history.forEach(day => {
      const times = day.engagementTimes || [];
      times.forEach(time => {
        if (timeCounts[time]) {
          timeCounts[time].count += 1;
        }
      });
    });
    
    const total = Object.values(timeCounts).reduce((sum, t) => sum + t.count, 0);
    
    return Object.entries(timeCounts).map(([key, value]) => ({
      time: key,
      ...value,
      percentage: total > 0 ? Math.round((value.count / total) * 100) : 0
    }));
  };

  const data = calculateTimeDistribution();
  const maxPercentage = Math.max(...data.map(d => d.percentage));
  const bestTime = data.find(d => d.percentage === maxPercentage);

  if (history.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl shadow-md p-6 border border-[hsl(var(--border))]"
    >
      <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3 flex items-center gap-2">
        <span>⏰</span> Best Engagement Times
      </h4>
      
      {bestTime && bestTime.percentage > 0 && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
          Most active during <span className="font-semibold text-[hsl(var(--foreground))]">{bestTime.label}</span> {bestTime.icon}
        </p>
      )}
      
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <YAxis 
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            label={{ value: '%', angle: 0, position: 'top', fontSize: 11 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value) => `${value}%`}
          />
          <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default EngagementChart;
