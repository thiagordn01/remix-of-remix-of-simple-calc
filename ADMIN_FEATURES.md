# Funcionalidades de Administração

Este documento descreve as funcionalidades de administração implementadas no sistema.

## Visão Geral

O sistema agora possui um painel de administração completo que permite gerenciar usuários, convites e controlar o tempo de acesso de cada usuário.

## Funcionalidades Principais

### 1. Sistema de Convites de Uso Único

O administrador pode criar convites para permitir que novos usuários se cadastrem sem precisar passar pelo processo de aprovação manual.

**Características:**
- Cada convite pode ser usado apenas **uma vez** para criar uma nova conta
- Convites podem ter data de expiração opcional
- Link do convite é copiado automaticamente ao ser criado
- Interface mostra status de cada convite (Disponível, Usado, Expirado)

**Como usar:**
1. Acesse o painel de administração (`/admin`)
2. Vá para a aba "Convites"
3. Opcionalmente, defina uma data de expiração
4. Clique em "Criar Convite"
5. O link será copiado automaticamente - compartilhe com o usuário que deseja convidar
6. O usuário pode usar o link apenas uma vez para criar sua conta

### 2. Sistema de Tempo de Permanência

O administrador pode definir quanto tempo cada usuário terá acesso ao sistema.

**Características:**
- Definir período de acesso (em dias) para cada usuário
- Acesso permanente (sem data de expiração)
- Extensão de tempo para usuários existentes
- Revogação automática quando o período expira
- Visualização de dias restantes no dashboard

**Como usar:**

#### Adicionar/Estender Tempo
1. Acesse o painel de administração (`/admin`)
2. Na lista de usuários, clique em "Gerenciar Tempo" para o usuário desejado
3. Digite o número de dias para adicionar
4. Clique em "Adicionar Tempo"
   - Se o usuário já tem uma data de expiração, os dias serão adicionados a partir dessa data
   - Se a data já expirou, os dias serão adicionados a partir de agora
   - Se o usuário tem acesso permanente, os dias serão adicionados a partir de agora

#### Definir Acesso Permanente
1. No diálogo "Gerenciar Tempo", clique em "Acesso Permanente"
2. O usuário terá acesso ilimitado ao sistema

### 3. Dashboard de Usuários

O dashboard mostra todos os usuários cadastrados com informações detalhadas.

**Informações exibidas:**
- Nome do usuário
- Email
- Data de criação da conta
- Status (Não aprovado, Ativo, Expira em breve, Expirado, Permanente)
- Tempo restante de acesso (em dias)

**Ações disponíveis:**
- **Gerenciar Tempo**: Adicionar dias ou definir acesso permanente
- **Revogar**: Remover acesso imediatamente
- **Aprovar**: Aprovar usuário que está pendente

**Badges de Status:**
- 🔴 **Expirado**: Acesso já expirou
- 🟡 **Expira em breve**: 7 dias ou menos restantes
- 🟢 **Ativo**: Mais de 7 dias restantes
- 🔵 **Permanente**: Sem data de expiração
- ⚪ **Não aprovado**: Aguardando aprovação

### 4. Verificação Automática de Expiração

O sistema verifica automaticamente se o usuário ainda tem acesso válido.

**Comportamento:**
- Quando o usuário tenta acessar o sistema, o `ApprovedGuard` verifica:
  1. Se o usuário está aprovado
  2. Se o acesso não expirou (caso tenha data de expiração)
- Usuários com acesso expirado veem uma mensagem clara com a data de expiração
- Opção de atualizar a página ou fazer logout

## Estrutura do Banco de Dados

### Tabela `profiles`

Nova coluna adicionada:
```sql
access_expires_at TIMESTAMPTZ -- Data e hora em que o acesso expira (NULL = permanente)
```

### Tabela `invites`

Nova coluna adicionada:
```sql
used_by_user_id UUID -- ID do usuário que usou o convite
```

Atualização:
```sql
max_uses INTEGER DEFAULT 1 -- Sempre 1 para convites de uso único
```

## Funções do Banco de Dados

### `has_active_access(user_id UUID)`
Verifica se o usuário tem acesso ativo (aprovado e não expirado).

### `get_days_remaining(user_id UUID)`
Retorna quantos dias restam de acesso para o usuário:
- `NULL`: Acesso permanente
- `0`: Acesso expirado
- `> 0`: Dias restantes

### `is_invite_valid(invite_code TEXT)`
Verifica se um convite ainda é válido (não expirou e não foi usado).

## Edge Functions

### `accept-invite`
Processa convites quando um usuário se cadastra:
- Valida o código do convite
- Verifica se não foi usado (para convites de uso único)
- Verifica expiração
- Aprova o usuário automaticamente
- Registra qual usuário usou o convite

### `check-expired-access` (Nova)
Função que pode ser chamada periodicamente para revogar acessos expirados:
- Busca todos os usuários com acesso expirado
- Revoga o acesso automaticamente
- Retorna lista de usuários afetados

## Componentes

### `UsersManagement`
Componente principal do dashboard de usuários com todas as funcionalidades de gerenciamento.

**Localização:** `src/components/admin/UsersManagement.tsx`

### `ApprovedGuard`
Componente de proteção de rotas que verifica:
1. Se o usuário está autenticado
2. Se o usuário está aprovado
3. Se o acesso não expirou

**Localização:** `src/components/ApprovedGuard.tsx`

## Migrações

As seguintes migrações foram criadas:

1. **`20251104000001_add_access_expiration.sql`**
   - Adiciona campo `access_expires_at` à tabela `profiles`
   - Cria funções de verificação de acesso
   - Cria trigger para revogação automática

2. **`20251104000002_update_invites_system.sql`**
   - Atualiza sistema de convites para uso único
   - Adiciona campo `used_by_user_id`
   - Cria função de validação de convites

## Aplicando as Migrações

Para aplicar as migrações ao banco de dados Supabase:

```bash
# Aplicar todas as migrações pendentes
npx supabase db push

# Ou aplicar manualmente via Supabase Dashboard
# SQL Editor > Cole o conteúdo das migrações > Execute
```

## Fluxo de Uso Completo

### Cenário 1: Admin convida novo usuário com tempo limitado

1. Admin cria convite na aba "Convites"
2. Compartilha o link com o novo usuário
3. Usuário se cadastra usando o link do convite
4. Conta é aprovada automaticamente
5. Admin acessa "Usuários" e clica em "Gerenciar Tempo"
6. Define 30 dias de acesso
7. Após 30 dias, o acesso é automaticamente revogado
8. Usuário vê mensagem de "Acesso expirado"

### Cenário 2: Admin estende tempo de usuário existente

1. Admin acessa dashboard de usuários
2. Verifica que usuário tem 5 dias restantes
3. Clica em "Gerenciar Tempo"
4. Adiciona mais 30 dias
5. Novo tempo é calculado a partir da data de expiração atual
6. Usuário agora tem 35 dias de acesso

### Cenário 3: Admin revoga acesso imediatamente

1. Admin identifica usuário que precisa ser removido
2. Clica em "Revogar" na linha do usuário
3. Acesso é removido instantaneamente
4. Usuário não consegue mais acessar o sistema

## Notas Importantes

- O sistema master (definido por email) sempre tem acesso permanente
- Convites de uso único não podem ser reutilizados
- A verificação de expiração acontece no frontend (ApprovedGuard)
- Para garantir segurança máxima, considere também implementar verificação no backend
- A edge function `check-expired-access` pode ser configurada para executar periodicamente via Supabase Cron Jobs

## Próximos Passos Sugeridos

1. Configurar Supabase Cron Job para executar `check-expired-access` diariamente
2. Adicionar notificações por email quando o acesso está próximo de expirar
3. Implementar log de auditoria para ações de administrador
4. Adicionar filtros e busca no dashboard de usuários
5. Exportar relatórios de usuários e acessos
