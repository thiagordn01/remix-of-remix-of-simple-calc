-- Fix security issue: Restrict session creation to authenticated user only
DROP POLICY IF EXISTS "Master can insert sessions" ON public.user_sessions;

CREATE POLICY "Users can insert their own sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Master can insert any session" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (is_master());