-- Adicionar campo de expiração de acesso aos usuários
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;

-- Comentário explicativo
COMMENT ON COLUMN profiles.access_expires_at IS 'Data e hora em que o acesso do usuário expira. NULL significa acesso permanente.';

-- Criar índice para melhorar performance nas consultas de expiração
CREATE INDEX IF NOT EXISTS idx_profiles_access_expires_at ON profiles(access_expires_at) WHERE access_expires_at IS NOT NULL;

-- Função para verificar se o acesso do usuário está ativo
CREATE OR REPLACE FUNCTION has_active_access(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
      AND is_approved = true
      AND (access_expires_at IS NULL OR access_expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular dias restantes de acesso
CREATE OR REPLACE FUNCTION get_days_remaining(user_id UUID)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para revogar aprovação automaticamente quando o acesso expira
CREATE OR REPLACE FUNCTION revoke_expired_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_expires_at IS NOT NULL
     AND NEW.access_expires_at <= NOW()
     AND NEW.is_approved = true THEN
    NEW.is_approved := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para verificar expiração em updates
DROP TRIGGER IF EXISTS trigger_revoke_expired_access ON profiles;
CREATE TRIGGER trigger_revoke_expired_access
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION revoke_expired_access();
