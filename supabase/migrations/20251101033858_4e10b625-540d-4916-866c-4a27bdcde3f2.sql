-- Ensure all existing users have profiles with wallet balance
INSERT INTO public.user_profiles (id, wallet_balance)
SELECT id, 0.00
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;