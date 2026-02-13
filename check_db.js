
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'bots' });
  if (error) {
    // If RPC doesn't exist, try a simple select
    console.log('Trying simple select...');
    const { data: bot } = await supabase.from('bots').select().limit(1).single();
    console.log('Bot keys:', Object.keys(bot || {}));
  } else {
    console.log('Table info:', data);
  }
}

checkSchema();
