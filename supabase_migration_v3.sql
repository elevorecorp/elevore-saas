-- =====================================================================
-- 🚀 ELEVORE EMPIRE: MIGRACIÓN FASE 2 (MARCA BLANCA, STRIPE Y AUTH EN STAFF)
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase.
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
-- (Se ejecuta por separado en caso de que existan conflictos en producción)
ALTER TABLE public.tenants ALTER COLUMN slug SET NOT NULL;

-- 2. Agregar configuración de claves personalizadas a tenant_settings
ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS custom_resend_key TEXT;

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT;

-- 3. Asegurar que staff_profiles tenga columna de email
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS staff_email TEXT;
