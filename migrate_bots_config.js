
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addConfigColumn() {
  console.log('Adding config column to bots table if not exists...');
  const { error } = await supabase.rpc('execute_sql', { 
    sql_query: 'ALTER TABLE bots ADD COLUMN IF NOT EXISTS config JSONB DEFAULT \'{}\';' 
  });
  
  if (error) {
    console.log('RPC execute_sql failed, trying direct select to confirm current columns.');
    const { data: bot } = await supabase.from('bots').select().limit(1).single();
    if (bot && bot.config !== undefined) {
      console.log('Column "config" already exists.');
    } else {
      console.error('Could not add "config" column and it is not present. Please add it manually via Supabase dashboard: ALTER TABLE bots ADD COLUMN config JSONB DEFAULT \'{}\';');
    }
  } else {
    console.log('Successfully added "config" column.');
  }
}

addConfigColumn();
