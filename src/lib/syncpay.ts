import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
// TENTEI AJUSTAR AS URLS NO MODO TENTATIVA E ERRO:
const SYNC_BASE_URL = 'https://api.syncpayments.com.br/api/partner/v1'; 
const SYNC_AUTH_URL = `${SYNC_BASE_URL}/auth-token`; // 🚀 URL CERTA!
const SYNC_CASH_IN_URL = `${SYNC_BASE_URL}/cash-in`;

// Initialize Supabase settings client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- TOKEN CACHE ---
let cachedToken: string | null = null;
let tokenExpiration: number = 0;

// Helper to get settings
async function getSetting(key: string): Promise<string> {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single();
  return data?.value || '';
}

// --- AUTHENTICATION ---
async function getSyncPayToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached if valid (buffer 5 mins)
  if (cachedToken && tokenExpiration - now > 300) {
    return cachedToken;
  }

  const clientId = await getSetting('syncpay_client_key') || process.env.SYNCPAY_CLIENT_KEY;
  const clientSecret = await getSetting('syncpay_client_secret') || process.env.SYNCPAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SyncPay Client ID/Secret not configured. Configure no painel ou .env');
  }

  console.log(`🔑 Tentando autenticar na SyncPay...`);
  console.log(`🔗 URL: ${SYNC_AUTH_URL}`);

  // Request new token
  try {
    const response = await fetch(SYNC_AUTH_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ SyncPay Auth Error (${response.status}):`, errText);
        
        // Se der 404, avisa para trocar URL
        if (response.status === 404) {
             console.error('⚠️ A URL de Autenticação parece estar errada! Verifique a documentação.');
        }
        
        throw new Error(`SyncPay Auth Failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    console.log('✅ SyncPay Token obtido com sucesso!');
    
    cachedToken = data.access_token;
    const expiresIn = data.expires_in || 3600; 
    tokenExpiration = now + expiresIn;

    return cachedToken!;
  } catch (error) {
    console.error('Error fetching SyncPay token:', error);
    throw error;
  }
}

// --- GENERATE PIX ---

interface GeneratePixParams {
  amount: number; // in Reais (float)
  description: string;
  customer?: any;
}

export async function generatePix({ amount, description }: GeneratePixParams) {
  try {
    // 1. Get Token
    const token = await getSyncPayToken();
    
    // 2. Webhook URL (Callback) - Usando Supabase Edge Function como Webhook Principal
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseWebhook = supabaseUrl.includes('.supabase.co') 
      ? `${supabaseUrl}/functions/v1/syncpay-webhook`
      : '';

    const webhookUrl = supabaseWebhook || 
      (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/syncpay/webhook` : 'https://meusite.com.br/api/syncpay/webhook');

    const payload = {
      amount: amount, // Float in BRL
      description: description,
      webhook_url: webhookUrl
    };

    console.log(`💰 Gerando Pix na SyncPay...`);
    console.log(`🔗 URL: ${SYNC_CASH_IN_URL}`);

    const response = await fetch(SYNC_CASH_IN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ SyncPay Cash-In Error (${response.status}):`, errText);
        throw new Error(`SyncPay Pix Generation Failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    console.log('✅ Pix Gerado:', data.identifier || data.pix_code);
    
    // Extract fields
    const pixCode = data.pix_code || data.qr_code;
    const txId = data.identifier || data.id;

    // Generate QR Code Image (Base64) locally
    let qrCodeBase64 = '';
    if (pixCode) {
        qrCodeBase64 = await QRCode.toDataURL(pixCode);
        qrCodeBase64 = qrCodeBase64.replace(/^data:image\/png;base64,/, '');
    }

    return {
        id: txId,
        qr_code: pixCode,
        qr_code_base64: qrCodeBase64,
        raw: data
    };

  } catch (error) {
    console.error('Generate Pix Fatal Error:', error);
    throw error;
  }
}

// --- CHECK STATUS ---
export async function checkPixStatus(txId: string) {
  try {
    const token = await getSyncPayToken();
    const url = `${SYNC_CASH_IN_URL}/${txId}`; // GET /cash-in/{id}
    
    console.log(`🔎 Verificando status Pix: ${txId}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
        // Se der 404, talvez o ID esteja errado ou o endpoint seja diferente
        // Tentar endpoint de query? (Geralmente é GET no resource base)
        console.error(`Status Check Failed: ${response.status}`);
        return { paid: false, status: 'UNKNOWN' };
    }

    const data = await response.json();
    console.log('✅ Status Pix:', data.status);
    
    // Status possíveis SyncPay (chute educado ou padrão): PAID, APPROVED, COMPLETED
    const isPaid = ['PAID', 'APPROVED', 'COMPLETED', 'CONFIRMED'].includes(data.status?.toUpperCase());
    
    return { 
        paid: isPaid, 
        status: data.status,
        original: data
    };

  } catch (error) {
    console.error('Check Status Error:', error);
    return { paid: false, status: 'ERROR' };
  }
}
