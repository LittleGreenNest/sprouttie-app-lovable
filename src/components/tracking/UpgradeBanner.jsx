import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-toastify';

const UpgradeBanner = ({ userPlan = 'free' }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  if (userPlan !== 'free' && userPlan !== 'print') return null;

  const handleWaitlistSignup = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{ 
          email, 
          source: 'pro_sprout_upgrade_banner',
          consent: true 
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.info('You\'re already on the waitlist!');
          setIsSubscribed(true);
        } else {
          throw error;
        }
      } else {
        toast.success('You\'re on the Pro Sprout waitlist!');
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Waitlist signup error:', error);
      toast.error('Could not join waitlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 mb-6 shadow-md"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="text-4xl">🚀</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-purple-900">
              Family Tracking
            </h3>
            <span className="px-2 py-0.5 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
              COMING SOON
            </span>
          </div>
          <p className="text-sm text-purple-800 mb-2">
            Track who practiced with your child each day. Perfect for co-parents, grandparents, and caregivers working together!
          </p>
          <p className="text-xs text-purple-600">
            Part of the <strong>Pro Sprout</strong> plan — join the waitlist to be notified when it launches!
          </p>
        </div>
        
        {isSubscribed ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg font-medium">
            <span>✓</span> On waitlist!
          </div>
        ) : (
          <form onSubmit={handleWaitlistSignup} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
              disabled={isSubmitting}
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap disabled:opacity-50"
            >
              {isSubmitting ? 'Joining...' : 'Join Waitlist'}
            </motion.button>
          </form>
        )}
      </div>
    </motion.div>
  );
};

export default UpgradeBanner;
