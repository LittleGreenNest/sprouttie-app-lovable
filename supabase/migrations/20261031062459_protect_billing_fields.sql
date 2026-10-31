REVOKE EXECUTE ON FUNCTION public.stripe_update_profile(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_update_profile(uuid,text,text,text,text) TO service_role;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

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
REVOKE ALL ON FUNCTION public.protect_profile_billing() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_profile_billing BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_billing();
