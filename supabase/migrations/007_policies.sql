-- Migration: 007_policies
-- Description: Create RLS policies for all tables

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- SUBSCRIPTIONS POLICIES
-- ============================================

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
ON subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service_role can insert/update/delete subscriptions
-- (no policy for anon/authenticated = denied)

-- ============================================
-- PROMPTS POLICIES
-- ============================================

-- Everyone can read prompts (for easier debugging)
CREATE POLICY "Prompts are publicly readable"
ON prompts FOR SELECT
TO authenticated, anon
USING (true);

-- Only service_role can manage prompts
-- (no policy for INSERT/UPDATE/DELETE)

-- ============================================
-- READINGS POLICIES
-- ============================================

-- Users can read their own readings
CREATE POLICY "Users can read own readings"
ON readings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service_role can insert/update readings
-- (no policy for INSERT/UPDATE = only service_role can write)

-- ============================================
-- JOBS POLICIES
-- ============================================

-- Users can read their own jobs (to see status)
CREATE POLICY "Users can read own jobs"
ON jobs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service_role can insert/update jobs
-- (no policy for INSERT/UPDATE = only service_role can write)
