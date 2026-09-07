/**
 * Password-recovery link detection.
 *
 * The reset email asks Supabase to send the user back to
 * `${window.location.origin}/reset-password`. Supabase only honours that when
 * the exact URL is in the project's allowed Redirect URLs. When it is not, it
 * silently substitutes the project's Site URL instead, so the user lands on
 * the app root, gets signed in by the recovery token, and is dropped on the
 * dashboard having never been offered a password field. That is what happens
 * from localhost today, and it would happen on any new domain or preview
 * deployment too.
 *
 * Rather than depend on that allowlist being correct forever, detect the
 * recovery link ourselves and route to /reset-password wherever it lands.
 *
 * Timing matters: supabase-js consumes the URL fragment during client
 * initialisation and strips it. This module records the marker at import time
 * and must therefore be imported before the Supabase client is created, which
 * is why it is the first import in src/index.jsx.
 */

const FLAG = 'sprouttie:password-recovery';

const looksLikeRecovery = () => {
  if (typeof window === 'undefined') return false;
  try {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    // The hash form is what Supabase's /verify endpoint redirects to. The
    // query form covers links that arrive without being followed first.
    return hash.get('type') === 'recovery' || query.get('type') === 'recovery';
  } catch {
    return false;
  }
};

// Runs once, at import time, before anything has had a chance to strip the URL.
if (looksLikeRecovery()) {
  try {
    sessionStorage.setItem(FLAG, '1');
  } catch {
    /* private mode: the PASSWORD_RECOVERY event below is the fallback */
  }
}

/** Set when Supabase reports a recovery sign-in, covering flows with no URL marker. */
export const markPasswordRecovery = () => {
  try {
    sessionStorage.setItem(FLAG, '1');
  } catch {
    /* ignore */
  }
};

export const isPasswordRecovery = () => {
  try {
    return sessionStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
};

/** Called by the reset screen once the user has actually reached it. */
export const clearPasswordRecovery = () => {
  try {
    sessionStorage.removeItem(FLAG);
  } catch {
    /* ignore */
  }
};
