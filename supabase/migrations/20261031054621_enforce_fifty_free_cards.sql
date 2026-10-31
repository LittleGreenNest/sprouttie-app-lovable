-- Keep existing cards, including accounts already above the new Free limit.
-- All authenticated creation paths (manual, imports and weekly plans) share it.
CREATE OR REPLACE FUNCTION public.enforce_free_flashcard_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  user_plan text;
BEGIN
  -- Administrative imports are not customer creation requests. RLS still
  -- decides whether the caller is allowed to insert another user's row.
  IF auth.uid() IS NULL OR auth.uid() <> NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Serialize creation for this account, including concurrent import batches.
  SELECT p.plan INTO user_plan
  FROM public.profiles AS p
  WHERE p.id = NEW.user_id
  FOR UPDATE;

  IF coalesce(user_plan, 'free') = 'free' AND
     (SELECT count(*) FROM public.flashcards AS f WHERE f.user_id = NEW.user_id) >= 50 THEN
    RAISE EXCEPTION 'Free includes up to 50 flashcards. Your existing cards are safe. Upgrade to add more.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_free_flashcard_limit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS enforce_free_flashcard_limit ON public.flashcards;
CREATE TRIGGER enforce_free_flashcard_limit
BEFORE INSERT ON public.flashcards
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_flashcard_limit();
