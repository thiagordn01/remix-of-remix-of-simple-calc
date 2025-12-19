#!/bin/bash

# Script para testar webhook da Kiwify manualmente
# Simula uma compra aprovada

echo "🧪 Enviando webhook fake para testar integração Kiwify..."
echo ""

curl -X POST \
  "https://wzldbdmcozbmivztbmik.supabase.co/functions/v1/kiwify-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "TEST_ORDER_'$(date +%s)'",
    "order_ref": "TEST_REF_001",
    "order_status": "paid",
    "payment_method": "credit_card",
    "payment_merchant_id": "stripe_12345",
    "installments": 1,
    "order_amount": 197.00,
    "Customer": {
      "full_name": "Cliente Teste",
      "email": "teste@email.com",
      "mobile": "+5511999999999"
    },
    "Product": {
      "product_id": "prod_test_123",
      "product_name": "Curso de Teste - Integração Kiwify"
    },
    "Subscription": null
  }'

echo ""
echo ""
echo "✅ Webhook enviado!"
echo ""
echo "📋 Agora verifique:"
echo "1. Logs no Supabase: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/logs/edge-functions"
echo "2. Novo usuário em Auth: https://supabase.com/dashboard/project/wzldbdmcozbmivztbmik/auth/users"
echo "3. Compra registrada em kiwify_purchases"
echo ""
