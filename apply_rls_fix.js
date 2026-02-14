
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');


// Carregar variáveis de ambiente manualmente se dotenv não estiver instalado ou falhar
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Role Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const sql = fs.readFileSync('fix_promo_rls.sql', 'utf8');
        
        console.log('Executing SQL...');
        // Try via RPC first if 'exec_sql' or similar exists, otherwise try direct unsafe execution if possible via client lib 
        // (Supabase JS client usually doesn't create tables unless using specific service features or RPC)
        
        // Since we don't have a guaranteed RPC for raw SQL, we will use a workaround or assuming the user has an RPC function 'exec_sql' or similar from previous context.
        // However, looking at migrate_simple.js, it uses 'execute_sql'. Let's try that.
        
        const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
        
        if (error) {
            console.error('RPC Error:', error.message);
            // Fallback: If RPC fails, we might need manual intervention or use another method.
            // But for now, let's assume the project has the 'execute_sql' function as seen in migrate_simple.js
        } else {
            console.log('Successfully applied RLS policies!');
        }
    } catch (e) {
        console.error('Script Error:', e.message);
    }
}

run();
