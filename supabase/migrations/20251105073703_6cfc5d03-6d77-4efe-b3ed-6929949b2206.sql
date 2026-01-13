-- Add 'support' to the allowed transaction types in wallet_transactions
ALTER TABLE wallet_transactions 
DROP CONSTRAINT wallet_transactions_transaction_type_check;

ALTER TABLE wallet_transactions 
ADD CONSTRAINT wallet_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY['topup'::text, 'purchase'::text, 'refund'::text, 'support'::text]));