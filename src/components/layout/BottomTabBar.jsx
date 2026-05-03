import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, MessageCircle, Layers, MoreHorizontal, X, ScanText, CalendarRange, Clock, BookOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const TABS = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'daily-tracking', label: 'Log', icon: CalendarCheck },
  { id: 'words-said', label: 'Words Said', icon: MessageCircle },
  { id: 'cards', label: 'Cards', icon: Layers },
  { id: 'more', label: 'Explore', icon: MoreHorizontal },
];

const MORE_ITEMS = [
  { id: 'scan-flashcards', label: 'Scan Words', icon: ScanText },
  { id: 'word-planner', label: 'Word Planner', icon: CalendarRange },
  { id: 'flashed-history', label: 'History', icon: Clock },
  { id: 'book-recommendations', label: 'Books', icon: BookOpen },
];

const TabButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 flex flex-col items-center gap-1 py-2 relative transition-all duration-200"
  >
    <div className={`relative flex items-center justify-center w-10 h-8 rounded-2xl transition-all duration-300 ${
      active 
        ? 'bg-[hsl(var(--sprouttie-green)/0.15)]' 
        : ''
    }`}>
      <Icon className={`w-[22px] h-[22px] transition-all duration-200 ${
        active 
          ? 'text-[hsl(var(--sprouttie-green-dark))] stroke-[2.2]' 
          : 'text-slate-400 stroke-[1.8]'
      }`} />
    </div>
    <span className={`text-[11px] leading-none transition-colors duration-200 ${
      active 
        ? 'text-[hsl(var(--sprouttie-green-dark))] font-semibold' 
        : 'text-slate-400 font-medium'
    }`}>
      {label}
    </span>
  </button>
);

const BottomTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const currentPath = location.pathname.replace('/', '');

  const handleNav = (id) => {
    if (id === 'more') {
      setMoreOpen(prev => !prev);
      return;
    }
    setMoreOpen(false);
    navigate(`/${id}`);
  };

  const isActive = (id) => {
    if (id === 'more') {
      return MORE_ITEMS.some(item => currentPath === item.id) || moreOpen;
    }
    return currentPath === id;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
      {/* More menu overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-20"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full right-2 mb-2 z-30 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden min-w-[180px]"
            >
              {MORE_ITEMS.map((item, i) => {
                const Icon = item.icon;
                const active = currentPath === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      active ? 'bg-[hsl(var(--sprouttie-green)/0.08)]' : 'hover:bg-slate-50'
                    } ${i > 0 ? 'border-t border-slate-50' : ''}`}
                  >
                    <Icon className={`w-[18px] h-[18px] ${
                      active ? 'text-[hsl(var(--sprouttie-green-dark))]' : 'text-slate-400'
                    }`} />
                    <span className={`text-[13px] ${
                      active ? 'text-[hsl(var(--sprouttie-green-dark))] font-semibold' : 'text-slate-600 font-medium'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Gradient fade above the bar */}
      <div className="h-6 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
      <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]">
        <div className="max-w-lg mx-auto flex items-stretch justify-around px-1">
          {TABS.map(tab => (
            <TabButton
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={isActive(tab.id)}
              onClick={() => handleNav(tab.id)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomTabBar;
