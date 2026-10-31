import React, { useEffect, useState } from 'react';
const KEY = 'sprouttie-privacy-v1';
function readChoice() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function loadOptional(choice) {
  if (choice?.analytics && !document.getElementById('sprouttie-ga')) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-R3E4Y1FB3X', { allow_google_signals: false, allow_ad_personalization_signals: false });
    const script = document.createElement('script'); script.id = 'sprouttie-ga'; script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-R3E4Y1FB3X'; document.head.appendChild(script);
  }
  if (choice?.marketing && !document.getElementById('sprouttie-meta')) {
    const fbq = function (...args) { fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args); };
    fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; window.fbq = fbq;
    const script = document.createElement('script'); script.id = 'sprouttie-meta'; script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
    window.fbq('init', '132453898755840'); window.fbq('track', 'PageView');
  }
}
export default function PrivacyChoices() {
  const [open, setOpen] = useState(() => !readChoice());
  useEffect(() => {
    loadOptional(readChoice());
    const show = () => setOpen(true);
    window.addEventListener('sprouttie:privacy-settings', show);
    return () => window.removeEventListener('sprouttie:privacy-settings', show);
  }, []);
  const save = (analytics, marketing) => {
    const previous = readChoice();
    const next = { analytics, marketing, updatedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(next)); setOpen(false);
    if ((previous?.analytics && !analytics) || (previous?.marketing && !marketing)) {
      for (const name of document.cookie.split(';').map(c => c.trim().split('=')[0])) {
        if (/^(_ga|_fbp|_fbc)/.test(name)) {
          document.cookie = `${name}=; Max-Age=0; Path=/`;
          document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.sprouttie.online`;
        }
      }
      window.location.reload();
    } else loadOptional(next);
  };
  if (!open) return null;
  return <aside aria-label="Privacy choices" className="fixed bottom-0 inset-x-0 z-[100] bg-[#FCF9F3] border-t border-[#E4D6BF] p-4 shadow-lg text-[#263136]">
    <div className="max-w-3xl mx-auto"><p className="text-sm mb-3">Essential storage keeps you signed in. Optional analytics helps us understand usage. Optional Meta tracking measures advertising. Choose what you allow. <a href="/privacy" className="underline">Privacy policy</a></p>
    <div className="flex flex-wrap gap-2">{[['Essential only',false,false],['Allow analytics',true,false],['Allow analytics and advertising',true,true]].map(([label,a,m]) => <button key={label} onClick={() => save(a,m)} className="rounded-xl border border-[#296549] px-4 py-2 text-sm font-medium min-h-11">{label}</button>)}</div></div>
  </aside>;
}
