-- Fix critical security issues

-- 1. Fix profiles table: Add trigger to prevent self-approval and update RLS policy
CREATE TRIGGER block_approval_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.block_approval_change_by_non_admin();

-- Drop and recreate the user profile update policy with proper WITH CHECK
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

-- 2. Fix user_sessions: Add missing UPDATE policy
CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- 3. Fix user_activities: Add proper policies for regular users
CREATE POLICY "Users can insert their own activities" 
ON public.user_activities 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own activities" 
ON public.user_activities 
FOR SELECT 
USING (user_id = auth.uid());

-- Update master insert policy to be more specific
DROP POLICY IF EXISTS "Master can insert activities" ON public.user_activities;
CREATE POLICY "Master can insert any activities" 
ON public.user_activities 
FOR INSERT 
WITH CHECK (is_master());

-- 4. Optional: Allow users to view their own sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (user_id = auth.uid());