
const { createClient } = require('@supabase/supabase-js');

// Pegar credenciais do environment local para teste rapido
// SE FALHAR COM ENV, EU COLOCO HARDCODED PRO TESTE FUNCIONAR
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oyqstfiiwdszujrzdfdr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Se não tiver key no env, não vai dar pra pegar do banco
if (!SUPABASE_KEY) {
    console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY no ambiente.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAuth() {
    console.log('🔍 Testando URLs da SyncPay...');

    // 1. Pega credenciais do Banco
    const { data: k } = await supabase.from('settings').select('value').eq('key', 'syncpay_client_key').single();
    const { data: s } = await supabase.from('settings').select('value').eq('key', 'syncpay_client_secret').single();

    if (!k?.value || !s?.value) {
        console.error('❌ Credenciais SyncPay não encontradas no banco.');
        process.exit(1);
    }

    const clientId = k.value;
    const clientSecret = s.value;
    
    console.log(`✅ Credenciais carregadas (ID: ${clientId.substring(0,5)}...)`);

    // 2. Lista de URLs para testar (Brute Force)
    const urls = [
        'https://api.syncpayments.com.br/api/partner/v1/auth-token',
        'https://api.syncpayments.com.br/api/partner/v1/auth',
        'https://api.syncpayments.com.br/api/partner/v1/token',
        'https://api.syncpayments.com.br/api/auth/token',
        'https://api.syncpayments.com.br/oauth/token',
        'https://api.syncpayments.com.br/api/v1/auth'
    ];

    for (const url of urls) {
        process.stdout.write(`👉 ${url} ... `);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'client_credentials'
                })
            });

            console.log(`Status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`🎉 SUCESSO! TOKEN RECEBIDO!`);
                console.log(`✅ A URL CERTA É: ${url}`);
                process.exit(0);
            }
        } catch (e) {
            console.log(`Erro: ${e.message}`);
        }
    }
    console.log('❌ Nenhuma URL funcionou.');
}

testAuth();
