
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndAdd() {
  const { data: bot } = await supabase.from('bots').select().limit(1).single();
  if (bot && bot.config !== undefined) {
    console.log('COLUMN_EXISTS');
  } else {
    // Attempting SQL via RPC if enabled
    const { error } = await supabase.rpc('execute_sql', { 
        sql_query: 'ALTER TABLE bots ADD COLUMN IF NOT EXISTS config JSONB DEFAULT \'{}\';' 
    });
    if (error) console.log('ERROR: ' + error.message);
    else console.log('SUCCESS');
  }
}

checkAndAdd();
