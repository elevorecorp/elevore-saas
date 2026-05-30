-- =====================================================================
-- 🛰️ ELEVORE EMPIRE: REAL-TIME GPS TRACKING SCHEMA
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase.
-- Este script crea la tabla de ubicaciones para el rastreador en vivo y
-- habilita políticas para que el staff actualice y los clientes lean.

-- 1. Crear tabla de ubicaciones de tripulación
CREATE TABLE IF NOT EXISTS public.crew_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.crew_locations ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "allow_public_select_locations" ON public.crew_locations;
DROP POLICY IF EXISTS "allow_public_upsert_locations" ON public.crew_locations;

-- 4. Crear políticas públicas/anónimas para el flujo del SaaS por PIN
CREATE POLICY "allow_public_select_locations" ON public.crew_locations
    FOR SELECT TO public USING (true);

CREATE POLICY "allow_public_upsert_locations" ON public.crew_locations
    FOR ALL TO public USING (true) WITH CHECK (true);
