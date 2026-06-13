-- =====================================================================
-- 🚀 ELEVORE EMPIRE: MIGRACIÓN DE CONFIGURACIÓN DE IA EN BASE DE DATOS
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase.
-- =====================================================================

-- Agregar columnas de configuración de IA a la tabla tenant_settings
ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'ollama';

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS gemini_model TEXT DEFAULT 'gemini-2.5-flash';

ALTER TABLE public.tenant_settings 
ADD COLUMN IF NOT EXISTS gemini_key TEXT;
