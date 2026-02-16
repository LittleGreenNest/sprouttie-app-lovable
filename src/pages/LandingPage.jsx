import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const FEATURES = [
  {
    icon: '🃏',
    title: 'Smart Flashcard System',
    desc: 'Organize words into sets, track introduction dates, and retire mastered cards automatically.',
  },
  {
    icon: '📊',
    title: 'Session Logging',
    desc: 'Log each flashing round with engagement ratings, notes, and time-of-day tracking.',
  },
  {
    icon: '🌱',
    title: 'Learning Garden',
    desc: 'Watch your child\'s vocabulary grow in a pressure-free visual garden \u2014 no scores, no ranks.',
  },
  {
    icon: '🎧',
    title: 'Pronunciation Portal',
    desc: 'Hear native Mandarin pronunciations with tone practice and phonetic guides.',
  },
  {
    icon: '📅',
    title: 'Weekly Word Planner',
    desc: 'Plan which words to introduce each week with themed groupings.',
  },
  {
    icon: '📚',
    title: 'Book Recommendations',
    desc: 'AI-powered book suggestions matched to your child\'s current vocabulary level.',
  },
];

const TESTIMONIALS = [
  {
    quote: "Sprouttie made our bilingual journey feel manageable instead of overwhelming. My daughter's Mandarin vocabulary doubled in two months!",
    author: 'Sarah L.',
    role: 'Parent of a 3-year-old',
  },
  {
    quote: "I love how it doesn't pressure you. Missing a day doesn't feel like failure — you just pick up where you left off.",
    author: 'James T.',
    role: 'Parent of twins, age 2',
  },
  {
    quote: "The session log is a game-changer. I can finally see what we've covered and adjust our approach based on real data.",
    author: 'Michelle K.',
    role: 'Homeschooling parent',
  },
];

const LandingPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="flex justify-center mb-6"
          >
            <img
              src="/images/sprouttie-mascot.png"
              alt="Sprouttie mascot"
              className="h-28 sm:h-40 animate-bounce-leaf"
            />
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-4xl sm:text-6xl font-extrabold text-sprouttie-green-dark tracking-tight leading-tight mb-4"
          >
            Teach your child Mandarin
            <span className="block text-sprouttie-coral-dark">without the pressure</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 mb-8"
          >
            Sprouttie is a flashcard tracking system built for parents using the Glenn Doman method. 
            Log sessions, plan weekly words, and watch your child's vocabulary garden grow — at their own pace.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-white font-semibold text-lg bg-sprouttie-green hover:bg-sprouttie-green-dark transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Start Free — No Card Required
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-semibold text-lg border-2 border-sprouttie-green text-sprouttie-green-dark hover:bg-sprouttie-mint transition-all duration-300"
            >
              Sign In
            </Link>
          </motion.div>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="mt-4 text-sm text-gray-500"
          >
            Used by 100+ parents teaching Mandarin at home
          </motion.p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 px-4 bg-white/50">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-center text-sprouttie-green-dark mb-4"
          >
            How Sprouttie Works
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="text-center text-gray-500 mb-12 max-w-lg mx-auto"
          >
            Three simple steps to a joyful bilingual routine
          </motion.p>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Add Flashcards', desc: 'Create or import your word sets — English, Mandarin, or both.' },
              { step: '2', title: 'Flash & Log', desc: 'Show cards to your child and log each session with one tap.' },
              { step: '3', title: 'Watch Growth', desc: 'Track progress in a calm Learning Garden with no pressure.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sprouttie-coral-light text-sprouttie-coral-dark text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-sprouttie-green-dark mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-center text-sprouttie-green-dark mb-12"
          >
            Everything You Need
          </motion.h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="bg-white rounded-2xl p-6 border border-sprouttie-beige shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-sprouttie-green-dark mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 sm:py-24 px-4 bg-sprouttie-mint">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-center text-sprouttie-green-dark mb-12"
          >
            What Parents Say
          </motion.h2>

          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.blockquote
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="bg-white rounded-2xl p-6 border border-sprouttie-beige shadow-sm"
              >
                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <footer>
                  <div className="font-semibold text-sprouttie-green-dark text-sm">{t.author}</div>
                  <div className="text-xs text-gray-500">{t.role}</div>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 px-4 text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-sprouttie-green-dark mb-4">
            Ready to grow your child's vocabulary?
          </h2>
          <p className="text-gray-600 mb-8">
            Join hundreds of parents building a bilingual future — one card at a time.
          </p>
          <Link
            to="/signup"
            className="inline-block px-10 py-4 rounded-2xl text-white font-semibold text-lg bg-sprouttie-green hover:bg-sprouttie-green-dark transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Get Started Free
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sprouttie-beige py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} Sprouttie. All rights reserved.</span>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-sprouttie-green-dark transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-sprouttie-green-dark transition-colors">Privacy</Link>
            <Link to="/support" className="hover:text-sprouttie-green-dark transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
