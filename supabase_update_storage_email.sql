-- =====================================================================
-- 🚀 ELEVORE EMPIRE: ACTUALIZACIÓN DE SEGURIDAD Y FOTOS NATIVAS
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase.

-- 1. Agregar columna de Email al personal (Para evitar problemas de colisiones)
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS staff_email TEXT;

-- 2. Crear el Bucket de Almacenamiento (Para fotos tomadas con el celular)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('elevore_photos', 'elevore_photos', true) 
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Acceso Público para las Fotos (Para que la App de React pueda subirlas y leerlas)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'elevore_photos');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'elevore_photos');
