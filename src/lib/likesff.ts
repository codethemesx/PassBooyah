import axios from 'axios';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LIKESFF_API_KEY_FALLBACK = 'LIKESFF-PB8OHF7CDGDPWJ2JE';
const LIKESFF_BASE_URL = 'https://likesff.online/api/PASS';

export async function sendPass(playerId: string) {
  try {
    // 1. Get settings from DB
    const { data: settings } = await supabase.from('settings').select('key, value').in('key', ['likesff_api_key', 'likesff_email']);
    
    const apiKey = settings?.find(s => s.key === 'likesff_api_key')?.value || LIKESFF_API_KEY_FALLBACK;
    const email = settings?.find(s => s.key === 'likesff_email')?.value;

    const params: any = {
      mode: 'send',
      key: apiKey,
      id: playerId
    };
    
    if (email) params.email = email;

    const response = await axios.get(`${LIKESFF_BASE_URL}`, { params });
    return response.data;
  } catch (error) {
    console.error('Error sending pass:', error);
    throw error;
  }
}

export async function checkBalance(apiKey?: string, email?: string) {
  try {
    const params: any = {
      mode: 'info',
      key: apiKey || LIKESFF_API_KEY_FALLBACK
    };
    if (email) params.email = email;

    const response = await axios.get(`${LIKESFF_BASE_URL}`, { params });
    return response.data;
  } catch (error) {
    console.error('Error checking balance:', error);
    throw error;
  }
}
