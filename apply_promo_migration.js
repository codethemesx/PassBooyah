
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Carregar variáveis de ambiente manualmente
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const sql = fs.readFileSync('add_promo_fields.sql', 'utf8');
        console.log('Executing SQL Migration...');
        
        // Tentativa 1: RPC (se existir)
        const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
        
        if (error) {
            console.error('RPC Error:', error.message);
            console.log('Trying alternative method not possible via client without RPC. Please run SQL manually if this fails.');
        } else {
            console.log('Successfully added columns!');
        }
    } catch (e) {
        console.error('Script Error:', e.message);
    }
}

run();
