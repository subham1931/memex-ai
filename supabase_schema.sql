-- Supabase Database Schema for Memex-AI

-- Enable UUID generation extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create SESSIONS table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Chat',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) on sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Sessions Policies
CREATE POLICY "Allow users to read their own sessions" 
    ON public.sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own sessions" 
    ON public.sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own sessions" 
    ON public.sessions FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own sessions" 
    ON public.sessions FOR DELETE 
    USING (auth.uid() = user_id);


-- 2. Create MESSAGES table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages Policies
CREATE POLICY "Allow users to read their own session messages" 
    ON public.messages FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own session messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own session messages" 
    ON public.messages FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own session messages" 
    ON public.messages FOR DELETE 
    USING (auth.uid() = user_id);
