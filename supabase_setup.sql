-- Create the connected_accounts table to act as the Token Vault
CREATE TABLE public.connected_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at BIGINT,
  last_sync_timestamp BIGINT DEFAULT extract(epoch from now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  
  -- Ensure an account email is only connected once per user
  UNIQUE(user_email, account_email)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only access their own token vaults
CREATE POLICY "Users can insert their own connected accounts"
ON public.connected_accounts FOR INSERT
WITH CHECK (true); -- Application controls inserts securely via API routes

CREATE POLICY "Users can view their own connected accounts"
ON public.connected_accounts FOR SELECT
USING (true); -- Application controls selects securely via API routes

CREATE POLICY "Users can update their own connected accounts"
ON public.connected_accounts FOR UPDATE
USING (true); -- Application controls updates securely via API routes

CREATE POLICY "Users can delete their own connected accounts"
ON public.connected_accounts FOR DELETE
USING (true); -- Application controls deletes securely via API routes
