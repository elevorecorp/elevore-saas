-- =====================================================================
-- 📸 ELEVORE EMPIRE: STORAGE BUCKETS & SECURITY POLICIES CONFIGURATION
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase.
-- Garantiza que el bucket de fotos exista y tenga políticas de acceso público correctas.

-- 1. Crear el Bucket de Almacenamiento si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('elevore_photos', 'elevore_photos', true) 
ON CONFLICT (id) DO NOTHING;

-- 2. Limpiar políticas previas para evitar colisiones
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_select_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_insert_photos" ON storage.objects;

-- 3. Crear políticas de acceso público e independiente para 'elevore_photos'
CREATE POLICY "allow_public_select_photos" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'elevore_photos');

CREATE POLICY "allow_public_insert_photos" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'elevore_photos');
