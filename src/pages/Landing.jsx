import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Brain, 
  Calendar, 
  TrendingUp, 
  BookOpen, 
  Volume2,
  CheckCircle,
  Star,
  ArrowRight,
  Play,
  Leaf,
  Heart,
  Clock,
  Users
} from 'lucide-react';
import WaitlistForm from '@/components/WaitlistForm';

const Landing = () => {
  const [showWaitlist, setShowWaitlist] = useState(false);

  const features = [
    {
      icon: Brain,
      title: 'Smart Flashcard System',
      description: 'Research-backed spaced repetition adapted for young learners. Track progress effortlessly.',
    },
    {
      icon: Calendar,
      title: 'Daily Tracking',
      description: 'Simple daily check-ins to build consistent learning habits that stick.',
    },
    {
      icon: TrendingUp,
      title: 'Visual Progress Garden',
      description: 'Watch your child\'s vocabulary bloom with our beautiful garden visualization.',
    },
    {
      icon: Volume2,
      title: 'Native Pronunciation',
      description: 'Accurate pinyin and audio guides for perfect Mandarin pronunciation.',
    },
    {
      icon: BookOpen,
      title: 'Book Recommendations',
      description: 'AI-powered book suggestions matched to your child\'s vocabulary level.',
    },
    {
      icon: Sparkles,
      title: 'Gamified Learning',
      description: 'Bingo cards, milestones, and celebrations keep kids motivated.',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah M.',
      role: 'Mom of 2',
      quote: 'My 3-year-old now recognizes over 200 Chinese words! The visual tracking keeps us both motivated.',
      avatar: '👩‍👧',
    },
    {
      name: 'David L.',
      role: 'Stay-at-home Dad',
      quote: 'Finally, a flashcard app that understands toddlers. The garden feature is genius!',
      avatar: '👨‍👦',
    },
    {
      name: 'Michelle T.',
      role: 'Bilingual Parent',
      quote: 'The pronunciation guides helped me teach words I wasn\'t confident pronouncing myself.',
      avatar: '👩‍👧‍👦',
    },
  ];

  const stats = [
    { value: '1000+', label: 'Happy Families' },
    { value: '50K+', label: 'Words Learned' },
    { value: '97%', label: 'Parent Satisfaction' },
    { value: '15 min', label: 'Daily Commitment' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sprouttie-mint via-sprouttie-cream to-sprouttie-beige overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-sprouttie-green/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/sprouttie-mascot.png" 
              alt="Sprouttie" 
              className="h-10 w-10"
            />
            <span className="text-xl font-bold text-sprouttie-green-dark">Sprouttie</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="text-sprouttie-green-dark hover:text-sprouttie-green font-medium transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="bg-sprouttie-green hover:bg-sprouttie-green-dark text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-sprouttie-coral-light px-4 py-2 rounded-full mb-6">
                <Leaf className="w-4 h-4 text-sprouttie-coral-dark" />
                <span className="text-sm font-medium text-sprouttie-coral-dark">Trusted by 1000+ families</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-sprouttie-green-dark leading-tight mb-6">
                Grow Your Child's
                <span className="block text-sprouttie-coral"> Chinese Vocabulary</span>
              </h1>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                The joyful flashcard system designed for busy parents teaching Mandarin to little ones. 
                Track progress, celebrate milestones, and watch their vocabulary bloom.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-sprouttie-green hover:bg-sprouttie-green-dark text-white px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button 
                  onClick={() => setShowWaitlist(true)}
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-sprouttie-beige text-sprouttie-green-dark px-8 py-4 rounded-full font-semibold text-lg border-2 border-sprouttie-green/20 transition-all"
                >
                  <Play className="w-5 h-5" />
                  Watch Demo
                </button>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-sprouttie-green" />
                  <span>Free to start</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-sprouttie-green" />
                  <span>No credit card</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-white rounded-3xl shadow-2xl p-6 border border-sprouttie-green/10">
                <img 
                  src="/images/sprouttie-mascot.png" 
                  alt="Sprouttie App Preview"
                  className="w-full max-w-md mx-auto"
                />
                <div className="absolute -bottom-4 -right-4 bg-sprouttie-coral text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce-leaf">
                  🌱 100+ words this month!
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-6 -left-6 bg-white rounded-2xl p-4 shadow-lg border border-sprouttie-green/10 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sprouttie-green-light rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-sprouttie-green-dark" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">7-day streak</p>
                    <p className="font-bold text-sprouttie-green-dark">🔥 Amazing!</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl font-bold text-sprouttie-green-dark mb-2">{stat.value}</p>
                <p className="text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-sprouttie-green-dark mb-4">
              Everything You Need to Teach Mandarin
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built by parents, for parents. Simple tools that make language learning a joy, not a chore.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-sprouttie-green/10 hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-sprouttie-green-light to-sprouttie-mint rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-sprouttie-green-dark" />
                </div>
                <h3 className="text-xl font-semibold text-sprouttie-green-dark mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-sprouttie-green-light/30 to-sprouttie-coral-light/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-sprouttie-green-dark mb-4">
              Simple as 1-2-3
            </h2>
            <p className="text-lg text-gray-600">Get started in minutes, not hours.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Add Your Words', description: 'Import or type the words you want to teach. We support pinyin and traditional/simplified characters.', icon: BookOpen },
              { step: '2', title: 'Flash Daily', description: 'Spend just 15 minutes a day showing cards. Our tracker makes it easy to stay consistent.', icon: Clock },
              { step: '3', title: 'Watch Them Grow', description: 'Track progress with our visual garden. Celebrate milestones together!', icon: Heart },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                viewport={{ once: true }}
                className="relative bg-white rounded-2xl p-8 shadow-lg text-center"
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-sprouttie-coral text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                  {item.step}
                </div>
                <item.icon className="w-12 h-12 text-sprouttie-green mx-auto mb-4 mt-4" />
                <h3 className="text-xl font-semibold text-sprouttie-green-dark mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-sprouttie-green-dark mb-4">
              Loved by Parents Everywhere
            </h2>
            <p className="text-lg text-gray-600">Join thousands of families already growing with Sprouttie.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-sprouttie-green/10"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sprouttie-beige rounded-full flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sprouttie-green-dark">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-sprouttie-green to-sprouttie-green-dark rounded-3xl p-10 sm:p-16 text-center text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-20 h-20 border-2 border-white rounded-full" />
              <div className="absolute bottom-10 right-10 w-32 h-32 border-2 border-white rounded-full" />
              <div className="absolute top-1/2 left-1/4 w-16 h-16 border-2 border-white rounded-full" />
            </div>
            
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Start Your Child's Language Journey?
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
                Join thousands of parents who are making Mandarin learning fun and effective for their little ones.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-white text-sprouttie-green-dark px-8 py-4 rounded-full font-semibold text-lg hover:bg-sprouttie-cream transition-all shadow-lg"
                >
                  Start Free Today
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => setShowWaitlist(true)}
                  className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-all"
                >
                  <Users className="w-5 h-5" />
                  Join Waitlist
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 bg-sprouttie-green-dark text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/images/sprouttie-mascot.png" 
                  alt="Sprouttie" 
                  className="h-10 w-10 bg-white rounded-full p-1"
                />
                <span className="text-xl font-bold">Sprouttie</span>
              </div>
              <p className="text-white/70 text-sm">
                Helping parents teach Mandarin to their little ones, one word at a time.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><Link to="/signup" className="hover:text-white transition-colors">Get Started</Link></li>
                <li><Link to="/plans" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="mailto:hello@sprouttie.com" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 pt-8 text-center text-white/50 text-sm">
            <p>© {new Date().getFullYear()} Sprouttie. Made with 💚 for little learners everywhere.</p>
          </div>
        </div>
      </footer>

      {/* Waitlist Modal */}
      {showWaitlist && <WaitlistForm onClose={() => setShowWaitlist(false)} />}
    </div>
  );
};

export default Landing;
