import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
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
    desc: 'Watch your child\'s vocabulary grow in a pressure-free visual garden — no scores, no ranks.',
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
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Hero — Asymmetric Editorial */}
      <section className="relative overflow-hidden px-4 pt-16 pb-24 sm:pt-24 sm:pb-36">
        {/* Decorative background shape */}
        <div className="absolute top-0 right-0 w-[60%] h-[80%] bg-sprouttie-mint rounded-bl-[120px] -z-10 opacity-60" />
        
        <div className="max-w-6xl mx-auto grid sm:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
          {/* Left — Copy */}
          <div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-block mb-6"
            >
              <span className="font-body text-sm font-semibold tracking-widest uppercase text-sprouttie-coral-dark bg-sprouttie-coral-light px-4 py-1.5 rounded-full">
                For parents who flash
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="font-display text-5xl sm:text-7xl leading-[1.05] text-sprouttie-ink mb-6"
            >
              Teach your child Mandarin
              <span className="block text-sprouttie-coral-dark italic">
                without the pressure.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="font-body text-lg sm:text-xl text-[hsl(var(--muted-foreground))] max-w-lg mb-10 leading-relaxed"
            >
              A flashcard tracking system for parents using the Glenn Doman method. 
              Log sessions, plan weekly words, and watch vocabulary grow — at their own pace.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                to="/signup"
                className="font-body inline-flex items-center justify-center px-8 py-4 rounded-xl text-white font-semibold text-lg bg-sprouttie-green hover:bg-sprouttie-green-dark transition-all duration-300 shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-editorial)] hover:-translate-y-0.5"
              >
                Start Free — No Card Required
              </Link>
              <Link
                to="/login"
                className="font-body inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-lg border-2 border-sprouttie-green text-sprouttie-green-dark hover:bg-sprouttie-mint transition-all duration-300"
              >
                Sign In
              </Link>
            </motion.div>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="mt-6 font-body text-sm text-[hsl(var(--muted-foreground))]"
            >
              Used by 100+ parents teaching Mandarin at home
            </motion.p>
          </div>

          {/* Right — Mascot */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="flex justify-center sm:justify-end"
          >
            <img
              src="/images/sprouttie-mascot.png"
              alt="Sprouttie mascot"
              className="h-48 sm:h-64 animate-bounce-leaf drop-shadow-xl"
            />
          </motion.div>
        </div>
      </section>

      {/* How It Works — Magazine strip */}
      <section className="py-20 sm:py-28 px-4 border-t border-b border-[hsl(var(--border))]">
        <div className="max-w-6xl mx-auto">
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="font-body text-sm font-semibold tracking-widest uppercase text-sprouttie-coral-dark mb-3"
          >
            How it works
          </motion.p>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="font-display text-4xl sm:text-5xl text-sprouttie-ink mb-16"
          >
            Three steps to a <span className="italic text-sprouttie-green">joyful</span> bilingual routine
          </motion.h2>

          <div className="grid sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[hsl(var(--border))]">
            {[
              { step: '01', title: 'Add Flashcards', desc: 'Create or import your word sets — English, Mandarin, or both.' },
              { step: '02', title: 'Flash & Log', desc: 'Show cards to your child and log each session with one tap.' },
              { step: '03', title: 'Watch Growth', desc: 'Track progress in a calm Learning Garden with no pressure.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="py-8 sm:py-0 sm:px-8 first:sm:pl-0 last:sm:pr-0"
              >
                <span className="font-display text-6xl text-sprouttie-green-light">{item.step}</span>
                <h3 className="font-display text-xl text-sprouttie-ink mt-4 mb-2">{item.title}</h3>
                <p className="font-body text-[hsl(var(--muted-foreground))] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — Editorial grid with alternating accent */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="font-body text-sm font-semibold tracking-widest uppercase text-sprouttie-coral-dark mb-3"
          >
            Features
          </motion.p>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="font-display text-4xl sm:text-5xl text-sprouttie-ink mb-16"
          >
            Everything you need, <br className="hidden sm:block" />
            <span className="italic text-sprouttie-coral-dark">nothing you don't.</span>
          </motion.h2>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className={`rounded-2xl p-7 border transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] ${
                  i % 3 === 0
                    ? 'bg-sprouttie-mint border-sprouttie-green-light'
                    : i % 3 === 1
                    ? 'bg-white border-[hsl(var(--border))]'
                    : 'bg-sprouttie-coral-light/30 border-sprouttie-coral-light'
                }`}
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display text-lg text-sprouttie-ink mb-2">{f.title}</h3>
                <p className="font-body text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials — Editorial pull-quote style */}
      <section className="py-20 sm:py-28 px-4 bg-sprouttie-ink">
        <div className="max-w-6xl mx-auto">
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="font-body text-sm font-semibold tracking-widest uppercase text-sprouttie-coral mb-3"
          >
            From our community
          </motion.p>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="font-display text-4xl sm:text-5xl text-white mb-16"
          >
            What parents say
          </motion.h2>

          <div className="grid sm:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <motion.blockquote
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="border-l-4 border-sprouttie-coral pl-6"
              >
                <p className="font-body text-white/80 leading-relaxed mb-6">"{t.quote}"</p>
                <footer>
                  <div className="font-body font-semibold text-white text-sm">{t.author}</div>
                  <div className="font-body text-xs text-white/50">{t.role}</div>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — Bold editorial */}
      <section className="py-24 sm:py-32 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sprouttie-mint via-sprouttie-cream to-sprouttie-coral-light/20 -z-10" />
        
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="font-display text-4xl sm:text-6xl text-sprouttie-ink mb-6 leading-tight">
            Ready to grow their{' '}
            <span className="italic text-sprouttie-green">vocabulary?</span>
          </h2>
          <p className="font-body text-lg text-[hsl(var(--muted-foreground))] mb-10 max-w-lg mx-auto">
            Join hundreds of parents building a bilingual future — one card at a time.
          </p>
          <Link
            to="/signup"
            className="font-body inline-block px-10 py-4 rounded-xl text-white font-semibold text-lg bg-sprouttie-green hover:bg-sprouttie-green-dark transition-all duration-300 shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-editorial)] hover:-translate-y-0.5"
          >
            Get Started Free
          </Link>
        </motion.div>
      </section>

      {/* Footer — Clean editorial */}
      <footer className="border-t border-[hsl(var(--border))] py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-body text-sm text-[hsl(var(--muted-foreground))]">
            © {new Date().getFullYear()} Sprouttie. All rights reserved.
          </span>
          <div className="flex gap-8">
            <Link to="/terms" className="font-body text-sm text-[hsl(var(--muted-foreground))] hover:text-sprouttie-ink transition-colors">Terms</Link>
            <Link to="/privacy" className="font-body text-sm text-[hsl(var(--muted-foreground))] hover:text-sprouttie-ink transition-colors">Privacy</Link>
            <Link to="/support" className="font-body text-sm text-[hsl(var(--muted-foreground))] hover:text-sprouttie-ink transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
