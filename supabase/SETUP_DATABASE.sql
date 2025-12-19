-- ========================================
-- SETUP COMPLETO DA INTEGRAÇÃO KIWIFY
-- ========================================
-- Execute este arquivo INTEIRO no SQL Editor do Supabase
-- Dashboard → SQL Editor → New Query → Cole tudo → Run

-- ========================================
-- 1. CRIAR TABELA DE COMPRAS KIWIFY
-- ========================================

CREATE TABLE IF NOT EXISTS public.kiwify_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados da ordem/pedido Kiwify
  order_id TEXT NOT NULL UNIQUE,
  order_ref TEXT,
  order_status TEXT NOT NULL,

  -- Dados de pagamento
  payment_method TEXT,
  payment_merchant_id TEXT,
  installments INTEGER,
  amount DECIMAL(10,2),

  -- Dados do produto
  product_id TEXT,
  product_name TEXT,

  -- Dados do cliente (conforme enviado pela Kiwify)
  customer_name TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,

  -- Dados de assinatura (se aplicável)
  subscription_id TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_next_payment TIMESTAMPTZ,

  -- Webhook payload completo (para debug e auditoria)
  webhook_payload JSONB,

  -- Controle
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_kiwify_purchases_user_id
  ON public.kiwify_purchases(user_id);

CREATE INDEX IF NOT EXISTS idx_kiwify_purchases_order_id
  ON public.kiwify_purchases(order_id);

CREATE INDEX IF NOT EXISTS idx_kiwify_purchases_customer_email
  ON public.kiwify_purchases(customer_email);

CREATE INDEX IF NOT EXISTS idx_kiwify_purchases_order_status
  ON public.kiwify_purchases(order_status);

CREATE INDEX IF NOT EXISTS idx_kiwify_purchases_purchased_at
  ON public.kiwify_purchases(purchased_at DESC);

-- ========================================
-- 3. CRIAR TRIGGER PARA UPDATED_AT
-- ========================================

CREATE OR REPLACE FUNCTION public.update_kiwify_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kiwify_purchases_updated_at ON public.kiwify_purchases;

CREATE TRIGGER trg_kiwify_purchases_updated_at
  BEFORE UPDATE ON public.kiwify_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kiwify_purchases_updated_at();

-- ========================================
-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE public.kiwify_purchases ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. REMOVER POLÍTICAS ANTIGAS (SE EXISTIREM)
-- ========================================

DROP POLICY IF EXISTS "Users can view their own purchases" ON public.kiwify_purchases;
DROP POLICY IF EXISTS "Master can view all purchases" ON public.kiwify_purchases;
DROP POLICY IF EXISTS "Master can insert purchases" ON public.kiwify_purchases;
DROP POLICY IF EXISTS "Master can update purchases" ON public.kiwify_purchases;
DROP POLICY IF EXISTS "Master can delete purchases" ON public.kiwify_purchases;

-- ========================================
-- 6. CRIAR POLÍTICAS RLS
-- ========================================

-- Usuários podem ver apenas suas próprias compras
CREATE POLICY "Users can view their own purchases"
  ON public.kiwify_purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Master pode ver todas as compras
CREATE POLICY "Master can view all purchases"
  ON public.kiwify_purchases
  FOR SELECT
  TO authenticated
  USING (public.is_master());

-- Master pode inserir compras
CREATE POLICY "Master can insert purchases"
  ON public.kiwify_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master());

-- Master pode atualizar compras
CREATE POLICY "Master can update purchases"
  ON public.kiwify_purchases
  FOR UPDATE
  TO authenticated
  USING (public.is_master());

-- Master pode deletar compras
CREATE POLICY "Master can delete purchases"
  ON public.kiwify_purchases
  FOR DELETE
  TO authenticated
  USING (public.is_master());

-- ========================================
-- 7. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ========================================

COMMENT ON TABLE public.kiwify_purchases IS
  'Registro de todas as compras realizadas via Kiwify para auditoria e controle';

COMMENT ON COLUMN public.kiwify_purchases.order_id IS
  'ID único da ordem na Kiwify';

COMMENT ON COLUMN public.kiwify_purchases.webhook_payload IS
  'Payload completo do webhook para debug';

-- ========================================
-- 8. VERIFICAÇÃO FINAL
-- ========================================

-- Verificar se a tabela foi criada
SELECT
  'Tabela kiwify_purchases criada com sucesso!' as mensagem,
  count(*) as total_registros
FROM public.kiwify_purchases;

-- Verificar políticas RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'kiwify_purchases'
ORDER BY policyname;

-- ========================================
-- ✅ SETUP COMPLETO!
-- ========================================
-- Próximo passo: Deploy da Edge Function
-- Ver arquivo: QUICK_SETUP_GUIDE.md
