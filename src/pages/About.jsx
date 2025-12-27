import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sprout, Heart, Zap, Globe2, Users, RefreshCw } from 'lucide-react';

const About = () => {
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
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/images/sprouttie-mascot.png" 
              alt="Sprouttie" 
              className="h-8 w-8"
            />
            <span className="text-lg font-semibold text-gray-800">Sprouttie</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-sprouttie-green-dark transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-6 bg-gradient-to-b from-sprouttie-mint/30 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...fadeInUp}>
            <span className="text-5xl mb-6 block">🌱</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              About Sprouttie
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Intro */}
          <motion.div {...fadeInUp} className="mb-12">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Sprouttie was created for parents who care deeply about their children's learning, and want the learning process to be fun.
            </p>
            
            <p className="text-gray-700 mb-4">They want their kids to:</p>
            <ul className="space-y-2 mb-8">
              {[
                'enjoy reading and learning',
                'build strong language foundations',
                'grow up curious, confident, and capable'
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-gray-700">
                  <span className="w-2 h-2 bg-sprouttie-green rounded-full flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* The Problem */}
          <motion.div {...fadeInUp} className="mb-12 bg-gray-50 rounded-2xl p-6 sm:p-8">
            <p className="text-gray-700 mb-4">
              Modern parents are juggling work, caregiving, and multigenerational households. Learning routines often break down because of:
            </p>
            <ul className="space-y-3">
              {[
                { text: 'Decision fatigue', detail: '"What should I teach today?"' },
                { text: 'Guilt when days are missed', detail: null },
                { text: 'Overly complex apps and methods', detail: null },
                { text: 'Tools that demand screen time or constant setup', detail: null }
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-gray-700">
                  <span className="text-sprouttie-coral mt-1">•</span>
                  <span>
                    {item.text}
                    {item.detail && <span className="text-gray-500 italic"> ({item.detail})</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sprouttie-green-dark font-semibold text-lg">
              Sprouttie exists to remove that friction.
            </p>
          </motion.div>

          {/* What Sprouttie Does Differently */}
          <motion.div {...fadeInUp} className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What Sprouttie does differently</h2>
            <p className="text-gray-700 mb-6">
              Sprouttie is a simple flashcard generation system (and more) that helps parents show up more often, with less effort.
            </p>
            <p className="text-gray-700 mb-6">
              Instead of overwhelming you with methods or content, Sprouttie focuses on:
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Zap, title: 'Speed', desc: 'Generate flashcards in minutes' },
                { icon: Sprout, title: 'Clarity', desc: "Clean, printable layouts that don't distract" },
                { icon: RefreshCw, title: 'Flexibility', desc: 'Use it your way, at your pace' },
                { icon: Globe2, title: 'Multilingual support', desc: 'English, Mandarin, Cantonese, Hokkien and more' }
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-sprouttie-mint/30 rounded-xl">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-sprouttie-green-dark" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Asian Households */}
          <motion.div {...fadeInUp} className="mb-12 bg-amber-50 rounded-2xl p-6 sm:p-8">
            <p className="text-gray-700 mb-4">
              Sprouttie was designed with Asian households in mind, where:
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-3 text-gray-700">
                <span className="text-amber-500">•</span>
                Multiple languages are spoken
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <span className="text-amber-500">•</span>
                Grandparents (usually Boomers) may be involved in caregiving
              </li>
            </ul>
            <p className="text-gray-700">
              Whether you flash cards for 2 minutes or 10, once a day or once every 2 days — Sprouttie works with real life, not against it.
            </p>
          </motion.div>

          {/* Not About Pressure */}
          <motion.div {...fadeInUp} className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Not about pressure. About momentum.</h2>
            <p className="text-gray-700 mb-4">Sprouttie is about:</p>
            <ul className="space-y-3">
              {[
                'Making learning feel normal, not stressful',
                'Helping parents restart easily after breaks',
                'Turning good intentions into gentle habits'
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-gray-700">
                  <Heart className="w-5 h-5 text-sprouttie-coral flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Why the Name */}
          <motion.div {...fadeInUp} className="mb-12 bg-sprouttie-mint/40 rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why the name "Sprouttie"?</h2>
            <blockquote className="border-l-4 border-sprouttie-green pl-4 italic text-gray-700 mb-4">
              A sprout doesn't grow because it's pushed.<br />
              It grows because the environment allows it to.
            </blockquote>
            <p className="text-gray-700">
              Sprouttie is about creating those small, supportive conditions — where learning can quietly take root and grow over time.
            </p>
          </motion.div>

          {/* Closing */}
          <motion.div {...fadeInUp} className="text-center py-8">
            <p className="text-lg text-gray-700 mb-4">
              Sprouttie is here to help you stay consistent, without burning out.
            </p>
            <p className="text-xl font-semibold text-sprouttie-green-dark mb-6">
              Simple tools. Gentle systems. Real-life learning. 🌱
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-sprouttie-green hover:bg-sprouttie-green-dark text-white px-8 py-3 rounded-lg font-medium transition-all"
            >
              Get Started Free
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Sprouttie. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default About;
