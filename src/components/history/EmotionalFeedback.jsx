import React from 'react';
import { motion } from 'framer-motion';

const EmotionalFeedback = ({ history = [], stats = {} }) => {
  const getMessage = () => {
    const sessionsThisWeek = history.filter(day => {
      const dayDate = new Date(day.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return dayDate >= weekAgo;
    }).length;
    
    const avgEngagement = stats?.averageEngagement || 0;
    
    // No sessions this week
    if (sessionsThisWeek === 0) {
      return {
        message: "Let's get back on track this week! Even 5 minutes makes a difference 🌱",
        icon: '💪',
        color: 'bg-gradient-to-r from-[hsl(var(--sprouttie-coral-light))] to-[hsl(var(--sprouttie-beige))]'
      };
    }
    
    // Low engagement
    if (avgEngagement < 2.5) {
      return {
        message: "Every little sprout needs gentle care. Keep going, you're doing great! 🌿",
        icon: '🌱',
        color: 'bg-gradient-to-r from-[hsl(var(--sprouttie-mint))] to-[hsl(var(--sprouttie-cream))]'
      };
    }
    
    // Good engagement
    if (avgEngagement >= 2.5 && avgEngagement < 4) {
      return {
        message: "You're nurturing a curious little sprout! Keep flashing consistently 🌻",
        icon: '🌼',
        color: 'bg-gradient-to-r from-[hsl(168,70%,85%)] to-[hsl(45,70%,90%)]'
      };
    }
    
    // Excellent engagement
    return {
      message: "Amazing dedication! Your little one is blooming beautifully 🌺✨",
      icon: '🌟',
      color: 'bg-gradient-to-r from-[hsl(168,75%,80%)] to-[hsl(15,75%,85%)]'
    };
  };

  const feedback = getMessage();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${feedback.color} rounded-xl p-5 shadow-md border border-[hsl(var(--border))] mb-6`}
    >
      <div className="flex items-center gap-4">
        <div className="text-5xl">{feedback.icon}</div>
        <div className="flex-1">
          <p className="text-[hsl(var(--foreground))] font-medium leading-relaxed">
            {feedback.message}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default EmotionalFeedback;
