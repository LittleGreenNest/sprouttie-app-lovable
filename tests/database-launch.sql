-- Run only after both launch migrations. Every fixture change is rolled back.
BEGIN;
SELECT set_config('sprouttie.test_uid', gen_random_uuid()::text, true);
INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES (current_setting('sprouttie.test_uid')::uuid,'launch-check-' || gen_random_uuid() || '@example.invalid','{}'::jsonb);
SELECT set_config('request.jwt.claim.sub',current_setting('sprouttie.test_uid'),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.flashcards(user_id,front,back) SELECT current_setting('sprouttie.test_uid')::uuid,'Test ' || n,'test' FROM generate_series(1,50) n;
DO $$ DECLARE denied boolean := false; BEGIN
  BEGIN
    INSERT INTO public.flashcards(user_id,front,back) VALUES (current_setting('sprouttie.test_uid')::uuid,'51st','test');
  EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM LIKE 'Free includes%' THEN denied := true; ELSE RAISE; END IF;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'FAIL: 51st free card was allowed'; END IF;
END $$;
DO $$ DECLARE denied boolean := false; BEGIN
  BEGIN UPDATE public.profiles SET plan='pro' WHERE id=current_setting('sprouttie.test_uid')::uuid;
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'FAIL: user changed paid access'; END IF;
END $$;
UPDATE public.profiles SET child_interests='buses' WHERE id=current_setting('sprouttie.test_uid')::uuid;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ DECLARE denied boolean:=false; BEGIN
 BEGIN PERFORM public.stripe_update_profile(current_setting('sprouttie.test_uid')::uuid,'pro','active',NULL,NULL);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: anonymous caller changed paid access'; END IF;
END $$;
RESET ROLE;
UPDATE public.profiles SET plan='print' WHERE id=current_setting('sprouttie.test_uid')::uuid;
SET LOCAL ROLE authenticated;
INSERT INTO public.flashcards(user_id,front,back) VALUES(current_setting('sprouttie.test_uid')::uuid,'Paid 51st','test');
RESET ROLE;
SELECT 'PASS: free limit, paid capacity, profile editing and billing restrictions' AS result;
ROLLBACK;
