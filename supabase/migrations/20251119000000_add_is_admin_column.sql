-- Adicionar coluna is_admin na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Tornar o primeiro usuário (você) como admin
-- Substitua pelo seu email real
UPDATE profiles
SET is_admin = true
WHERE id = (
  SELECT id
  FROM auth.users
  WHERE email = 'ouroferrero008@gmail.com'
  LIMIT 1
);

-- Verificar se funcionou
SELECT
  u.email,
  p.name,
  p.is_admin
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.is_admin = true;
