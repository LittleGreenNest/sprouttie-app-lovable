-- Adds pinyin storage to flashcards.
--
-- Until now the /cards form collected pinyin (and the AI autofill populated it)
-- but there was nowhere to persist it: FlashcardContext carried it in local
-- state only, and reloading silently dropped it. word_plans already has a
-- pinyin column; flashcards did not.
--
-- Additive and nullable, so existing rows and every current INSERT keep working
-- untouched. No backfill: historical cards simply have NULL pinyin.

ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS pinyin text;

COMMENT ON COLUMN public.flashcards.pinyin IS
  'Hanyu Pinyin with tone marks for the front (Chinese) side. Nullable; English-language cards leave it NULL.';
