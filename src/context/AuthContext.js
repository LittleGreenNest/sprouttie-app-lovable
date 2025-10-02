// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Create the auth context
const AuthContext = createContext();

// Authentication provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Set up auth state listener
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setError(error.message);
        } else {
          setCurrentUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Authentication initialization failed');
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setCurrentUser(session?.user ?? null);
        setLoading(false);
        setError('');
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Signup function with profile creation
  const signup = async (email, password, name) => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });

      if (error) throw error;

      // Create profile entry if user was created successfully
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            plan: 'free',
            subscription_status: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't throw error here as user is already created in auth
          // The profile might already exist or will be created later
        }
      }

      return data;
    } catch (err) {
      const errorMessage = err.message || 'Failed to sign up';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if profile exists, create if not
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error checking profile:', profileError);
        } else if (!profile) {
          // Create profile if it doesn't exist
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              plan: 'free',
              subscription_status: 'free',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (createError) {
            console.error('Error creating profile on login:', createError);
          }
        }
      }

      return data;
    } catch (err) {
      const errorMessage = err.message || 'Failed to log in';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Google sign in function
  const googleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile`
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage = err.message || 'Failed to sign in with Google';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setError('');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      const errorMessage = err.message || 'Failed to log out';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Helper function to get user profile data
  const getUserProfile = async () => {
    if (!currentUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error in getUserProfile:', err);
      return null;
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    signup,
    login,
    googleSignIn,
    logout,
    getUserProfile,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};