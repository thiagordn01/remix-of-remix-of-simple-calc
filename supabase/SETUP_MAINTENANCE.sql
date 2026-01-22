-- ==========================================
-- SETUP MAINTENANCE MODE & SYSTEM SETTINGS
-- ==========================================

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 3. Policies

-- Allow everyone (even anon) to READ 'maintenance_mode'
-- We might want to restrict other settings later, but maintenance_mode needs to be public-ish
-- to redirect users effectively.
CREATE POLICY "Public read maintenance_mode"
  ON public.system_settings
  FOR SELECT
  USING (key = 'maintenance_mode');

-- Allow Master users to UPDATE settings
CREATE POLICY "Master can update settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

-- Allow Master users to INSERT settings (initial setup)
CREATE POLICY "Master can insert settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master());

-- 4. Insert default maintenance_mode value if not exists
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'maintenance_mode', 
  '{"enabled": false, "message": "O sistema está em manutenção. Voltaremos em breve."}'::jsonb,
  'Controls system-wide maintenance mode'
) ON CONFLICT (key) DO NOTHING;
