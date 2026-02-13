ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS allowed_groups JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS use_webhooks BOOLEAN DEFAULT false;
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

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
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Bot owners can view logs of their bots') THEN
        CREATE POLICY "Bot owners can view logs of their bots" ON public.bot_logs FOR SELECT 
        USING (EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_logs.bot_id AND bots.owner_id = auth.uid()));
    END IF;
END $$;
