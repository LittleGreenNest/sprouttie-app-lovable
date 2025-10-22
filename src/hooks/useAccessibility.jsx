import { useEffect, useState } from 'react';

/**
 * Custom hook for accessibility features
 * Handles reduced motion preferences, keyboard navigation, and focus management
 */
export const useAccessibility = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    // Detect keyboard navigation
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
        document.body.classList.add('keyboard-user');
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
      document.body.classList.remove('keyboard-user');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  /**
   * Get animation props that respect reduced motion preference
   */
  const getAnimationProps = (normalAnimation, reducedAnimation = {}) => {
    return prefersReducedMotion ? reducedAnimation : normalAnimation;
  };

  /**
   * Announce message to screen readers
   */
  const announce = (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  /**
   * Trap focus within a container (useful for modals)
   */
  const trapFocus = (containerRef) => {
    if (!containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    containerRef.current.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      containerRef.current?.removeEventListener('keydown', handleTabKey);
    };
  };

  return {
    prefersReducedMotion,
    isKeyboardUser,
    getAnimationProps,
    announce,
    trapFocus
  };
};

/**
 * Hook for managing skip links
 */
export const useSkipLinks = () => {
  useEffect(() => {
    const skipLink = document.getElementById('skip-to-main');
    
    if (!skipLink) {
      const link = document.createElement('a');
      link.id = 'skip-to-main';
      link.href = '#main-content';
      link.textContent = 'Skip to main content';
      link.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-sprouttie-green focus:text-white focus:px-4 focus:py-2 focus:rounded-lg';
      document.body.insertBefore(link, document.body.firstChild);
    }
  }, []);
};
