# Plano de Implementação - Configuração de Pagamentos e Bot

Este documento descreve as etapas para finalizar a integração de pagamentos Pix
via SyncPay, o envio automático de passes via LikesFF e a gestão do bot.

## Fase 1: Análise e Planejamento

- [x] Analisar a integração SyncPay (Python -> Node.js)
- [x] Descobrir URLs de API corretas para SyncPay
- [x] Planejar o fluxo de mensagens configuráveis do bot
- [x] Definir esquema de banco de dados para pedidos e sessões

## Fase 2: Implementação do Core

- [x] Biblioteca de integração SyncPay (`src/lib/syncpay.ts`)
- [x] Gestor de bots com Polling (`src/lib/bot-manager.ts`)
- [x] Fluxo de mensagens configuráveis do bot
- [x] Integração com API LikesFF para envio de passes (`src/lib/likesff.ts`)
- [x] Webhook para receber confirmações de pagamento
      (`src/app/api/syncpay/webhook/route.ts`)

## Fase 3: Refinamento e Correções

- [x] Implementar verificação manual de status do Pix no bot (botão "Confirmar
      Pagamento")
- [x] Corrigir problema de código Pix duplicado ao copiar (Limpando webhooks e
      handlers duplicados)
- [x] Adicionar logs de auditoria no fluxo de pagamento
- [x] Integrar dados da conta (Nickname) no Dashboard de transações
- [x] Criar script de teste automatizado para o fluxo de pagamento/entrega

## Fase 4: Limpeza e Finalização

- [ ] Remover códigos e handlers duplicados
- [ ] Documentar os endpoints e webhooks necessários
- [ ] Realizar teste de ponta a ponta simulando sucesso/falha

## Checklist de Requisitos

- [x] Mensagens do bot configuráveis via Supabase
- [x] Cálculo de lucro dinâmico com custos e descontos
- [x] Gerenciamento de múltiplos bots (Iniciar/Parar) no painel
- [x] Geração de QR Code Pix funcional
- [x] Envio automático após pagamento confirmado
- [ ] Exibição das informações da conta no Dashboard
