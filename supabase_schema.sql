-- Supabase Database Schema for Memex-AI

-- Enable UUID generation extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS "vector";

-- 0. Create Supabase Storage bucket for raw note files
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes', 'notes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload their own notes"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own notes"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own notes"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 1. Create DOCUMENTS table (stores uploaded file metadata)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own documents"
    ON public.documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
    ON public.documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
    ON public.documents FOR DELETE
    USING (auth.uid() = user_id);


-- 2. Create EMBEDDINGS table (stores text chunks with vector embeddings)
CREATE TABLE IF NOT EXISTS public.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(384) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on embeddings
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own embeddings"
    ON public.embeddings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embeddings"
    ON public.embeddings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embeddings"
    ON public.embeddings FOR DELETE
    USING (auth.uid() = user_id);

-- Create an index for faster vector similarity search
CREATE INDEX IF NOT EXISTS embeddings_embedding_idx 
    ON public.embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);


-- 3. Create match_embeddings RPC function for vector similarity search
CREATE OR REPLACE FUNCTION public.match_embeddings(
    query_embedding vector(384),
    match_user_id UUID,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT,
    document_id UUID,
    filename TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.document_id,
        d.filename
    FROM public.embeddings e
    JOIN public.documents d ON d.id = e.document_id
    WHERE e.user_id = match_user_id
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


-- 4. Create SESSIONS table
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


-- 5. Create MESSAGES table
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
