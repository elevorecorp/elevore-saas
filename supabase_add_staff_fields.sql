-- =====================================================================
-- 🚀 ELEVORE EMPIRE: CAMPOS DE EDICIÓN DE EMPLEADOS
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase para habilitar 
-- el porcentaje de ganancia personalizado y el teléfono de los empleados.

-- 1. Agregar columna de Teléfono si no existe
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Agregar columna de Porcentaje de Pago (Payout Percentage) si no existe, por defecto 40%
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS payout_pct NUMERIC DEFAULT 40;
