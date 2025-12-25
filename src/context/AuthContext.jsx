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
        // Don't hard-fail auth UX; just expose error + treat as no profile
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
   * IMPORTANT: Empty dependency array to run only once on mount
   */
  useEffect(() => {
    let mounted = true;

    // Helper to fetch profile without causing re-renders
    const loadProfile = async (user) => {
      if (!user?.id) {
        setProfile(null);
        return;
      }
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      
      if (!error && data && mounted) {
        setProfile(data);
      }
    };

    const init = async () => {
      try {
        const {
          data: { session },
          error: sessionErr,
        } = await supabase.auth.getSession();

        if (sessionErr) throw sessionErr;

        const user = session?.user ?? null;
        if (!mounted) return;

        setCurrentUser(user);

        if (user) {
          await loadProfile(user);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (!mounted) return;
        setError(err?.message || "Authentication initialization failed");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Set up listener FIRST (per Supabase best practices)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Synchronous state updates only - no async in callback
      const user = session?.user ?? null;
      setCurrentUser(user);
      setError("");
      setLoading(false);

      // Defer profile fetch with setTimeout to avoid deadlock
      if (user) {
        setTimeout(() => loadProfile(user), 0);
      } else {
        setProfile(null);
      }
    });

    // THEN check for existing session
    init();

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []); // Empty deps - runs once on mount

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
      .subscribe();

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
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
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

  // Google Sign-In
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (oauthErr) throw oauthErr;

      return data;
    } catch (err) {
      const msg = err?.message || "Failed to sign in with Google";
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
  const googleSignIn = signInWithGoogle;

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
      signInWithGoogle,
      googleSignIn,

      // profile utilities
      getUserProfile,
      refreshProfile,
      ensureProfileExists,
      setError,
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
