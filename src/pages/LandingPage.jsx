import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
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
    desc: "Watch your child's vocabulary grow in a pressure-free visual garden — no scores, no ranks.",
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
    desc: "AI-powered book suggestions matched to your child's current vocabulary level.",
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
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--sprouttie-cream))] via-white to-[hsl(var(--sprouttie-mint))]">
      {/* Hero */}
      <section className="relative overflow-hidden px-5 pt-14 pb-20 sm:pt-20 sm:pb-28">
        {/* Soft gradient orb */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[hsl(var(--sprouttie-green-light)/0.4)] blur-[100px] -z-10" />
        <div className="absolute bottom-0 left-[-10%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--sprouttie-coral-light)/0.3)] blur-[100px] -z-10" />

        <div className="max-w-5xl mx-auto grid sm:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <motion.div variants={fade} initial="hidden" animate="visible" custom={0} className="inline-block mb-5">
              <span className="font-body text-xs font-semibold tracking-widest uppercase text-[hsl(var(--sprouttie-coral-dark))] bg-[hsl(var(--sprouttie-coral-light)/0.5)] px-3.5 py-1.5 rounded-full backdrop-blur-sm border border-[hsl(var(--sprouttie-coral-light))]">
                For parents who flash
              </span>
            </motion.div>

            <motion.h1
              variants={fade}
              initial="hidden"
              animate="visible"
              custom={1}
              className="font-display text-4xl sm:text-6xl leading-[1.08] text-[hsl(var(--sprouttie-ink))] mb-5"
            >
              Teach your child Mandarin
              <span className="block text-[hsl(var(--sprouttie-coral-dark))] italic">without the pressure.</span>
            </motion.h1>

            <motion.p
              variants={fade}
              initial="hidden"
              animate="visible"
              custom={2}
              className="font-body text-base sm:text-lg text-[hsl(var(--muted-foreground))] max-w-md mb-8 leading-relaxed"
            >
              A flashcard tracking system for parents using the Glenn Doman method.
              Log sessions, plan weekly words, and watch vocabulary grow — at their own pace.
            </motion.p>

            <motion.div variants={fade} initial="hidden" animate="visible" custom={3} className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/signup"
                className="font-body inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-white font-semibold bg-[hsl(var(--sprouttie-green))] hover:bg-[hsl(var(--sprouttie-green-dark))] transition-all duration-250 shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-xl)] hover:-translate-y-px"
              >
                Start Free — No Card Required
              </Link>
              <Link
                to="/login"
                className="font-body inline-flex items-center justify-center px-7 py-3.5 rounded-xl font-semibold border border-[hsl(var(--border))] text-[hsl(var(--sprouttie-green-dark))] glass hover:bg-white/80 transition-all duration-250"
              >
                Sign In
              </Link>
            </motion.div>

            <motion.p
              variants={fade}
              initial="hidden"
              animate="visible"
              custom={4}
              className="mt-5 font-body text-xs text-[hsl(var(--muted-foreground))]"
            >
              Used by 100+ parents teaching Mandarin at home
            </motion.p>
          </div>

          <motion.div variants={fade} initial="hidden" animate="visible" custom={2} className="flex justify-center sm:justify-end">
            <img
              src="/images/sprouttie-mascot.png"
              alt="Sprouttie mascot"
              className="h-44 sm:h-56 drop-shadow-lg"
            />
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.p variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="font-body text-xs font-semibold tracking-widest uppercase text-[hsl(var(--sprouttie-coral-dark))] mb-2">
            How it works
          </motion.p>
          <motion.h2 variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
            className="font-display text-3xl sm:text-4xl text-[hsl(var(--sprouttie-ink))] mb-12">
            Three steps to a <span className="italic text-[hsl(var(--sprouttie-green))]">joyful</span> bilingual routine
          </motion.h2>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'Add Flashcards', desc: 'Create or import your word sets — English, Mandarin, or both.' },
              { step: '02', title: 'Flash & Log', desc: 'Show cards to your child and log each session with one tap.' },
              { step: '03', title: 'Watch Growth', desc: 'Track progress in a calm Learning Garden with no pressure.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                variants={fade}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="glass rounded-2xl p-6 hover:shadow-[var(--shadow-lg)] transition-all duration-250"
              >
                <span className="font-display text-4xl text-[hsl(var(--sprouttie-green-light))]">{item.step}</span>
                <h3 className="font-display text-lg text-[hsl(var(--sprouttie-ink))] mt-3 mb-1.5">{item.title}</h3>
                <p className="font-body text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.p variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="font-body text-xs font-semibold tracking-widest uppercase text-[hsl(var(--sprouttie-coral-dark))] mb-2">
            Features
          </motion.p>
          <motion.h2 variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
            className="font-display text-3xl sm:text-4xl text-[hsl(var(--sprouttie-ink))] mb-12">
            Everything you need, <br className="hidden sm:block" />
            <span className="italic text-[hsl(var(--sprouttie-coral-dark))]">nothing you don't.</span>
          </motion.h2>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fade}
                className="glass rounded-2xl p-6 hover:shadow-[var(--shadow-lg)] hover:-translate-y-px transition-all duration-250"
              >
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--sprouttie-mint))] flex items-center justify-center text-xl mb-4">{f.icon}</div>
                <h3 className="font-display text-base text-[hsl(var(--sprouttie-ink))] mb-1.5">{f.title}</h3>
                <p className="font-body text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials — Dark section */}
      <section className="py-16 sm:py-24 px-5 bg-[hsl(var(--sprouttie-ink))] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(var(--sprouttie-green)/0.08)] blur-[80px]" />
        <div className="max-w-5xl mx-auto relative">
          <motion.p variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="font-body text-xs font-semibold tracking-widest uppercase text-[hsl(var(--sprouttie-coral))] mb-2">
            From our community
          </motion.p>
          <motion.h2 variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
            className="font-display text-3xl sm:text-4xl text-white mb-12">
            What parents say
          </motion.h2>

          <div className="grid sm:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.blockquote
                key={i}
                variants={fade}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="rounded-2xl p-6 bg-white/[0.06] backdrop-blur-sm border border-white/[0.08]"
              >
                <p className="font-body text-sm text-white/75 leading-relaxed mb-5">"{t.quote}"</p>
                <footer>
                  <div className="font-body font-semibold text-white text-sm">{t.author}</div>
                  <div className="font-body text-xs text-white/40">{t.role}</div>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--sprouttie-mint))] via-white to-[hsl(var(--sprouttie-coral-light)/0.15)] -z-10" />
        
        <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-5xl text-[hsl(var(--sprouttie-ink))] mb-5 leading-tight">
            Ready to grow their{' '}
            <span className="italic text-[hsl(var(--sprouttie-green))]">vocabulary?</span>
          </h2>
          <p className="font-body text-base text-[hsl(var(--muted-foreground))] mb-8 max-w-md mx-auto">
            Join hundreds of parents building a bilingual future — one card at a time.
          </p>
          <Link
            to="/signup"
            className="font-body inline-block px-8 py-3.5 rounded-xl text-white font-semibold bg-[hsl(var(--sprouttie-green))] hover:bg-[hsl(var(--sprouttie-green-dark))] transition-all duration-250 shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-xl)] hover:-translate-y-px"
          >
            Get Started Free
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-body text-xs text-[hsl(var(--muted-foreground))]">
            © {new Date().getFullYear()} Sprouttie. All rights reserved.
          </span>
          <div className="flex gap-6">
            <Link to="/terms" className="font-body text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--sprouttie-ink))] transition-colors">Terms</Link>
            <Link to="/privacy" className="font-body text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--sprouttie-ink))] transition-colors">Privacy</Link>
            <Link to="/support" className="font-body text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--sprouttie-ink))] transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
