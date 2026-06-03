-- =====================================================================
-- 🚀 ELEVORE SAAS: COMBINED DATABASE MIGRATION (FASE 2)
-- =====================================================================
-- Instrucción: Copia todo este contenido y pégalo en el "SQL Editor"
-- de tu panel de Supabase, luego haz clic en "Run".
-- =====================================================================

-- 1. Actualizar tabla de Tenants con soporte de Slug y Trial de 14 días
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days');

-- Generar slugs iniciales para tenants existentes si no tienen
UPDATE public.tenants 
SET slug = LOWER(REPLACE(business_name, ' ', '-')) 
WHERE slug IS NULL;

-- Hacer que la columna slug sea obligatoria (NOT NULL) para futuros registros
ALTER TABLE public.tenants ALTER COLUMN slug SET NOT NULL;

-- 2. Agregar configuración de claves personalizadas a tenant_settings
ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS custom_resend_key TEXT;

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT;

-- 3. Asegurar que staff_profiles tenga columna de email
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS staff_email TEXT;

-- 4. Agregar columnas de tarifas de reserva a tenant_settings
ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS booking_base_price NUMERIC(10,2) DEFAULT 100.00;

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS booking_price_per_sqft NUMERIC(10,4) DEFAULT 0.0800;

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS booking_multiplier_deep NUMERIC(4,2) DEFAULT 1.45;

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS booking_multiplier_moveout NUMERIC(4,2) DEFAULT 1.60;

-- 5. Agregar columnas de plantillas de WhatsApp a tenant_settings
ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS wa_template_booking TEXT;

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS wa_template_route TEXT;

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS wa_template_review TEXT;

-- 6. Crear el Bucket de Almacenamiento si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('elevore_photos', 'elevore_photos', true) 
ON CONFLICT (id) DO NOTHING;

-- 7. Limpiar políticas previas para evitar colisiones
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_select_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_insert_photos" ON storage.objects;

-- 8. Crear políticas de acceso público e independiente para 'elevore_photos'
CREATE POLICY "allow_public_select_photos" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'elevore_photos');

CREATE POLICY "allow_public_insert_photos" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'elevore_photos');

-- 9. Crear la tabla de historial de pagos (staff_payouts) si no existe
CREATE TABLE IF NOT EXISTS public.staff_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE NOT NULL,
    worker_name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Zelle',
    reference_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en staff_payouts
ALTER TABLE public.staff_payouts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para staff_payouts
DROP POLICY IF EXISTS "Enable ALL for staff_payouts" ON public.staff_payouts;
CREATE POLICY "Enable ALL for staff_payouts" ON public.staff_payouts FOR ALL USING (true);
