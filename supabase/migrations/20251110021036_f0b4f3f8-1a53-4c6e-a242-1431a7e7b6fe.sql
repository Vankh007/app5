-- Create payments table for Bakong payment system
CREATE TABLE IF NOT EXISTS public.payments (
  md5 TEXT PRIMARY KEY,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'PENDING',
  transaction_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own payments
CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to create payments
CREATE POLICY "Users can create payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow system to update payment status (for webhook/polling)
CREATE POLICY "System can update payment status"
ON public.payments
FOR UPDATE
TO authenticated
USING (true);

-- Allow public to view payment by md5 (for payment verification)
CREATE POLICY "Public can view payment by md5"
ON public.payments
FOR SELECT
TO anon
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX idx_payments_transaction_id ON public.payments(transaction_id) WHERE transaction_id IS NOT NULL;