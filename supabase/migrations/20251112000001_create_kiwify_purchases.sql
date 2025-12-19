-- Tabela para registrar todas as compras feitas via Kiwify
-- Serve como auditoria e controle de pagamentos

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

-- Índices para performance
CREATE INDEX idx_kiwify_purchases_user_id ON public.kiwify_purchases(user_id);
CREATE INDEX idx_kiwify_purchases_order_id ON public.kiwify_purchases(order_id);
CREATE INDEX idx_kiwify_purchases_customer_email ON public.kiwify_purchases(customer_email);
CREATE INDEX idx_kiwify_purchases_order_status ON public.kiwify_purchases(order_status);
CREATE INDEX idx_kiwify_purchases_purchased_at ON public.kiwify_purchases(purchased_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_kiwify_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kiwify_purchases_updated_at
  BEFORE UPDATE ON public.kiwify_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kiwify_purchases_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.kiwify_purchases ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
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

-- Master pode inserir compras (via webhook com service role)
-- Service role bypassa RLS, então essa policy é para segurança adicional
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

-- Comentários para documentação
COMMENT ON TABLE public.kiwify_purchases IS 'Registro de todas as compras realizadas via Kiwify para auditoria e controle';
COMMENT ON COLUMN public.kiwify_purchases.order_id IS 'ID único da ordem na Kiwify';
COMMENT ON COLUMN public.kiwify_purchases.webhook_payload IS 'Payload completo do webhook para debug';
