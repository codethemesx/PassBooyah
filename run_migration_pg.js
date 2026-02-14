
const { Client } = require('pg');

const connectionString = 'postgres://postgres:%23Tatarav025@db.oyqstfiiwdszujrzdfdr.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database');

    const sql = `
      ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER;
      ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;
      ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
    `;

    await client.query(sql);
    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
