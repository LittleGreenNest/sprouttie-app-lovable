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

CREATE TRIGGER enforce_free_flashcard_limit
BEFORE INSERT ON public.flashcards
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_flashcard_limit();

CREATE OR REPLACE FUNCTION public.stripe_update_profile(p_user_id uuid,p_plan text,p_subscription_status text,p_stripe_customer_id text DEFAULT NULL,p_stripe_subscription_id text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Billing fields are managed by the payment service' USING ERRCODE='42501';
  END IF;
  UPDATE public.profiles SET plan=p_plan,subscription_status=p_subscription_status,
    stripe_customer_id=p_stripe_customer_id,stripe_subscription_id=p_stripe_subscription_id WHERE id=p_user_id;
END;
$$;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

CREATE OR REPLACE FUNCTION public.protect_profile_billing()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF coalesce(NEW.plan, 'free') <> 'free' OR coalesce(NEW.subscription_status, 'free') <> 'free'
         OR NEW.stripe_customer_id IS NOT NULL OR NEW.stripe_subscription_id IS NOT NULL THEN
        RAISE EXCEPTION 'Billing fields are managed by the payment service' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF (NEW.id,NEW.plan,NEW.subscription_status,NEW.stripe_customer_id,NEW.stripe_subscription_id)
        IS DISTINCT FROM (OLD.id,OLD.plan,OLD.subscription_status,OLD.stripe_customer_id,OLD.stripe_subscription_id) THEN
        RAISE EXCEPTION 'Billing fields are managed by the payment service' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_profile_billing BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_billing();
