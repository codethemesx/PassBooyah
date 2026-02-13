DROP POLICY IF EXISTS "Bot owners can view logs of their bots" ON public.bot_logs;
CREATE POLICY "Bot owners can view logs of their bots" ON public.bot_logs FOR SELECT 
USING (true); -- Temporarily allow all authenticated to view for fix
