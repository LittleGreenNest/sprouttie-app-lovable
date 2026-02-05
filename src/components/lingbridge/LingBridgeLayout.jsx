 import React from 'react';
 import { NavLink, Outlet } from 'react-router-dom';
 import { Languages, Music, Library, BookOpen } from 'lucide-react';
 
 const navItems = [
   { path: '/lingbridge/translate', label: 'Translator', icon: Languages },
   { path: '/lingbridge/tones', label: 'Tones Guide', icon: Music, comingSoon: true },
   { path: '/lingbridge/library', label: 'Listen & Learn', icon: Library, comingSoon: true },
   { path: '/lingbridge/vocabulary', label: 'Vocabulary', icon: BookOpen, comingSoon: true },
 ];
 
 const LingBridgeLayout = () => {
   return (
     <div className="min-h-screen bg-background">
       {/* Sub-navigation for LingBridge */}
       <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
         <div className="max-w-6xl mx-auto px-4">
           <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
             {navItems.map((item) => (
               <NavLink
                 key={item.path}
                 to={item.comingSoon ? '#' : item.path}
                 onClick={(e) => item.comingSoon && e.preventDefault()}
                 className={({ isActive }) =>
                   `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                     item.comingSoon
                       ? 'text-muted-foreground/50 cursor-not-allowed'
                       : isActive
                       ? 'bg-primary text-primary-foreground'
                       : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                   }`
                 }
               >
                 <item.icon className="w-4 h-4" />
                 {item.label}
                 {item.comingSoon && (
                   <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                     Soon
                   </span>
                 )}
               </NavLink>
             ))}
           </nav>
         </div>
       </div>
 
       {/* Content Area */}
       <div className="max-w-6xl mx-auto px-4 py-6">
         <Outlet />
       </div>
     </div>
   );
 };
 
 export default LingBridgeLayout;