
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'promo_codes' AND policyname = 'Authenticated users can manage promo codes'
    ) THEN
        CREATE POLICY "Authenticated users can manage promo codes" ON public.promo_codes
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'promo_codes' AND policyname = 'Anon users can view active promo codes'
    ) THEN
        CREATE POLICY "Anon users can view active promo codes" ON public.promo_codes
        FOR SELECT
        TO anon
        USING (is_active = true);
    END IF;
END
$$;
