-- ==========================================
-- TABLE: push_subscriptions
-- ==========================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index pour performance
CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_active ON public.push_subscriptions(is_active) WHERE is_active = TRUE;

-- RLS (Row Level Security)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow insert for authenticated users
CREATE POLICY "Allow insert for all" ON public.push_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (TRUE);

-- Policy: Allow select for service role
CREATE POLICY "Allow select for service role" ON public.push_subscriptions
  FOR SELECT
  TO service_role
  USING (TRUE);

-- Policy: Allow delete for all (cleanup)
CREATE POLICY "Allow delete for all" ON public.push_subscriptions
  FOR DELETE
  TO public
  USING (TRUE);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- TABLE: notification_logs (optionnel)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  product_id TEXT
);

CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);
CREATE INDEX idx_notification_logs_product_id ON public.notification_logs(product_id);

-- RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for service role" ON public.notification_logs
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "Allow select for service role" ON public.notification_logs
  FOR SELECT
  TO service_role
  USING (TRUE);
