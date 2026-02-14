
import { Telegraf, Markup, Context } from 'telegraf';
import { prisma } from './db';
import * as MercadoPago from './mercadopago';
import * as LikesFF from './likesff';

// In-memory store for running bots
const runningBots = new Map<string, Telegraf>();

// --- Memory Caches ---
const settingsCache = new Map<string, { value: string; timestamp: number }>();
const botConfigCache = new Map<string, { data: any; timestamp: number }>();
const lastHeartbeat = new Map<string, number>();

const CACHE_TTL = 30000; // 30 seconds
const HEARTBEAT_THROTTLE = 300000; // 5 minutes

// --- DB Helpers ---

async function addLog(botId: string, userId: string | number | undefined, chatId: string | number | undefined, message: string, type: string = 'info') {
  try {
    // Non-blocking log insertion
    prisma.botLog.create({
      data: {
        bot_id: botId,
        user_id: userId?.toString(),
        chat_id: chatId?.toString(),
        message,
        level: type // Mapped type to level matches schema
      }
    }).catch((e: any) => console.error('[DB-LOG] Error:', e));
  } catch (e: any) {
    console.error('[DB-LOG] Critical:', e);
  }
}

async function getSession(userId: number) {
  const session = await prisma.botSession.findUnique({ where: { key: userId.toString() } });
  return session?.session ? (session.session as any) : { step: 'START' };
}

async function updateSession(userId: number, update: any) {
  const current = await getSession(userId);
  const nextSession = { ...current, ...update, updated_at: new Date().toISOString() };
  
  await prisma.botSession.upsert({
      where: { key: userId.toString() },
      create: { key: userId.toString(), session: nextSession },
      update: { session: nextSession }
  });
}

async function s(botId: string, key: string, fallback: string = ''): Promise<string> {
  const now = Date.now();
  
  // 1. Get/Cache Bot Config
  let botData = botConfigCache.get(botId);
  if (!botData || (now - botData.timestamp > CACHE_TTL)) {
      const data = await prisma.bot.findUnique({ 
          where: { id: botId },
          select: { id: true, config: true, allowed_groups: true, type: true }
      });
      if (data) {
          botData = { data, timestamp: now };
          botConfigCache.set(botId, botData);
      }
  }

  // 2. Check Bot Level Setting
  const botConfig = (botData?.data?.config as any) || {};
  if (botConfig[key]) {
      return botConfig[key];
  }

  // 3. Fallback to Global Settings Cache
  const cachedGlobal = settingsCache.get(key);
  if (cachedGlobal && (now - cachedGlobal.timestamp < CACHE_TTL)) {
    return cachedGlobal.value;
  }

  // 4. Fallback to Global Settings DB
  const globalData = await prisma.settings.findUnique({ where: { key: key } });
  const value = globalData?.value || fallback;
  
  settingsCache.set(key, { value, timestamp: now });
  return value;
}

async function sendStep(ctx: Context, botId: string, imageKey: string, textKey: string, textFallback: string, displayModeKey?: string, extra?: any) {
  const [imageUrl, text, displayMode] = await Promise.all([
    s(botId, imageKey),
    s(botId, textKey, textFallback),
    displayModeKey ? s(botId, displayModeKey, 'IMAGE') : Promise.resolve('IMAGE')
  ]);

  if (displayMode === 'IMAGE' && imageUrl) {
    await ctx.replyWithPhoto(imageUrl, { caption: text, ...(extra || {}) });
  } else {
    await ctx.reply(text, extra || {});
  }
}

// --- Configure bot logic ---
export function setupBotLogic(bot: Telegraf, botId: string) {
  const STEPS = {
    START: 'START',
    WAITING_ID: 'WAITING_ID',
    CONFIRM_ID: 'CONFIRM_ID',
    ASK_PROMO: 'ASK_PROMO',
    WAITING_PROMO: 'WAITING_PROMO',
    PAYMENT_PENDING: 'PAYMENT_PENDING',
  };

  // Middleware: Optimized Heartbeat & Privacy
  bot.use(async (ctx, next) => {
    const now = Date.now();
    
    // 1. Optimized Heartbeat (Throttle to 5 mins)
    const lastSignal = lastHeartbeat.get(botId) || 0;
    if (now - lastSignal > HEARTBEAT_THROTTLE) {
        lastHeartbeat.set(botId, now);
        prisma.bot.update({ 
            where: { id: botId },
            data: { last_seen: new Date() }
        }).catch(() => {});
    }

    // 2. Cached Bot Config for Privacy Check
    let botData = botConfigCache.get(botId);
    if (!botData || (now - botData.timestamp > CACHE_TTL)) {
        const data = await prisma.bot.findUnique({ where: { id: botId } });
        if (data) {
            botData = { data, timestamp: now };
            botConfigCache.set(botId, botData);
        }
    }

    const allowed = (botData?.data?.allowed_groups as any) || [];
    
    // Check if it's an array and has items (simple check for "is restricted")
    if (Array.isArray(allowed) && allowed.length > 0) {
        const chatId = ctx.chat?.id.toString();
        
        if (ctx.chat?.type === 'private' || (chatId && !allowed.includes(chatId))) {
             return;
        }
    }
    
    return next();
  });

  // Step 1: /start
  bot.start(async (ctx) => {
    addLog(botId, ctx.from?.id, ctx.chat?.id, `Usuário iniciou o bot (/start)`, 'info');
    const btnText = await s(botId, 'btn_start', '🎮 GARANTA SEU PASSE');
    const buttons = Markup.inlineKeyboard([Markup.button.callback(btnText, 'start_flow')]);
    await sendStep(ctx, botId, 'welcome_image_url', 'welcome_message', 'Olá! Envie seu ID Free Fire para comprar seu passe.', 'welcome_display_mode', buttons);
    if (ctx.from) await updateSession(ctx.from.id, { step: STEPS.START });
  });

  // Step 2: Ask ID
  bot.action('start_flow', async (ctx) => {
    await sendStep(ctx, botId, 'ask_id_image_url', 'ask_id_text', 'Digite o ID da sua conta Free Fire:', 'ask_id_display_mode');
    if (ctx.from) await updateSession(ctx.from.id, { step: STEPS.WAITING_ID });
  });

  // Text handler
  bot.on('text', async (ctx) => {
    if (!ctx.from || !ctx.message) return;
    const userId = ctx.from.id;
    const session = await getSession(userId);
    const text = ctx.message.text.trim();

    // Step 3: Validate & Confirm ID
    if (session.step === STEPS.WAITING_ID) {
      if (!/^\d+$/.test(text)) {
        addLog(botId, userId, ctx.chat?.id, `ID Inválido enviado: ${text}`, 'warning');
        return ctx.reply('❌ ID inválido. Envie apenas números.');
      }
      addLog(botId, userId, ctx.chat?.id, `ID FF informado: ${text}`, 'info');
      const btnYes = await s(botId, 'btn_confirm_yes', '✅ Sim, Confirmar');
      const btnNo = await s(botId, 'btn_confirm_no', '❌ Não, Digitar Novamente');
      await updateSession(userId, { step: STEPS.CONFIRM_ID, ff_id: text });
      const buttons = Markup.inlineKeyboard([
        Markup.button.callback(btnYes, 'confirm_id_yes'),
        Markup.button.callback(btnNo, 'confirm_id_no'),
      ]);
      await sendStep(ctx, botId, 'confirm_id_image_url', 'confirm_id_text', `O ID enviado: ${text}\nEstá correto?`, 'confirm_id_display_mode', buttons);
      return;
    }

    // Step 5b: Process promo code
    if (session.step === STEPS.WAITING_PROMO) {
      const code = text.toUpperCase();
      addLog(botId, userId, ctx.chat?.id, `Código promo usado: ${code}`, 'info');
      
      const promo = await prisma.promoCode.findFirst({
          where: { 
              code: code, 
              is_active: true 
          }
      });
      
      const basePrice = parseFloat(await s(botId, 'pass_price', '8.00'));

      // Validate expiration logic
      let isValid = !!promo;
      if (isValid && promo) {
          if (promo.expires_at && new Date() > promo.expires_at) isValid = false;
          if (promo.max_uses && promo.max_uses > 0 && promo.used_count >= promo.max_uses) isValid = false;
      }

      if (isValid && promo) {
        const discount = promo.discount_amount || 0;
        const finalPrice = Math.max(0, basePrice - discount);
        
        // Increment usage
        await prisma.promoCode.update({
            where: { code: promo.code },
            data: { used_count: { increment: 1 } }
        });

        addLog(botId, userId, ctx.chat?.id, `Promo validada! Preço: ${finalPrice}`, 'success');
        await ctx.reply(`✅ Código ${code} aplicado! Desconto de R$ ${discount.toFixed(2)}.`);
        await generatePayment(ctx, finalPrice, session.ff_id, botId);
      } else {
        addLog(botId, userId, ctx.chat?.id, `Promo inválida/expirada: ${code}`, 'warning');
        const btnRetry = await s(botId, 'btn_retry_promo', '🔄 Tentar Novamente');
        const btnNo = await s(botId, 'btn_no_promo', '➡️ Sem Desconto');
        await ctx.reply('Código inválido ou expirado.', Markup.inlineKeyboard([
          Markup.button.callback(btnRetry, 'ask_promo_yes'),
          Markup.button.callback(`${btnNo} (R$ ${basePrice.toFixed(2)})`, 'promo_no'),
        ]));
      }
    }
  });

  // Step 3b: Confirm YES -> Ask promo
  bot.action('confirm_id_yes', async (ctx) => {
    if (!ctx.from) return;
    const btnYes = await s(botId, 'btn_promo_yes', '🏷️ Sim, Tenho Código');
    const btnNo = await s(botId, 'btn_promo_no', '➡️ Não, Prosseguir');
    const buttons = Markup.inlineKeyboard([
      Markup.button.callback(btnYes, 'ask_promo_yes'),
      Markup.button.callback(btnNo, 'ask_promo_no'),
    ]);
    await updateSession(ctx.from.id, { step: STEPS.ASK_PROMO });
    await sendStep(ctx, botId, 'ask_promo_image_url', 'ask_promo_text', 'Você possui um código promocional?', 'ask_promo_display_mode', buttons);
  });

  // Step 3c: Confirm NO -> Ask ID again
  bot.action('confirm_id_no', async (ctx) => {
    if (!ctx.from) return;
    await updateSession(ctx.from.id, { step: STEPS.WAITING_ID });
    await sendStep(ctx, botId, 'ask_id_image_url', 'ask_id_text', 'Ok, digite o ID novamente:', 'ask_id_display_mode');
  });

  // Step 5a: Wants promo
  bot.action('ask_promo_yes', async (ctx) => {
    if (!ctx.from) return;
    await updateSession(ctx.from.id, { step: STEPS.WAITING_PROMO });
    await sendStep(ctx, botId, 'ask_promo_code_image_url', 'ask_promo_code_text', 'Digite seu código promocional:', 'ask_promo_code_display_mode');
  });

  // Step 5c: Skip promo
  bot.action('ask_promo_no', async (ctx) => {
    if (!ctx.from) return;
    const session = await getSession(ctx.from.id);
    const price = parseFloat(await s(botId, 'pass_price', '8.00'));
    await generatePayment(ctx, price, session.ff_id, botId);
  });

  // Step 5d: Invalid promo, skip
  bot.action('promo_no', async (ctx) => {
    if (!ctx.from) return;
    const session = await getSession(ctx.from.id);
    const price = parseFloat(await s(botId, 'pass_price', '8.00'));
    await generatePayment(ctx, price, session.ff_id, botId);
  });

  // Check payment
  bot.action('check_payment', async (ctx) => {
    if (!ctx.from) return;
    try {
      await ctx.answerCbQuery('⏳ Verificando...');
      const session = await getSession(ctx.from.id);
      let txId = session.tx_id;
      
      if (!txId) {
          const order = await prisma.order.findFirst({
             where: {
                 user_id: ctx.from.id.toString(),
                 status: 'pending'
             },
             orderBy: { created_at: 'desc' }
          });
          if (order) txId = order.transaction_id || order.id; 
      }

      if (!txId) return ctx.reply('⚠️ Nenhuma transação pendente encontrada.');

      const status = await MercadoPago.checkPixStatus(txId);

      if (status.paid) {
          addLog(botId, ctx.from.id, ctx.chat?.id, `Pagamento identificado via botão! TX: ${txId}`, 'success');
          
          const currentOrder = await prisma.order.findUnique({ where: { transaction_id: txId } });
          
          if (currentOrder?.status === 'delivered' || currentOrder?.status === 'paid') {
              try { await ctx.deleteMessage(); } catch(e) {}
              return;
          }

          try { await ctx.deleteMessage(); } catch(e) {}
          const statusMsg = await ctx.reply('⌛ Pagamento confirmado! <b>Enviando passe booyah!...</b>', { parse_mode: 'HTML' });
          
          await prisma.order.update({
              where: { id: currentOrder?.id },
              data: { status: 'paid', updated_at: new Date() }
          });

          // Delivery Logic
          try {
             let ffId = session.ff_id;
             let metadata: any = currentOrder?.items;
             
             if (!ffId && metadata) {
                 ffId = metadata.ff_id;
             }

             if (!ffId) throw new Error('FF ID not found');

             const likesResponse = await LikesFF.sendPass(ffId);
             
             if (likesResponse.error === false || likesResponse.status === 'success' || likesResponse.msg?.includes('sucesso')) {
                 const nick = likesResponse.nick || likesResponse.nickname || 'Jogador';
                 addLog(botId, ctx.from.id, ctx.chat?.id, `Passe enviado com sucesso para ${nick} (${ffId})`, 'success');
                 
                 await prisma.order.update({
                     where: { id: currentOrder?.id },
                     data: {
                         status: 'delivered',
                         customer_email: nick, 
                         items: { 
                             ...(metadata as object),
                             ff_id: ffId, 
                             likesff_response: likesResponse,
                             delivery_time: new Date().toISOString()
                         } 
                     }
                 });

                 await ctx.telegram.editMessageText(ctx.chat?.id, statusMsg.message_id, undefined, `✅ <b>Passe Booyah! Enviado!</b>\n\nJogador: <b>${nick}</b>\nID: <code>${ffId}</code>\n\n<i>Lembre-se: Cada conta Free Fire só pode receber 1 passe por mês.</i>`, { parse_mode: 'HTML' });
                 await updateSession(ctx.from.id, { step: 'COMPLETED' });

             } else {
                 throw new Error(likesResponse.msg || 'Erro na entrega');
             }

          } catch (deliveryError: any) {
              addLog(botId, ctx.from.id, ctx.chat?.id, `Erro na entrega: ${deliveryError.message}`, 'error');
              await ctx.telegram.editMessageText(ctx.chat?.id, statusMsg.message_id, undefined, `⚠️ Pagamento confirmado, mas houve um erro no envio automático: ${deliveryError.message}\n\nPor favor, contate o suporte.`);
          }
      } else {
          await ctx.reply('⏳ Pagamento ainda não identificado. Aguarde alguns segundos e tente novamente.');
      }
    } catch (e) {
      console.error('Check payment error:', e);
      await ctx.reply('❌ Erro ao verificar. Tente novamente.');
    }
  });

  // --- Payment ---
  async function generatePayment(ctx: Context, amount: number, ff_id: string, botId: string) {
    if (!ctx.from) return;
    const customer = {
      name: `${ctx.from.first_name} ${ctx.from.last_name || ''}`.trim(),
      email: 'user@example.com',
      document: '00000000000',
    };

    try {
      const pixData = await MercadoPago.generatePix({ amount, description: `Pass Booyah - ID: ${ff_id}`, customer });
      const pixCode = pixData.qr_code || '';

      addLog(botId, ctx.from.id, ctx.chat?.id, `Gerado Pix de R$ ${amount.toFixed(2)} para ID FF: ${ff_id}`, 'info');

      // Create Order
      const order = await prisma.order.create({
          data: {
              user_id: ctx.from.id.toString(),
              amount: amount,
              status: 'pending',
              transaction_id: pixData.id.toString(),
              payment_method: 'pix',
              items: {
                  bot_id: botId,
                  ff_id: ff_id,
                  customer_name: customer.name
              }
          }
      });

      await updateSession(ctx.from.id, { step: 'PAYMENT_PENDING', pix_code: pixCode, tx_id: pixData.id });

      const caption = `💰 Valor: R$ ${amount.toFixed(2)}\n\n📋 Código Pix (clique para copiar):\n\n<code>${pixCode}</code>\n\n⚠️ <b>Aviso:</b> Cada conta Free Fire só pode adquirir 1 passe por mês através deste sistema.`;

      let paymentMsg;
      if (pixData.qr_code_base64) {
        paymentMsg = await ctx.replyWithPhoto(
          { source: Buffer.from(pixData.qr_code_base64, 'base64') },
          { caption, parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('✅ Confirmar Pagamento', 'check_payment')]]) }
        );
      } else {
        paymentMsg = await ctx.reply(caption, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('✅ Confirmar Pagamento', 'check_payment')]]) });
      }

      if (order && paymentMsg) {
         // Update metadata with message_id
         const newMeta = { ...(order.items as object), payment_message_id: paymentMsg.message_id, chat_id: ctx.chat?.id };
         await prisma.order.update({
             where: { id: order.id },
             data: { items: newMeta }
         });
      }
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      console.error(`[BOT-ERR] Falha ao gerar Pix:`, errorMsg);
      addLog(botId, ctx.from?.id, ctx.chat?.id, `Erro ao gerar pagamento: ${errorMsg}`, 'error');
      await ctx.reply(`❌ <b>Erro na Geração do Pix</b>\n\n<code>${errorMsg}</code>\n\nO erro foi registrado e o suporte foi avisado.`, { parse_mode: 'HTML' });
    }
  }
}

// ===== PUBLIC API =====

export async function isRunning(botId: string): Promise<boolean> {
  if (runningBots.has(botId)) return true;
  
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  return !!(bot?.use_webhooks && bot?.status === 'active');
}

export function getRunningBots(): string[] {
  return Array.from(runningBots.keys());
}

export async function startBot(botId: string, token: string): Promise<{ success: boolean; error?: string }> {
  if (runningBots.has(botId)) {
    const oldBot = runningBots.get(botId);
    oldBot?.stop('Restarting');
    runningBots.delete(botId);
  }

  try {
    const bot = new Telegraf(token);
    setupBotLogic(bot, botId);

    const botInfo = await prisma.bot.findUnique({ where: { id: botId } });

    if (botInfo?.use_webhooks && botInfo?.webhook_url) {
        await bot.telegram.setWebhook(botInfo.webhook_url);
        console.log(`✅ Bot ${botId} configurado com Webhook: ${botInfo.webhook_url}`);
    } else {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        bot.launch();
        console.log(`✅ Bot ${botId} iniciado com polling.`);
    }

    runningBots.set(botId, bot);
    
    await prisma.bot.update({
        where: { id: botId },
        data: { status: 'active', last_seen: new Date() }
    });
    
    addLog(botId, undefined, undefined, `Bot iniciado (Modo: ${botInfo?.use_webhooks ? 'Webhook' : 'Polling'})`, 'success');
    return { success: true };
  } catch (e: any) {
    console.error(`❌ Erro ao iniciar bot ${botId}:`, e.message);
    return { success: false, error: e.message };
  }
}

export async function stopBot(botId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[STOP] Parando bot ${botId}...`);
    const botInfo = await prisma.bot.findUnique({ where: { id: botId } });
    
    if (!botInfo) return { success: false, error: 'Bot não encontrado no banco.' };

    // 1. Stop polling instance if running in this process
    const runningInstance = runningBots.get(botId);
    if (runningInstance) {
      try {
        runningInstance.stop('Stopped from panel');
      } catch (e) {}
      runningBots.delete(botId);
    }

    // 2. Clear webhook at Telegram (if token exists)
    if (botInfo.token) {
      try {
        const bot = new Telegraf(botInfo.token);
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log(`[STOP] Webhook deletado para o bot ${botId}`);
      } catch (e: any) {
        console.warn(`[STOP] Erro ao deletar webhook (ignorando): ${e.message}`);
      }
    }

    // 3. Update Status and Log
    await prisma.bot.update({
        where: { id: botId },
        data: { status: 'inactive' }
    });
    
    await addLog(botId, undefined, undefined, `Bot parado pelo painel`, 'warning');

    console.log(`[STOP] Bot ${botId} parado com sucesso.`);
    return { success: true };
  } catch (e: any) {
    console.error(`❌ Erro fatal ao parar bot ${botId}:`, e.message);
    return { success: false, error: e.message };
  }
}

export async function syncBots() {
  console.log('🔄 Sincronizando bots ativos...');
  try {
    const activeBots = await prisma.bot.findMany({
        where: { status: 'active' }
    });

    if (!activeBots) return { success: true, restarted: 0 };

    let restarted = 0;
    for (const bot of activeBots) {
      if (!runningBots.has(bot.id) && bot.token) {
        console.log(`[SYNC] Reiniciando bot: ${bot.name} (${bot.id})`);
        await startBot(bot.id, bot.token);
        restarted++;
      }
    }
    return { success: true, restarted };
  } catch (e: any) {
    console.error('[SYNC] Erro ao sincronizar bots:', e.message);
    return { success: false, error: e.message };
  }
}

if (typeof process !== 'undefined') {
  const cleanup = () => {
    runningBots.forEach((bot, id) => {
      bot.stop('Process exit');
      console.log(`Bot ${id} stopped on exit.`);
    });
  };
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
}

export async function notifyPaymentProcessed(txId: string) {
  console.log(`[NOTIFY] 🚀 Iniciando entrega para TX: ${txId}`);
  try {
    const order = await prisma.order.findUnique({
      where: { transaction_id: txId } // Requires @unique on transaction_id
    });
    
    if (!order) {
      console.error('[NOTIFY] ❌ Ordem não encontrada para transação:', txId);
      return;
    }

    let botToken, botId;
    const orderItems: any = order.items || {};

    // Get Bot ID from metadata/items (we stored it there)
    botId = orderItems.bot_id; 

    if (botId) {
        const bot = await prisma.bot.findUnique({ where: { id: botId } });
        botToken = bot?.token;
    }

    if (!botToken || !botId) {
      console.error('[NOTIFY] ❌ Bot ou Token não encontrados para a ordem:', order.id);
      return;
    }

    console.log(`[NOTIFY] 🤖 Bot identificado: ${botId}. Registrando log de início...`);
    await addLog(botId, order.user_id, undefined, `Pagamento identificado (TX: ${txId}). Processando entrega...`, 'success');

    const bot = new Telegraf(botToken);
    
    const chatId = orderItems.chat_id || order.user_id;
    const paymentMsgId = orderItems.payment_message_id;

    // Tentar apagar a mensagem com o QR Code
    if (paymentMsgId) {
      try { 
        await bot.telegram.deleteMessage(chatId, paymentMsgId); 
        console.log(`[NOTIFY] 🗑️ Mensagem de pagamento apagada.`);
      } catch (e) {
        console.warn(`[NOTIFY] ⚠️ Não foi possível apagar a mensagem ${paymentMsgId}`);
      }
    }

    // Enviar mensagem de processamento
    console.log(`[NOTIFY] 💬 Enviando aviso de "Enviando Passe" para chat ${chatId}...`);
    const statusMsg = await bot.telegram.sendMessage(chatId, '⌛ <b>Pagamento confirmado!</b>\nEstamos enviando o seu passe agora mesmo...', { parse_mode: 'HTML' });

    // LikesFF logic
    // We already do this in check_payment, but webhook might trigger this separately
    // If order is already Delivered, stop
    if (order.status === 'delivered') return;

    const ffId = orderItems.ff_id;
    
    if (!ffId) {
      console.error('[NOTIFY] ❌ ID FF não encontrado na metadata da ordem!');
      await addLog(botId, order.user_id, chatId, `Erro: ID FF não encontrado na ordem`, 'error');
      await bot.telegram.editMessageText(chatId, statusMsg.message_id, undefined, '⚠️ <b>Erro:</b> Seu ID Free Fire não foi encontrado nos dados do pedido. Entre em contato com o suporte.');
      return;
    }

    try {
      console.log(`[NOTIFY] 🌐 Chamando API LikesFF para ID: ${ffId}...`);
      const likesResponse = await LikesFF.sendPass(ffId);
      console.log('[NOTIFY] 📥 Resposta LikesFF:', JSON.stringify(likesResponse));

      const isSuccess = likesResponse.error === false || 
                        likesResponse.status === 'success' || 
                        likesResponse.msg?.toLowerCase().includes('sucesso') ||
                        likesResponse.msg?.toLowerCase().includes('success');

      if (isSuccess) {
        const nick = likesResponse.nick || likesResponse.nickname || likesResponse.data?.nick || 'Jogador';
        console.log(`[NOTIFY] ✅ Entrega confirmada para: ${nick}`);
        
        await addLog(botId, order.user_id, chatId, `Passe enviado com sucesso para ${nick} (ID: ${ffId})`, 'success');
        
        // Atualizar status final no banco
        await prisma.order.update({ 
          where: { id: order.id },
          data: { 
            status: 'delivered', 
            customer_email: nick, // Store Nick
            items: { ...orderItems, likesff_response: likesResponse, delivery_time: new Date().toISOString() } 
          }
        });

        await bot.telegram.editMessageText(chatId, statusMsg.message_id, undefined, `✅ <b>Passe Booyah! Enviado!</b>\n\nJogador: <b>${nick}</b>\nID: <code>${ffId}</code>\n\nObrigado pela compra!`, { parse_mode: 'HTML' });
      } else {
        const errMsg = likesResponse.msg || likesResponse.message || 'Erro desconhecido na API de entrega.';
        console.error('[NOTIFY] ❌ Falha informada pela LikesFF:', errMsg);
        
        await addLog(botId, order.user_id, chatId, `Falha na entrega: ${errMsg}`, 'error');
        await bot.telegram.editMessageText(chatId, statusMsg.message_id, undefined, `⚠️ <b>Ops! Ocorreu um problema no envio.</b>\n\nMotivo: ${errMsg}\n\nO suporte já foi avisado e processará seu envio manualmente.`, { parse_mode: 'HTML' });
      }
    } catch (e: any) {
      console.error('[NOTIFY] ❌ Erro técnico ao chamar LikesFF:', e.message);
      await addLog(botId, order.user_id, chatId, `Erro técnico LikesFF: ${e.message}`, 'error');
      await bot.telegram.editMessageText(chatId, statusMsg.message_id, undefined, `⚠️ <b>Erro técnico no processamento.</b>\nSeu pagamento foi confirmado, mas o sistema de envio automático falhou. O suporte fará a entrega manual brevemente.`);
    }
  } catch (error: any) {
    console.error('[NOTIFY] ❌ Erro crítico no processo notifyPaymentProcessed:', error.message);
  }
}
