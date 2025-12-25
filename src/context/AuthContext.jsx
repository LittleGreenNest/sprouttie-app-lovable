// src/context/AuthContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Ensures a profiles row exists for the given user.
   * Safe to call repeatedly (uses a read-then-insert fallback).
   */
  const ensureProfileExists = useCallback(async (user) => {
    if (!user?.id) return null;

    // 1) Try fetch existing
    const { data: existing, error: fetchErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!fetchErr && existing) return existing;

    // If fetch failed for some reason other than "no row", log it but continue
    if (fetchErr) {
      console.warn("ensureProfileExists: profile fetch error:", fetchErr);
    }

    // 2) Insert a minimal profile row
    const insertPayload = {
      id: user.id,
      email: user.email ?? null,
      plan: "free",
      subscription_status: "free",
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("profiles")
      .insert(insertPayload)
      .select("*")
      .maybeSingle();

    // If insert fails because row already exists (race), just fetch again
    if (insertErr) {
      console.warn("ensureProfileExists: profile insert error:", insertErr);

      const { data: retry, error: retryErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (retryErr) {
        console.error("ensureProfileExists: retry fetch error:", retryErr);
        return null;
      }
      return retry ?? null;
    }

    return inserted ?? null;
  }, []);

  /**
   * Fetches and sets profile state (also ensures it exists).
   * Returns the latest profile (or null).
   */
  const refreshProfile = useCallback(
    async (userOverride = null) => {
      const user = userOverride ?? currentUser;
      if (!user?.id) {
        setProfile(null);
        return null;
      }

      setProfileLoading(true);
      try {
        const ensured = await ensureProfileExists(user);
        if (ensured) {
          setProfile(ensured);
          return ensured;
        }

        // If ensure returned null, attempt a direct fetch one last time
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(data ?? null);
        return data ?? null;
      } catch (err) {
        console.error("refreshProfile error:", err);
        // Don’t hard-fail auth UX; just expose error + treat as no profile
        setError(err?.message || "Failed to load profile");
        setProfile(null);
        return null;
      } finally {
        setProfileLoading(false);
      }
    },
    [currentUser, ensureProfileExists]
  );

  // Derived plan flags (single source of truth for feature locking UI)
  const plan = profile?.plan || "free";
  const isPdf = plan === "pdf" || plan === "pro";
  const isPro = plan === "pro";

  /**
   * Init auth state + subscribe to auth changes
   */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionErr,
        } = await supabase.auth.getSession();

        if (sessionErr) throw sessionErr;

        const user = session?.user ?? null;
        if (!mounted) return;

        setCurrentUser(user);

        // Load profile immediately if signed in
        if (user) {
          await refreshProfile(user);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (!mounted) return;
        setError(err?.message || "Authentication initialization failed");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Keep this minimal, but ensure profile is loaded when signed in
      const user = session?.user ?? null;
      setCurrentUser(user);
      setError("");

      // We keep loading=false because auth state changed event implies "ready"
      setLoading(false);

      if (user) {
        await refreshProfile(user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, [refreshProfile]);

  /**
   * Optional: Realtime subscription to profile updates (e.g., Stripe webhook updates plan)
   * This makes the UI unlock immediately without requiring refresh.
   */
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`profiles:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${currentUser.id}`,
        },
        (payload) => {
          // payload.new is the latest row for INSERT/UPDATE
          if (payload?.new) {
            setProfile(payload.new);
          } else {
            // For DELETE, drop profile (treat as free)
            setProfile(null);
          }
        }
      )
      .subscribe((status) => {
        // If realtime isn't enabled, this won't break anything; it just won't live-update.
        // status can be "SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT", etc.
        // Keep silent unless debugging.
        // console.log("Profiles realtime:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Signup
  const signup = async (email, password) => {
    try {
      setLoading(true);
      setError("");

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpErr) throw signUpErr;

      // If user is available immediately, ensure profile
      const user = data?.user ?? null;
      if (user) {
        await ensureProfileExists(user);
        await refreshProfile(user);
      }

      return data;
    } catch (err) {
      const msg = err?.message || "Failed to sign up";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError("");

      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginErr) throw loginErr;

      const user = data?.user ?? null;
      if (user) {
        await ensureProfileExists(user);
        await refreshProfile(user);
      }

      return data;
    } catch (err) {
      const msg = err?.message || "Failed to log in";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError("");
      const { error: signOutErr } = await supabase.auth.signOut();
      if (signOutErr) throw signOutErr;

      // Clear state
      setCurrentUser(null);
      setProfile(null);
    } catch (err) {
      const msg = err?.message || "Failed to log out";
      setError(msg);
      throw new Error(msg);
    }
  };

  // Alias (kept for compatibility)
  const signOut = logout;

  /**
   * Backward-compatible helper:
   * Previously getUserProfile() fetched on demand.
   * Now it returns the cached profile (and refreshes if needed).
   */
  const getUserProfile = async () => {
    if (!currentUser) return null;
    if (profile) return profile;
    return await refreshProfile(currentUser);
  };

  const value = useMemo(
    () => ({
      currentUser,
      profile,

      // plan / entitlements
      plan,
      isPdf,
      isPro,

      // loading
      loading,
      profileLoading,
      error,

      // actions
      signup,
      login,
      logout,
      signOut,

      // profile utilities
      getUserProfile,
      refreshProfile,
      ensureProfileExists,
    }),
    [
      currentUser,
      profile,
      plan,
      isPdf,
      isPro,
      loading,
      profileLoading,
      error,
      refreshProfile,
      ensureProfileExists,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
            plan: 'free',
            subscription_status: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createError) {
          console.error('Error creating profile:', createError);
        }
      }
    } catch (err) {
      console.error('Error in ensureProfileExists:', err);
    }
  };

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
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setCurrentUser(session?.user ?? null);
        setLoading(false);
        setError('');
        
        // Ensure profile exists for OAuth sign-ins (deferred to avoid deadlock)
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            ensureProfileExists(session.user);
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Signup function with profile creation
  const signup = async (email, password, name) => {
    try {
      setLoading(true);
      setError('');
      
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
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

  // Google Sign-In function
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
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

  // Logout function (alias for consistency with uploaded code)
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

  // SignOut alias
  const signOut = logout;

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
    signInWithGoogle,
    googleSignIn: signInWithGoogle, // Alias for compatibility
    logout,
    signOut, // Alias for compatibility
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
