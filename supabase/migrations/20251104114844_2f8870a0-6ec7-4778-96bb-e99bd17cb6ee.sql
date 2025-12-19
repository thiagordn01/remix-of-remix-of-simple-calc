-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Create invites table
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses integer,
  used_count integer DEFAULT 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for invites
CREATE POLICY "Admins can view all invites"
  ON public.invites
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert invites"
  ON public.invites
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update invites"
  ON public.invites
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invites"
  ON public.invites
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create is_master function to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role);
$$;

-- Create index on invites
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_created_by ON public.invites(created_by);