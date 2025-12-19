-- Atualizar sistema de convites para uso único
-- Alterar max_uses para ter valor padrão de 1
ALTER TABLE invites ALTER COLUMN max_uses SET DEFAULT 1;

-- Adicionar constraint para garantir que max_uses seja no mínimo 1 quando definido
ALTER TABLE invites ADD CONSTRAINT check_max_uses_positive
  CHECK (max_uses IS NULL OR max_uses >= 1);

-- Adicionar campo para armazenar o usuário que usou o convite (facilita rastreamento)
ALTER TABLE invites ADD COLUMN IF NOT EXISTS used_by_user_id UUID REFERENCES auth.users(id);

-- Comentário explicativo
COMMENT ON COLUMN invites.used_by_user_id IS 'ID do usuário que usou este convite (para convites de uso único)';

-- Atualizar invites existentes que não têm max_uses definido
UPDATE invites SET max_uses = 1 WHERE max_uses IS NULL;

-- Função para verificar se um convite ainda está válido
CREATE OR REPLACE FUNCTION is_invite_valid(invite_code TEXT)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
