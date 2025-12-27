import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-toastify';

const ComingSoonPage = ({ 
  featureName = 'This Feature',
  featureDescription = 'This feature is coming soon with the Pro Sprout plan.',
  emoji = '🚀'
}) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

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
          source: `pro_sprout_${featureName.toLowerCase().replace(/\s+/g, '_')}`,
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
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        <div className="text-6xl mb-4">{emoji}</div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold mb-4">
          <span>✨</span> Coming Soon
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{featureName}</h1>
        
        <p className="text-gray-600 mb-6">{featureDescription}</p>
        
        <div className="bg-purple-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-purple-800">
            This feature will be available with the <strong>Pro Sprout</strong> plan.
            Join the waitlist to be notified when it launches!
          </p>
        </div>

        {isSubscribed ? (
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg font-medium mb-4">
            <span>✓</span> You're on the waitlist!
          </div>
        ) : (
          <form onSubmit={handleWaitlistSignup} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                disabled={isSubmitting}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Joining...' : 'Join Waitlist'}
              </motion.button>
            </div>
          </form>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard')}
          className="text-green-600 hover:text-green-700 font-medium"
        >
          ← Back to Dashboard
        </motion.button>
      </motion.div>
    </div>
  );
};

export default ComingSoonPage;
