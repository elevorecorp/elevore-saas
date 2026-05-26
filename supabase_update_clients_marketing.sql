-- =====================================================================
-- 🚀 ELEVORE EMPIRE: MIGRACIÓN DE CLIENTES PARA MARKETING Y CUMPLEAÑOS
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase.

-- 1. Agregar columna de correo electrónico al cliente si no existe
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Agregar columna de fecha de cumpleaños al cliente si no existe
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birthday DATE;
