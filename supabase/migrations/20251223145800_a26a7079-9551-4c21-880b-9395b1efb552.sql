-- 1) Remover policy ampla em user_roles
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON public.user_roles;

-- 2) Garantir search_path seguro nas funções SECURITY DEFINER relevantes

-- has_active_access com search_path explícito
CREATE OR REPLACE FUNCTION public.has_active_access(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
      AND is_approved = true
      AND (access_expires_at IS NULL OR access_expires_at > NOW())
  );
END;
$$;

-- is_invite_valid com search_path explícito
CREATE OR REPLACE FUNCTION public.is_invite_valid(invite_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  SELECT * INTO invite_record
  FROM invites
  WHERE code = invite_code;

  -- Convite não existe
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Verifica expiração
  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    RETURN false;
  END IF;

  -- Verifica limite de uso
  IF invite_record.max_uses IS NOT NULL AND invite_record.used_count >= invite_record.max_uses THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- get_days_remaining com search_path explícito
CREATE OR REPLACE FUNCTION public.get_days_remaining(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expiration TIMESTAMPTZ;
  days_left INTEGER;
BEGIN
  SELECT access_expires_at INTO expiration
  FROM profiles
  WHERE id = user_id;

  IF expiration IS NULL THEN
    RETURN NULL; -- Acesso permanente
  END IF;

  IF expiration < NOW() THEN
    RETURN 0; -- Acesso expirado
  END IF;

  days_left := CEIL(EXTRACT(EPOCH FROM (expiration - NOW())) / 86400);
  RETURN days_left;
END;
$$;