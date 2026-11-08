// src/components/layout/Navbar.js
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import sprouttielogo from '../../assets/sprouttie-logo.png';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  // Same precedence as Profile.jsx / Dashboard.jsx / useThisWeek.jsx.
  // Note: the Supabase user object has no top-level `name`, so the old
  // `currentUser.name` reads here were always undefined.
  const displayName = currentUser?.user_metadata?.display_name
    || currentUser?.user_metadata?.full_name
    || currentUser?.user_metadata?.name
    || '';
  const avatarInitial = (displayName || currentUser?.email || 'U').charAt(0).toUpperCase();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);

  useEffect(() => {
    if (!isProfileDropdownOpen) return;
    const closeOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setIsProfileDropdownOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileDropdownOpen(false);
        profileButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isProfileDropdownOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="relative z-40 bg-white shadow-sm border-b border-slate-100 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center gap-2 text-xl font-display font-bold text-sprouttie-green-dark">
                <img src={sprouttielogo} alt="Sprouttie" className="h-8 w-8 object-contain -scale-x-100" />
                Sprouttie
              </Link>
            </div>
          </div>
          
          <div className={currentUser ? "ml-3 flex items-center" : "hidden sm:ml-6 sm:flex sm:items-center"}>
            {/* User profile dropdown - only shown when logged in */}
            {currentUser ? (
              <div className="relative" ref={profileMenuRef}>
                <div>
                  <button
                    type="button"
                    className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sprouttie-green"
                    ref={profileButtonRef}
                    id="user-menu-button"
                    aria-controls={isProfileDropdownOpen ? "user-menu" : undefined}
                    aria-expanded={isProfileDropdownOpen}
                    aria-haspopup="true"
                    onClick={() => setIsProfileDropdownOpen(open => !open)}
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-11 w-11 rounded-full bg-sprouttie-green-light flex items-center justify-center text-sprouttie-green-dark font-medium">
                      {avatarInitial}
                    </div>
                  </button>
                </div>

                {/* Dropdown menu */}
                {isProfileDropdownOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    id="user-menu"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    tabIndex="-1"
                  >
                    <Link
                      to="/profile"
                      className="flex min-h-11 items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      Your Profile
                    </Link>
                    <button
                      className="flex min-h-11 w-full items-center text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={() => {
                        handleLogout();
                        setIsProfileDropdownOpen(false);
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Login/Signup buttons for logged-out users
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-sprouttie-green-dark bg-sprouttie-green-light hover:bg-sprouttie-beige-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sprouttie-green"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sprouttie-green hover:bg-sprouttie-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sprouttie-green"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button — hidden when logged in; BottomTabBar handles navigation */}
          <div className={`flex items-center sm:hidden ${currentUser ? 'hidden' : ''}`}>
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sprouttie-green"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Icon when menu is open */}
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, toggle classes based on menu state */}
      <div
        className={`${!currentUser && isMobileMenuOpen ? 'block' : 'hidden'} sm:hidden`}
        id="mobile-menu"
      >
          {/* Login/Signup buttons for mobile */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center justify-around px-4">
              <Link
                to="/login"
                className="flex-1 mr-2 text-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-sprouttie-green-dark bg-sprouttie-green-light hover:bg-sprouttie-beige-dark"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="btn-primary flex-1 ml-2 text-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-sprouttie-green hover:bg-sprouttie-green-dark"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </div>
      </div>
    </nav>
  );
};

export default Navbar;