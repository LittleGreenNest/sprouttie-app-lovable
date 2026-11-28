# Reliable card translation

Common reviewed words, including Rabbit → 兔子 / tù zi / rabbit, fill immediately without a model request. Swap and translation share the same vocabulary source. Other terms debounce briefly and use a session cache of successful results.

The translation endpoint tries the lighter model first, with at most two four-second attempts. The form stops waiting after eleven seconds and shows Retry plus a manual-entry option. Rate limits are not retried automatically. Output must include English and pinyin, plus Chinese for English input; incomplete model output is not successful.

Every new input, manual edit, input/card-language switch, reset or unmount invalidates older lookups. Old Chinese/English/pinyin are cleared when the primary input changes. Manual edits cancel pending fills. A Chinese card cannot be added while translation is pending or one of its three fields is missing.

Validation: 43 Node tests pass and production build passes. Tests cover immediate Rabbit lookup, out-of-order replies, cancellation, timeout/retry/cache behaviour, incomplete output, save readiness and model fallback/rate limits. Actual iPhone Add Card → save → refresh is pending owner retest. No existing saved cards were rewritten.
