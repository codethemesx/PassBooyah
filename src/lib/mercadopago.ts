import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Initialize Supabase settings client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper to get settings
async function getSetting(key: string): Promise<string> {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single();
  return data?.value || '';
}

// --- MERCADO PAGO INTEGRATION ---

interface GeneratePixParams {
  amount: number;
  description: string;
  customer?: {
    name: string;
    email: string;
    document: string;
  };
}

export async function generatePix({ amount, description, customer }: GeneratePixParams) {
  try {
    const accessToken = await getSetting('mercadopago_access_token');

    if (!accessToken) {
      throw new Error('Mercado Pago Access Token não configurado no painel.');
    }

    console.log(`🔑 Gerando Pix via Mercado Pago (Valor: R$ ${amount})...`);

    const payload = {
      transaction_amount: amount,
      description: description,
      payment_method_id: 'pix',
      notification_url: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/webhook`
        : undefined,
      payer: {
        email: customer?.email || 'customer@example.com',
        first_name: customer?.name.split(' ')[0] || 'Cliente',
        last_name: customer?.name.split(' ').slice(1).join(' ') || 'PassBooyah',
        identification: {
          type: 'CPF',
          number: customer?.document || '00000000000'
        }
      }
    };

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json();
        console.error('❌ Mercado Pago Error:', JSON.stringify(err));
        throw new Error(`MP Error: ${err.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Extract Pix data
    const pixData = data.point_of_interaction?.transaction_data;
    const pixCode = pixData?.qr_code;
    const txId = data.id.toString();

    console.log(`✅ Pix Gerado! ID MP: ${txId}`);

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

  } catch (error: any) {
    console.error('Fatal Error Mercado Pago:', error.message);
    throw error;
  }
}

export async function checkPixStatus(txId: string) {
  try {
    const accessToken = await getSetting('mercadopago_access_token');
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${txId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) return { paid: false, status: 'ERROR' };

    const data = await response.json();
    console.log(`🔎 Status MP (${txId}): ${data.status}`);

    const isPaid = data.status === 'approved';
    
    return { 
        paid: isPaid, 
        status: data.status,
        original: data
    };
  } catch (error) {
    console.error('Check MP Status Error:', error);
    return { paid: false, status: 'ERROR' };
  }
}
