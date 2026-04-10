import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, MessageCircle, Layers, BookOpen } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'daily-tracking', label: 'Log', icon: CalendarCheck },
  { id: 'words-said', label: 'Words Said', icon: MessageCircle },
  { id: 'cards', label: 'Cards', icon: Layers },
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

  const currentPath = location.pathname.replace('/', '');

  const handleNav = (id) => {
    navigate(`/${id}`);
  };

  const isActive = (id) => currentPath === id;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
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
