-- =====================================================================
-- 🚀 ELEVORE EMPIRE: CORRECCIÓN DE RLS PARA INGRESO DE EMPLEADOS (PIN)
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase.
-- Habilita que los empleados puedan iniciar sesión con su PIN/Email
-- permitiendo lecturas públicas en la tabla staff_profiles.

-- 1. Eliminar las políticas restrictivas anteriores
DROP POLICY IF EXISTS "tenant_isolation_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "allow_all_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "anon_select_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "authenticated_manage_staff" ON public.staff_profiles;

-- 2. Crear política para usuarios autenticados (Admin/Staff dentro de su empresa)
CREATE POLICY "authenticated_manage_staff" ON public.staff_profiles
    FOR ALL
    TO authenticated
    USING (
        tenant_id::text = (
            SELECT raw_user_meta_data->>'tenant_id'
            FROM auth.users
            WHERE id = auth.uid()
        )
    );

-- 3. Crear política para usuarios anónimos (Permitir lectura para la pantalla de login)
CREATE POLICY "anon_select_staff" ON public.staff_profiles
    FOR SELECT
    TO anon
    USING (true);
