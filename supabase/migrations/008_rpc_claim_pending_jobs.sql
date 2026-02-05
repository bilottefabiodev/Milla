-- Migration: 008_rpc_claim_pending_jobs
-- Description: RPC function to claim pending jobs atomically

-- Function to claim pending jobs for processing
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions
CREATE OR REPLACE FUNCTION claim_pending_jobs(job_limit INTEGER DEFAULT 10)
RETURNS SETOF jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_jobs jobs[];
BEGIN
  -- Claim jobs atomically
  WITH claimed AS (
    SELECT *
    FROM jobs
    WHERE status = 'pending'
      AND scheduled_at <= NOW()
      AND attempts < max_attempts
    ORDER BY scheduled_at ASC
    LIMIT job_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE jobs j
  SET 
    status = 'processing',
    started_at = NOW(),
    attempts = attempts + 1
  FROM claimed c
  WHERE j.id = c.id
  RETURNING j.* INTO claimed_jobs;
  
  -- Return the claimed jobs
  RETURN QUERY
  SELECT *
  FROM jobs
  WHERE status = 'processing'
    AND started_at >= NOW() - INTERVAL '1 minute'
    AND id = ANY(
      SELECT id FROM unnest(claimed_jobs)
    );
END;
$$;

-- Revoke access from anon and authenticated
REVOKE ALL ON FUNCTION claim_pending_jobs(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION claim_pending_jobs(INTEGER) FROM authenticated;

-- Grant access only to service_role (which bypasses RLS)
GRANT EXECUTE ON FUNCTION claim_pending_jobs(INTEGER) TO service_role;

-- Comment
COMMENT ON FUNCTION claim_pending_jobs IS 
'Claims pending jobs for processing. Only callable by service_role. 
Uses FOR UPDATE SKIP LOCKED to prevent race conditions between workers.';
