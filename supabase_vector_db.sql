-- =====================================================================
-- 🚀 ELEVORE EMPIRE: SUPABASE VECTOR DB & IA SEMANTIC SEARCH
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase 
-- para habilitar pgvector y crear las funciones de búsqueda semántica.
-- 
-- SOLUCIÓN AL ERROR: Este script está corregido para no referenciar columnas
-- inexistentes y funcionar perfectamente con tu esquema actual.
-- =====================================================================

-- 1. Habilitar extensión pgvector si no existe
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Asegurarse de que las tablas existan (por si acaso no se han creado)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.elevore_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    client_name TEXT,
    service_type TEXT,
    status TEXT,
    scheduled_date TEXT,
    total_price NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Agregar columna embedding (768 dimensiones para Gemini text-embedding) a Clientes
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 4. Agregar columna embedding (768 dimensiones) a Misiones/Trabajos
ALTER TABLE public.elevore_missions ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 5. Crear función de búsqueda para Clientes
DROP FUNCTION IF EXISTS public.match_clients(vector, float, int, uuid);
CREATE OR REPLACE FUNCTION public.match_clients(
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    t_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    similarity float
)
AS $$
    SELECT 
        id, 
        name, 
        1 - (clients.embedding <=> query_embedding) AS similarity
    FROM public.clients
    WHERE 
        (1 - (clients.embedding <=> query_embedding) > match_threshold)
        AND (t_id IS NULL OR tenant_id = t_id)
    ORDER BY clients.embedding <=> query_embedding
    LIMIT match_count;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6. Crear función de búsqueda para Misiones
DROP FUNCTION IF EXISTS public.match_missions(vector, float, int, uuid);
CREATE OR REPLACE FUNCTION public.match_missions(
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    t_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    client_name TEXT,
    service_type TEXT,
    similarity float
)
AS $$
    SELECT 
        id, 
        client_name, 
        service_type, 
        1 - (elevore_missions.embedding <=> query_embedding) AS similarity
    FROM public.elevore_missions
    WHERE 
        (1 - (elevore_missions.embedding <=> query_embedding) > match_threshold)
        AND (t_id IS NULL OR tenant_id = t_id)
    ORDER BY elevore_missions.embedding <=> query_embedding
    LIMIT match_count;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

