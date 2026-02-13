
import { createClient } from '@supabase/supabase-js';

// Setup Supabase locally just to get settings
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testAuth() {
    console.log('🔍 Iniciando busca pela URL de Auth da SyncPay...');

    // 1. Get Credentials
    const { data: k } = await supabase.from('settings').select('value').eq('key', 'syncpay_client_key').single();
    const { data: s } = await supabase.from('settings').select('value').eq('key', 'syncpay_client_secret').single();
    
    const clientId = k?.value || process.env.SYNCPAY_CLIENT_KEY;
    const clientSecret = s?.value || process.env.SYNCPAY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('❌ Credenciais não configuradas!');
        process.exit(1);
    }
    console.log('✅ Credenciais carregadas.');

    // 2. URLs to Test
    const urls = [
        'https://api.syncpayments.com.br/api/partner/v1/auth-token',
        'https://api.syncpayments.com.br/api/partner/v1/auth',
        'https://api.syncpayments.com.br/api/partner/v1/token',
        'https://api.syncpayments.com.br/api/auth/token',
    ];

    for (const url of urls) {
        console.log(`\n👉 Testando: ${url}`);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json' 
                },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'client_credentials'
                })
            });

            console.log(`   Status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('🎉 SUCESSO! Token recebido:', data.access_token?.substring(0, 10) + '...');
                console.log(`✅ A URL CORRETA É: ${url}`);
                process.exit(0);
            } else {
                // Se for 401 ou 422, a URL existe mas param tá errado (o que é um bom sinal sobre a URL)
                if (response.status === 401 || response.status === 422) {
                     console.log('ℹ️ URL parece correta, mas credenciais/body rejeitados.');
                }
            }
        } catch (e: any) {
            console.log(`   Erro de conexão: ${e.message}`);
        }
    }
    
    console.log('\n❌ Nenhuma URL funcionou de primeira.');
}

testAuth();
