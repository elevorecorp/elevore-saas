-- =====================================================================
-- 🚀 ELEVORE EMPIRE: CONFIGURACIÓN DINÁMICA DE PRECIOS Y PLANTILLAS WA
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase.
-- Habilita que cada negocio configure sus propias tarifas de reserva y plantillas de WhatsApp.

-- 1. Agregar columnas de tarifas de reserva a tenant_settings
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS booking_base_price NUMERIC(10,2) DEFAULT 100.00;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS booking_price_per_sqft NUMERIC(10,4) DEFAULT 0.0800;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS booking_multiplier_deep NUMERIC(4,2) DEFAULT 1.45;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS booking_multiplier_moveout NUMERIC(4,2) DEFAULT 1.60;

-- 2. Agregar columnas de plantillas de WhatsApp a tenant_settings
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS wa_template_booking TEXT;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS wa_template_route TEXT;
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS wa_template_review TEXT;
