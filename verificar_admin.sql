-- Verificar se você tem role de admin na tabela user_roles

-- 1. Ver todos os admins cadastrados
SELECT
  ur.user_id,
  ur.role,
  ur.created_at,
  u.email,
  p.name
FROM user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin';

-- 2. Verificar especificamente seu usuário (substitua pelo seu email)
SELECT
  ur.user_id,
  ur.role,
  u.email,
  p.name
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'ouroferrero008@gmail.com';

-- 3. Se não aparecer nenhum resultado, adicionar você como admin
-- (descomente e execute apenas se necessário)
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'admin'
-- FROM auth.users
-- WHERE email = 'ouroferrero008@gmail.com'
-- ON CONFLICT DO NOTHING;
