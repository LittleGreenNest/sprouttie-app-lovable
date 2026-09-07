import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const PLAN_UNLOCKS = {
  print: [
    { icon: '♾️', title: 'Unlimited Flashcards', description: 'Create as many cards as your little one needs. No cap.' },
    { icon: '📄', title: 'Printable PDF Flashcards', description: 'Export beautiful A4-ready flashcard sheets to print at home.' },
    { icon: '📁', title: 'Multiple Export Formats', description: 'Choose from different layouts and sizes for offline learning.' },
  ],
  pro: [
    { icon: '♾️', title: 'Unlimited Flashcards', description: 'No limits on cards or sets.' },
    { icon: '📄', title: 'PDF Export', description: 'Print beautiful flashcard PDFs.' },
    { icon: '🤖', title: 'AI Story Generation', description: 'Create unlimited personalised stories.' },
    { icon: '🎤', title: 'Voice Training', description: 'Practice pronunciation with audio guidance.' },
    { icon: '👨‍👩‍👧‍👦', title: 'Multi-Child Profiles', description: 'Manage learning for your whole family.' },
  ],
};

const PLAN_NAMES = { print: 'Print Plan', pro: 'Pro Sprout' };

export default function UpgradeSuccess() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'print';
  const planName = PLAN_NAMES[plan] || 'Print Plan';
  const unlocks = PLAN_UNLOCKS[plan] || PLAN_UNLOCKS.print;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--sprouttie-cream))] via-white to-[hsl(var(--sprouttie-mint))] py-16 px-5 font-body">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <motion.div variants={fade} initial="hidden" animate="visible" className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[hsl(var(--sprouttie-green-light)/0.5)] mb-6 text-4xl">
            🌱
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-[hsl(var(--sprouttie-ink))] mb-3">
            You're on {planName}!
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] text-base">
            Your subscription is active. Here's what's now unlocked for you.
          </p>
        </motion.div>

        {/* Unlocked features */}
        <motion.div variants={fade} initial="hidden" animate="visible" custom={1} className="glass rounded-2xl p-7 shadow-[var(--shadow-lg)] mb-5">
          <p className="text-xs font-semibold tracking-widest uppercase text-[hsl(var(--sprouttie-green-dark))] mb-5">
            What you've unlocked
          </p>
          <div className="space-y-4">
            {unlocks.map((feature, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">{feature.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-[hsl(var(--sprouttie-ink))]">{feature.title}</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick start */}
        <motion.div variants={fade} initial="hidden" animate="visible" custom={2} className="glass rounded-2xl p-7 shadow-[var(--shadow-lg)] mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[hsl(var(--sprouttie-green-dark))] mb-5">
            Where to start
          </p>
          <div className="space-y-4">
            {[
              { step: '1', text: 'Go to Cards and create or upload your flashcard sets' },
              { step: '2', text: 'Head to Print to export your first PDF, ready to print at home' },
              { step: '3', text: 'Run your first flash session with your child from the Dashboard' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(var(--sprouttie-green-light)/0.6)] flex items-center justify-center text-xs font-bold text-[hsl(var(--sprouttie-green-dark))]">
                  {step}
                </span>
                <p className="text-sm text-[hsl(var(--foreground))] mt-0.5">{text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div variants={fade} initial="hidden" animate="visible" custom={3} className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/print"
            className="flex-1 py-3 px-6 rounded-xl bg-[hsl(var(--sprouttie-green))] hover:bg-[hsl(var(--sprouttie-green-dark))] text-white font-semibold text-sm text-center transition-all duration-250 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-px"
          >
            Print My First PDF →
          </Link>
          <Link
            to="/dashboard"
            className="flex-1 py-3 px-6 rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--sprouttie-ink))] font-semibold text-sm text-center glass hover:bg-white/80 transition-all duration-250"
          >
            Go to Dashboard
          </Link>
        </motion.div>

        <motion.p variants={fade} initial="hidden" animate="visible" custom={4} className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-8">
          Questions? <Link to="/support" className="text-[hsl(var(--sprouttie-green-dark))] hover:underline">Visit support</Link> or email us anytime.
        </motion.p>

      </div>
    </div>
  );
}
