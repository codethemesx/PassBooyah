
import { createClient } from '@supabase/supabase-js';
import { Telegraf } from 'telegraf';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function cleanBots() {
  console.log('🧹 Cleaning up bots...');
  
  // 1. Get all bots
  const { data: bots } = await supabase.from('bots').select('*');
  
  if (!bots || bots.length === 0) {
    console.log('No bots found in DB.');
    return;
  }

  for (const botData of bots) {
    if (!botData.token) continue;
    try {
      const bot = new Telegraf(botData.token);
      
      // Delete Webhook
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      console.log(`✅ Webhook deleted for bot ${botData.name}`);
      
      // Stop polling set status inactive
      await supabase.from('bots').update({ status: 'inactive' }).eq('id', botData.id);
      
    } catch (e: any) {
      console.error(`❌ Error cleaning bot ${botData.name}:`, e.message);
    }
  }
  
  console.log('✨ All bots cleaned and reset to inactive.');
}

cleanBots();
