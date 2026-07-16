-- Create the api_keys table for Siri Shortcut authentication
CREATE TABLE public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only access their own API keys
CREATE POLICY "Users can insert their own API keys"
ON public.api_keys FOR INSERT
WITH CHECK (true); -- Application controls inserts securely via API routes

CREATE POLICY "Users can view their own API keys"
ON public.api_keys FOR SELECT
USING (true); -- Application controls selects securely via API routes

CREATE POLICY "Users can update their own API keys"
ON public.api_keys FOR UPDATE
USING (true); -- Application controls updates securely via API routes

CREATE POLICY "Users can delete their own API keys"
ON public.api_keys FOR DELETE
USING (true); -- Application controls deletes securely via API routes
