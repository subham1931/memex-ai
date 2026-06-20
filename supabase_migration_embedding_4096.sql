-- Migration: switch embeddings from 384-dim (MiniLM) to 4096-dim (NVIDIA nv-embedcode-7b-v1)
-- Run in Supabase SQL Editor. Existing embeddings will be cleared — re-upload notes after migration.

DROP INDEX IF EXISTS embeddings_embedding_idx;

TRUNCATE TABLE public.embeddings;

ALTER TABLE public.embeddings
    ALTER COLUMN embedding TYPE vector(4096);

-- nv-embedcode-7b-v1 uses 4096 dimensions. pgvector ivfflat/hnsw on `vector`
-- type only supports up to 2000 dims, so we skip an ANN index and use exact search.
-- This is fast enough for personal note collections.

CREATE OR REPLACE FUNCTION public.match_embeddings(
    query_embedding vector(4096),
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
