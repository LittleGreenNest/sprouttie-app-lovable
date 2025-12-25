import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, Check, Share, PlusSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone;
    setIsInstalled(standalone);

    // Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            App Installed!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sprouttie is ready to use from your home screen
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
          >
            Go to Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-md mx-auto pt-12">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Smartphone className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Install Sprouttie
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add to your home screen for quick access
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6"
        >
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Why install?</h2>
          <ul className="space-y-3">
            {[
              'Quick access from home screen',
              'Works offline',
              'Faster loading',
              'Full-screen experience',
              'No browser UI clutter'
            ].map((benefit, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Install Instructions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          {isIOS ? (
            <>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                How to install on iPhone/iPad
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Tap the Share button</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Share className="w-4 h-4" /> at the bottom of Safari
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Scroll and tap "Add to Home Screen"</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <PlusSquare className="w-4 h-4" /> in the share menu
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Tap "Add"</p>
                    <p className="text-sm text-gray-500 mt-1">
                      The app icon will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : deferredPrompt ? (
            <>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                Ready to install
              </h2>
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
              >
                <Download className="w-5 h-5" />
                Install Sprouttie
              </button>
            </>
          ) : (
            <>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                How to install on Android
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Tap the menu button</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Three dots (⋮) in Chrome
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Tap "Install app" or "Add to Home screen"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Confirm installation</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Continue in browser →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Install;
