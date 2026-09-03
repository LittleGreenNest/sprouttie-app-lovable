import { lazy } from 'react';

// Recovery from a stale build.
//
// Route components are code-split, so their chunks are only fetched when the
// user opens that route. After a deploy the old hashed chunk filenames are gone
// from the server, and the SPA fallback in public/_redirects answers those dead
// URLs with index.html (200, text/html). The browser refuses to run HTML as a
// module, the import() rejects, and the user lands on the error boundary.
//
// A client can hold the old app shell long after a deploy: the service worker
// precaches index.html, and iOS keeps home-screen PWAs alive for days. So the
// fix has to run in the browser, not on the server.

const RELOAD_KEY = 'sprouttie:stale-build-reload';
// A recovered page reloads in well under this. Anything failing again inside
// the window is a genuinely broken chunk, not a stale cache.
const RELOAD_COOLDOWN_MS = 10000;

// Private browsing and locked-down storage settings make sessionStorage throw
// on access, so never let bookkeeping take down the recovery path.
const lastAttemptAt = () => {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
  } catch {
    return 0;
  }
};

const markAttempt = () => {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Without storage we lose the loop guard, but one reload still beats a
    // permanently broken tab.
  }
};

export const isStaleBuildError = (error) => {
  if (!error) return false;
  if (error.name === 'ChunkLoadError') return true;
  const message = String(error.message || error);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|Unable to preload|MIME type|expected a JavaScript/i.test(
    message
  );
};

// A plain reload is not enough: the stale service worker would serve the same
// cached index.html straight back. Point it at the new sw.js first, which
// carries the new precache manifest and drops the outdated one on activate.
//
// Deliberately not unregister() plus caches.delete(): that leaves the app with
// no precached shell, and the next load re-registers and re-precaches every
// entry, which turns into an install storm. Updating in place is enough.
export const recoverFromStaleBuild = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) await registration.update();
    }
  } catch (error) {
    console.warn('Could not refresh the service worker before reloading:', error);
  }
  window.location.reload();
};

// Returns true when a reload is in flight, so callers know to stop rendering.
export const handleStaleBuildError = (error) => {
  if (!isStaleBuildError(error)) return false;
  // Rate limit rather than count: a timestamp cannot be reset out from under
  // us by an unrelated chunk resolving mid-recovery, so this cannot tight-loop.
  if (Date.now() - lastAttemptAt() < RELOAD_COOLDOWN_MS) return false;
  markAttempt();
  recoverFromStaleBuild();
  return true;
};

export const lazyWithRetry = (factory) =>
  lazy(() =>
    factory().catch((error) => {
      if (handleStaleBuildError(error)) {
        // Stay pending so React keeps the Suspense fallback up instead of
        // flashing the error boundary while the page reloads.
        return new Promise(() => {});
      }
      throw error;
    })
  );

export default lazyWithRetry;
