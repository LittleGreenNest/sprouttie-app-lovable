import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Layers, 
  Globe2, 
  Users,
  Sparkles,
  MessageCircle,
  Heart,
  Languages,
  BookOpen,
  Smile,
  Printer,
  Zap,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import WaitlistForm from '@/components/WaitlistForm';

const Landing = () => {
  const [showWaitlist, setShowWaitlist] = useState(false);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/sprouttie-mascot.png" 
              alt="Sprouttie" 
              className="h-8 w-8"
            />
            <span className="text-lg font-semibold text-gray-800">Sprouttie</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-sprouttie-green-dark transition-colors">Get the free app</a>
            <Link to="/about" className="hover:text-sprouttie-green-dark transition-colors">About Sprouttie</Link>
            <Link to="/print" className="hover:text-sprouttie-green-dark transition-colors">Print</Link>
            <a href="#insights" className="hover:text-sprouttie-green-dark transition-colors">Insights</a>
            <a href="#books" className="hover:text-sprouttie-green-dark transition-colors">Booklist</a>
          </div>
          <Link
            to="/signup"
            className="bg-sprouttie-green hover:bg-sprouttie-green-dark text-white px-5 py-2 rounded-lg font-medium text-sm transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 sm:px-6 bg-gradient-to-b from-sprouttie-mint/30 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeInUp}>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
                Printable<br />
                Flashcards for<br />
                <span className="text-sprouttie-green">Modern Families</span>
              </h1>
              
              <p className="text-gray-600 mb-4 leading-relaxed">
                Sprouttie makes it easy to create and print flashcards in any Latin-based language, plus Chinese with Hanyu Pinyin or Jyutping pronunciation guides.
              </p>
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                Practice pronunciation, teach confidently, and watch curiosity bloom — one card at a time.
              </p>
              
              <div className="flex flex-wrap gap-3 mb-8">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 bg-sprouttie-green hover:bg-sprouttie-green-dark text-white px-6 py-3 rounded-lg font-medium transition-all"
                >
                  Start Free
                </Link>
                <button 
                  onClick={() => setShowWaitlist(true)}
                  className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium border border-gray-200 transition-all"
                >
                  See How It Works
                </button>
              </div>

              <div className="inline-flex items-center gap-3 bg-sprouttie-mint/50 px-4 py-2 rounded-full text-sm text-gray-600">
                <span>Custom words, multiple languages</span>
                <span className="text-gray-400">•</span>
                <span>your cards, your way!</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex justify-center relative"
            >
              {/* Decorative background circles */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-72 sm:w-96 h-72 sm:h-96 bg-sprouttie-green-light/30 rounded-full animate-pulse-glow" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-56 sm:w-72 h-56 sm:h-72 bg-sprouttie-mint/50 rounded-full" />
              </div>
              
              {/* Mascot */}
              <img 
                src="/images/sprouttie-mascot.png" 
                alt="Sprouttie Mascot"
                className="relative z-10 w-72 sm:w-96 lg:w-[28rem] drop-shadow-2xl animate-bounce-leaf"
              />
              
              {/* Floating decorative elements */}
              <motion.div 
                className="absolute top-4 right-4 sm:top-8 sm:right-8 bg-white rounded-xl p-3 shadow-lg border border-sprouttie-green/10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <span className="text-2xl">🌱</span>
              </motion.div>
              
              <motion.div 
                className="absolute bottom-8 left-0 sm:bottom-12 sm:left-4 bg-white rounded-xl p-3 shadow-lg border border-sprouttie-green/10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <span className="text-2xl">✨</span>
              </motion.div>
              
              <motion.div 
                className="absolute top-1/2 -right-2 sm:right-0 bg-sprouttie-coral-light text-sprouttie-coral-dark rounded-full px-3 py-1.5 text-xs font-medium shadow-md"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
              >
                Fun & Easy!
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Create, Print, and Teach Section */}
      <section className="py-20 px-4 sm:px-6" id="features">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">🌱</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Create, Print, and Teach — All in One Place
              </h2>
            </div>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Sprouttie helps parents make language learning simple and screen-free. Whether you're printing English sight words or Cantonese family phrases, everything you need is just a few clicks away.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Layers,
                title: 'Custom Flashcard Creator',
                description: 'Type in any word or phrase. Sprouttie instantly generates your print-able PDF cards in any.',
                color: 'bg-sprouttie-mint',
                iconColor: 'text-sprouttie-green-dark'
              },
              {
                icon: Globe2,
                title: 'Multilingual Support',
                description: 'Works with Latin-alphabet languages (English, Spanish, French, etc.) and Chinese characters with Pinyin or Jyutping.',
                color: 'bg-sprouttie-mint',
                iconColor: 'text-sprouttie-green-dark'
              },
              {
                icon: Users,
                title: 'Parent Practice Mode',
                description: 'Preview your cards and meanings before flashing — so you can teach confidently, even if you\'re still learning.',
                color: 'bg-sprouttie-mint',
                iconColor: 'text-sprouttie-green-dark'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Give Your Child Words Section */}
      <section className="py-20 px-4 sm:px-6 bg-sprouttie-mint/20">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">🌍</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Give Your Child Words That Open Worlds
              </h2>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Language learning builds more than vocabulary — it builds curiosity, empathy, and confidence.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: 'Global Readiness',
                description: 'Expose your child to multiple languages early — their brain will thank you.',
                color: 'bg-emerald-100',
                iconColor: 'text-emerald-600'
              },
              {
                icon: MessageCircle,
                title: 'Communication Skills',
                description: 'Flashcards turn words into play, building strong speaking foundations.',
                color: 'bg-amber-100',
                iconColor: 'text-amber-600'
              },
              {
                icon: Heart,
                title: 'Cultural Curiosity',
                description: 'Even simple words spark questions that connect home and the world.',
                color: 'bg-rose-100',
                iconColor: 'text-rose-500'
              }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-4`}>
                  <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Heritage Languages Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">🏮</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Keep Your Heritage Languages Alive
              </h2>
            </div>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Sprouttie started with a dream — to help parents preserve dialects like Cantonese and Hokkien while raising global kids. Whether you're fluent or learning alongside your child, every card helps keep your story alive.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Languages,
                title: 'Cantonese & Hokkien Support',
                description: 'Built-in tone pronunciation guides make complex scripts easier to teach.',
                color: 'bg-orange-100',
                iconColor: 'text-orange-500'
              },
              {
                icon: BookOpen,
                title: 'Cultural Contexts',
                description: 'Learn word facts — like family food and festivals — attached to the words you learn.',
                color: 'bg-sky-100',
                iconColor: 'text-sky-500'
              },
              {
                icon: Smile,
                title: 'Confidence for Parents',
                description: 'Practice pronunciation privately before you flash, so teaching feels natural.',
                color: 'bg-violet-100',
                iconColor: 'text-violet-500'
              }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-4`}>
                  <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5-Minute Daily System */}
      <section className="py-20 px-4 sm:px-6 bg-sprouttie-mint/20">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">⏰</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Your 5-Minute Daily Learning System
              </h2>
            </div>
            <p className="text-gray-600">
              No apps. No overwhelm. Just quick, meaningful sessions that grow with your child.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: BookOpen,
                title: 'Add Words',
                description: 'Type words in English, Spanish, French, or Chinese — all with optional Pinyin/Jyutping print cards.',
                color: 'bg-sprouttie-green-light'
              },
              {
                step: '2',
                icon: Printer,
                title: 'Print Your Deck',
                description: 'Generate a clean, double-sided PDF in print-friendly sizes (A4 or Letter) and pronunciation text!',
                color: 'bg-sprouttie-coral-light'
              },
              {
                step: '3',
                icon: Zap,
                title: 'Practice & Flash',
                description: 'Use your cards every day — morning, mealtime, or bedtime.',
                color: 'bg-amber-100'
              }
            ].map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center"
              >
                <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <step.icon className="w-8 h-8 text-gray-700" />
                </div>
                <div className="text-3xl font-bold text-sprouttie-green mb-2">{step.step}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Teach with Ease CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            {...fadeInUp}
            className="bg-gradient-to-br from-sprouttie-green-light/40 to-sprouttie-mint rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden"
          >
            <div className="absolute top-6 left-1/2 -translate-x-1/2">
              <div className="w-12 h-12 bg-sprouttie-coral-light rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-sprouttie-coral-dark" />
              </div>
            </div>
            
            <div className="pt-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Teach with Ease — Even If You're Not Fluent
              </h2>
              <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                Sprouttie is built for real parents — whether you speak the language or are rediscovering it. It's your pocket-friendly, screen-free way to raise curious, confident kids.
              </p>
              
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-sprouttie-green hover:bg-sprouttie-green-dark text-white px-8 py-4 rounded-lg font-medium transition-all"
              >
                Start Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Testimonial */}
            <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto shadow-sm">
              <p className="text-gray-700 italic mb-4">
                "I use Sprouttie to teach my son English and Mandarin. He loves the pictures — and I'm learning pronunciation too!"
              </p>
              <p className="text-sm text-gray-500">— Rina, Singapore</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The Sprouttie Promise */}
      <section className="py-20 px-4 sm:px-6 bg-sprouttie-green-dark text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeInUp}>
            <img 
              src="/images/sprouttie-mascot.png" 
              alt="Sprouttie Mascot"
              className="w-24 h-24 mx-auto mb-6 drop-shadow-lg"
            />
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">🌱</span>
              <h2 className="text-3xl sm:text-4xl font-bold">
                The Sprouttie Promise
              </h2>
            </div>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              Sprouttie helps families grow both wings and roots — nurturing curiosity for the world while keeping hearts connected to home.
            </p>
            
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-white text-sprouttie-green-dark px-8 py-4 rounded-lg font-medium hover:bg-sprouttie-cream transition-all"
            >
              Get Started Free
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 bg-sprouttie-green-dark border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/60">
          <p>© {new Date().getFullYear()} Sprouttie. Made with 💚 for little learners.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <a href="mailto:hello@sprouttie.com" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Waitlist Modal */}
      {showWaitlist && <WaitlistForm onClose={() => setShowWaitlist(false)} />}
    </div>
  );
};

export default Landing;
