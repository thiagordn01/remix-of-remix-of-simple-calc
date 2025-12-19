-- Corrigir política de segurança da tabela user_roles
-- Problema: Qualquer usuário autenticado pode ver todos os roles
-- Solução: Usuários só podem ver seus próprios roles (exceto master)

-- Remover política insegura existente
DROP POLICY IF EXISTS "Authenticated users can view all roles" ON user_roles;

-- Criar política segura: usuários só veem seus próprios roles
CREATE POLICY "Users can view their own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Adicionar política para master ver todos os roles
CREATE POLICY "Master can view all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (is_master());

-- Comentários explicativos
COMMENT ON POLICY "Users can view their own roles" ON user_roles IS
  'Usuários autenticados só podem visualizar seus próprios roles, não os de outros usuários';

COMMENT ON POLICY "Master can view all roles" ON user_roles IS
  'Conta master pode visualizar todos os roles para administração';
