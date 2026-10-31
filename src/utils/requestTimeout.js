export const REQUEST_TIMEOUT_MS = 15000;
export const CONNECTION_MESSAGE = "Sprouttie couldn't connect. Please check your connection and try again in a moment.";

// Auth can also wait on a browser session lock, before a fetch is started.
export async function withTimeout(operation, milliseconds = REQUEST_TIMEOUT_MS) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(CONNECTION_MESSAGE)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Abort a stalled HTTP request too, so it doesn't keep an auth lock occupied.
export async function fetchWithTimeout(input, init = {}, milliseconds = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const sourceSignal = init.signal || (typeof Request !== 'undefined' && input instanceof Request ? input.signal : null);
  const abort = () => controller.abort(sourceSignal?.reason);
  if (sourceSignal?.aborted) abort();
  else sourceSignal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    sourceSignal?.removeEventListener('abort', abort);
  }
}

// Word generation and media uploads can legitimately take longer than sign-in.
export function supabaseFetch(input, init) {
  const url = typeof input === 'string' ? input : input.url || String(input);
  return /\/auth\/v1\//.test(url) ? fetchWithTimeout(input, init) : fetch(input, init);
}
