-- Migration: Adicionar campos para rastrear cancelamentos, reembolsos e chargebacks
-- Data: 2025-11-24
-- Descrição: Permite rastrear quando compras foram canceladas, reembolsadas ou contestadas

-- Adicionar campos de cancelamento
ALTER TABLE kiwify_purchases
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_type TEXT; -- 'customer_request', 'non_payment', 'other'

-- Adicionar campos de reembolso
ALTER TABLE kiwify_purchases
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Adicionar campos de chargeback
ALTER TABLE kiwify_purchases
  ADD COLUMN IF NOT EXISTS chargeback_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chargeback_reason TEXT;

-- Histórico de mudanças de status (JSONB array)
ALTER TABLE kiwify_purchases
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Comentários nas colunas
COMMENT ON COLUMN kiwify_purchases.canceled_at IS 'Data/hora quando a compra foi cancelada';
COMMENT ON COLUMN kiwify_purchases.cancellation_reason IS 'Motivo do cancelamento fornecido';
COMMENT ON COLUMN kiwify_purchases.cancellation_type IS 'Tipo de cancelamento: customer_request, non_payment, other';

COMMENT ON COLUMN kiwify_purchases.refunded_at IS 'Data/hora quando o reembolso foi processado';
COMMENT ON COLUMN kiwify_purchases.refund_amount IS 'Valor reembolsado (pode ser parcial)';
COMMENT ON COLUMN kiwify_purchases.refund_reason IS 'Motivo do reembolso';

COMMENT ON COLUMN kiwify_purchases.chargeback_date IS 'Data quando houve contestação/chargeback';
COMMENT ON COLUMN kiwify_purchases.chargeback_reason IS 'Motivo da contestação';

COMMENT ON COLUMN kiwify_purchases.status_history IS 'Histórico de mudanças de status [{status, changed_at, reason}]';

-- Criar índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_kiwify_purchases_canceled_at
  ON kiwify_purchases(canceled_at)
  WHERE canceled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kiwify_purchases_refunded_at
  ON kiwify_purchases(refunded_at)
  WHERE refunded_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kiwify_purchases_chargeback_date
  ON kiwify_purchases(chargeback_date)
  WHERE chargeback_date IS NOT NULL;

-- Função helper para adicionar entry ao histórico de status
CREATE OR REPLACE FUNCTION add_status_history_entry(
  p_purchase_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE kiwify_purchases
  SET status_history = status_history || jsonb_build_object(
    'status', p_status,
    'changed_at', NOW(),
    'reason', p_reason
  )
  WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário na função
COMMENT ON FUNCTION add_status_history_entry IS 'Adiciona uma entrada ao histórico de status de uma compra';
