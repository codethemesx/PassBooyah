-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users if needed, or just for profile info)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bots table
CREATE TABLE IF NOT EXISTS public.bots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id),
  token TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active',
  is_private BOOLEAN DEFAULT false,
  allowed_groups JSONB DEFAULT '[]'::jsonb,
  use_webhooks BOOLEAN DEFAULT false,
  webhook_url TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Orders/Transactions table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_id UUID REFERENCES public.bots(id),
  customer_id TEXT NOT NULL, -- Telegram User ID
  customer_name TEXT, -- Telegram Name
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, failed, delivered
  external_id TEXT, -- SyncPay ID
  product_type TEXT DEFAULT 'passbooya',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Settings/Promo Codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  code TEXT PRIMARY KEY,
  discount_amount DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default promo code
INSERT INTO public.promo_codes (code, discount_amount) VALUES ('SZPASSFF', 2.00) ON CONFLICT DO NOTHING;

-- RLS Policies (Basic)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Allow bot owners to view their bots
CREATE POLICY "Users can view own bots" ON public.bots FOR SELECT USING (auth.uid() = owner_id);

-- Allow bot owners to view orders for their bots?
-- For now, maybe just open for admin or simple policy.


-- System Settings (key-value store for all configs)
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT, -- Human-readable label for the UI
  category TEXT DEFAULT 'geral', -- geral, api, bot, pagamento
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public settings access" ON public.settings FOR ALL USING (true);

-- Insert default settings
INSERT INTO public.settings (key, value, label, category) VALUES
  -- Pagamento
  ('pass_price', '8.00', 'Preco do Passe (R$)', 'pagamento'),
  -- Bot: Step 1 - Welcome
  ('welcome_image_url', '', 'Imagem: Boas-Vindas', 'bot'),
  ('welcome_message', 'Ola! Para adquirir seu Pass Booyah, envie seu ID Free Fire.', 'Texto fallback: Boas-Vindas', 'bot'),
  ('btn_start', '🎮 GARANTA SEU PASSE', 'Botao: Iniciar Compra', 'bot'),
  -- Bot: Step 2 - Pedir ID
  ('ask_id_image_url', '', 'Imagem: Pedir ID', 'bot'),
  ('ask_id_text', 'Digite o ID da sua conta Free Fire:', 'Texto fallback: Pedir ID', 'bot'),
  -- Bot: Step 3 - Confirmar ID
  ('confirm_id_image_url', '', 'Imagem: Confirmar ID', 'bot'),
  ('btn_confirm_yes', '✅ Sim, Confirmar', 'Botao: Confirmar ID (Sim)', 'bot'),
  ('btn_confirm_no', '❌ Nao, Digitar Novamente', 'Botao: Confirmar ID (Nao)', 'bot'),
  -- Bot: Step 4 - Promo
  ('ask_promo_image_url', '', 'Imagem: Codigo Promocional?', 'bot'),
  ('btn_promo_yes', '🏷️ Sim, Tenho Codigo', 'Botao: Tem Promo (Sim)', 'bot'),
  ('btn_promo_no', '➡️ Nao, Prosseguir', 'Botao: Tem Promo (Nao)', 'bot'),
  -- Bot: Step 5 - Digitar Codigo
  ('ask_promo_code_image_url', '', 'Imagem: Digitar Codigo', 'bot'),
  ('ask_promo_code_text', 'Digite seu codigo promocional:', 'Texto fallback: Digitar Codigo', 'bot'),
  ('btn_retry_promo', '🔄 Tentar Novamente', 'Botao: Tentar Promo de Novo', 'bot'),
  ('btn_no_promo', '➡️ Sem Desconto', 'Botao: Seguir sem Desconto', 'bot'),
  -- Bot: Step 6 - Pagamento
  ('payment_image_url', '', 'Imagem: Pagamento Gerado', 'bot'),
  ('btn_check_payment', '💳 Confirmar Pagamento', 'Botao: Confirmar Pagamento', 'bot'),
  -- API Keys
  ('likesff_api_key', '', 'Chave API LikesFF', 'api'),
  ('syncpay_client_key', '', 'Client Key SyncPay', 'api'),
  ('syncpay_client_secret', '', 'Client Secret SyncPay', 'api')
ON CONFLICT DO NOTHING;

-- Bot Sessions (for state management)
CREATE TABLE IF NOT EXISTS public.bots_sessions (
  user_id BIGINT PRIMARY KEY, -- Telegram User ID
  step TEXT,
  ff_id TEXT,
  amount DECIMAL(10, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.bots_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public sessions access" ON public.bots_sessions FOR ALL USING (true); -- Simplified for function access

-- Bot Logs Table
CREATE TABLE IF NOT EXISTS public.bot_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
  user_id TEXT,
  chat_id TEXT,
  message TEXT,
  type TEXT DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bot owners can view logs of their bots" ON public.bot_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_logs.bot_id AND bots.owner_id = auth.uid()));
