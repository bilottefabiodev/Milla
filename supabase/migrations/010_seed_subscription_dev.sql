-- Migration: 010_seed_subscription_dev
-- Description: Seed script for development - creates an active subscription

-- IMPORTANT: This is for DEVELOPMENT ONLY!
-- Replace 'USER_ID_HERE' with the actual user ID after signup

-- Example usage after creating a user:
-- UPDATE the INSERT below with the user's UUID from auth.users

-- To use:
-- 1. Sign up a user in the app
-- 2. Get their ID from auth.users: SELECT id, email FROM auth.users;
-- 3. Run this with the correct ID:

/*
INSERT INTO subscriptions (
  user_id,
  status,
  plan,
  payment_provider,
  current_period_start,
  current_period_end
) VALUES (
  'REPLACE_WITH_USER_UUID', -- Get from: SELECT id FROM auth.users WHERE email = 'your@email.com';
  'active',
  'yearly',
  'seed_dev',
  NOW(),
  NOW() + INTERVAL '1 year'
) ON CONFLICT (user_id) DO UPDATE SET
  status = 'active',
  current_period_end = NOW() + INTERVAL '1 year';
*/

-- Helper function to seed subscription for a user by email
CREATE OR REPLACE FUNCTION seed_subscription_for_email(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'User not found: ' || user_email;
  END IF;
  
  -- Upsert subscription
  INSERT INTO subscriptions (
    user_id,
    status,
    plan,
    payment_provider,
    current_period_start,
    current_period_end
  ) VALUES (
    target_user_id,
    'active',
    'yearly',
    'seed_dev',
    NOW(),
    NOW() + INTERVAL '1 year'
  ) ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    current_period_end = NOW() + INTERVAL '1 year';
  
  RETURN 'Subscription activated for: ' || user_email || ' (ID: ' || target_user_id || ')';
END;
$$;

-- Grant to service_role only
REVOKE ALL ON FUNCTION seed_subscription_for_email(TEXT) FROM anon;
REVOKE ALL ON FUNCTION seed_subscription_for_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION seed_subscription_for_email(TEXT) TO service_role;

-- Usage from SQL Editor (as admin):
-- SELECT seed_subscription_for_email('user@example.com');
