import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const PhoneMockup = () => (
  <div style={{
    width: 220, flexShrink: 0,
    background: '#111', borderRadius: 36, padding: 3,
    boxShadow: '0 32px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.08)',
  }}>
    {/* Screen */}
    <div style={{ background: '#fff', borderRadius: 33, overflow: 'hidden', position: 'relative' }}>
      {/* Dynamic island */}
      <div style={{ background: '#111', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 72, height: 14, background: '#000', borderRadius: 9 }} />
      </div>

      {/* Navbar */}
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '0.5px solid #F3F4F6' }}>
        <div style={{ width: 20, height: 20, background: '#D1FAE5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🌱</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', fontFamily: 'DM Serif Display, serif' }}>Sprouttie</span>
      </div>

      {/* Dashboard content */}
      <div style={{ padding: '10px 10px 0', fontSize: 10 }}>
        {/* Greeting */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, color: '#111827', fontSize: 11 }}>Hi Sarah 👋</div>
          <div style={{ color: '#9CA3AF', fontSize: 9 }}>Thursday · May 8</div>
        </div>

        {/* Today's Focus */}
        <div style={{ background: '#2D6A4F', borderRadius: 10, padding: '8px 10px', marginBottom: 6 }}>
          <div style={{ fontSize: 7, fontWeight: 600, letterSpacing: '0.06em', color: '#95D5B2', textTransform: 'uppercase', marginBottom: 5 }}>Today's Focus</div>
          {[
            'Animals · 12 words due',
            'Last session: today ✓',
            '2 / 3 rounds done',
          ].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#95D5B2', flexShrink: 0 }} />
              <span style={{ fontSize: 8, color: '#D8F3DC' }}>{t}</span>
            </div>
          ))}
          <div style={{ marginTop: 6, background: '#52B788', borderRadius: 6, padding: '5px 0', textAlign: 'center', fontSize: 8, fontWeight: 600, color: '#fff' }}>
            Start Flashcard Session
          </div>
        </div>

        {/* Words card */}
        <div style={{ border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '7px 8px', marginBottom: 6 }}>
          <div style={{ fontSize: 8, fontWeight: 500, color: '#1F2937', marginBottom: 5 }}>Mia's words this month</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['8','sprouting','#F0FDF4','#2D6A4F'],['14','growing','#FFFBEB','#92400E'],['32','owned','#F0FDF4','#065F46']].map(([n,l,bg,c]) => (
              <div key={l} style={{ flex: 1, background: bg, borderRadius: 6, padding: '4px 2px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: c, lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 7, color: '#6B7280', marginTop: 1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Flashcard sets */}
        <div style={{ border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '7px 8px', marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 8, fontWeight: 500, color: '#1F2937' }}>Flashcard sets</span>
            <span style={{ fontSize: 7, color: '#9CA3AF' }}>46 flashed</span>
          </div>
          {[['Animals','#7B61FF',78],['Colours','#F59E0B',52],['Body Parts','#3B82F6',33]].map(([name, col, pct]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: col, fontSize: 6, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>
                {name[0]}
              </div>
              <div style={{ flex: 1, height: 3, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#52B788' }} />
              </div>
              <span style={{ fontSize: 7, color: '#9CA3AF', minWidth: 16, textAlign: 'right' }}>{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tab bar */}
      <div style={{ borderTop: '0.5px solid #F3F4F6', padding: '6px 0 10px', display: 'flex', justifyContent: 'space-around' }}>
        {[['🏠','Home',true],['📋','Log',false],['💬','Words',false],['🃏','Cards',false]].map(([icon,label,active]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12 }}>{icon}</div>
            <div style={{ fontSize: 7, color: active ? '#2D6A4F' : '#9CA3AF', fontWeight: active ? 600 : 400 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

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

          <motion.div variants={fade} initial="hidden" animate="visible" custom={2} className="flex justify-center sm:justify-end items-start relative">
            {/* Mascot floating behind the phone */}
            <img
              src="/images/sprouttie-mascot.png"
              alt=""
              aria-hidden="true"
              className="absolute -top-6 -right-4 h-16 drop-shadow-md opacity-90 -scale-x-100 hidden sm:block"
            />
            <PhoneMockup />
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

      {/* Testimonial — Dark section */}
      <section className="py-16 sm:py-24 px-5 bg-[hsl(var(--sprouttie-ink))] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(var(--sprouttie-green)/0.08)] blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[hsl(var(--sprouttie-coral)/0.05)] blur-[80px]" />
        <div className="max-w-3xl mx-auto relative text-center">
          <motion.p variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="font-body text-xs font-semibold tracking-widest uppercase text-[hsl(var(--sprouttie-coral))] mb-10">
            From our community
          </motion.p>
          <motion.blockquote
            variants={fade}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
          >
            <div className="text-[hsl(var(--sprouttie-green))] text-5xl font-display leading-none mb-4 opacity-60">"</div>
            <p className="font-display text-xl sm:text-2xl text-white leading-relaxed mb-8 italic">
              Sprouttie has helped me effectively plan flashcard sessions for my kids and keep track of everything better. It is also a great way to introduce Chinese words to them!
            </p>
            <footer className="flex items-center justify-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[hsl(var(--sprouttie-green)/0.3)] flex items-center justify-center text-sm font-semibold text-[hsl(var(--sprouttie-green))]">
                C
              </div>
              <div className="text-left">
                <div className="font-body font-semibold text-white text-sm">Cyrena C.</div>
                <div className="font-body text-xs text-white/40">Parent of 2 · Singapore</div>
              </div>
            </footer>
          </motion.blockquote>
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
