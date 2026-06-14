-- =====================================================================
-- 🔒 ELEVORE SAAS: STRICT ROLE-BASED ACCESS CONTROL (RBAC) POLICIES
-- =====================================================================
-- Este script refuerza la seguridad en las tablas clients, elevore_missions y staff_profiles
-- garantizando que el staff no pueda leer clientes ni misiones ajenas, ni alterar balances.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. TABLA: clients (Solo Admins)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;
DROP POLICY IF EXISTS "admin_only_clients" ON public.clients;
DROP POLICY IF EXISTS "admin_manage_clients" ON public.clients;

-- Solo los administradores (role = 'admin') de la misma empresa pueden leer/escribir clientes.
CREATE POLICY "admin_manage_clients" ON public.clients
    FOR ALL
    TO authenticated
    USING (
        ((tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
         OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
        AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
    WITH CHECK (
        ((tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
         OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
        AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );


-- ─────────────────────────────────────────────────────────────────────
-- 2. TABLA: elevore_missions (Aislamiento por Rol)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.elevore_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_missions" ON public.elevore_missions;
DROP POLICY IF EXISTS "role_based_missions" ON public.elevore_missions;

-- Admins: Control total sobre misiones de su empresa.
-- Staff: Solo lectura/escritura de misiones donde figuren en 'team_assigned'.
CREATE POLICY "role_based_missions" ON public.elevore_missions
    FOR ALL
    TO authenticated
    USING (
        ((tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
         OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
        AND (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR
            ((auth.jwt() -> 'user_metadata' ->> 'role') = 'staff'
             AND team_assigned ILIKE '%' || (auth.jwt() -> 'user_metadata' ->> 'name') || '%')
        )
    )
    WITH CHECK (
        ((tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
         OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
        AND (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR
            ((auth.jwt() -> 'user_metadata' ->> 'role') = 'staff'
             AND team_assigned ILIKE '%' || (auth.jwt() -> 'user_metadata' ->> 'name') || '%')
        )
    );


-- ─────────────────────────────────────────────────────────────────────
-- 3. TABLA: staff_profiles (Restringir Edición a Admins)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "role_based_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "admin_only_staff_edit" ON public.staff_profiles;
DROP POLICY IF EXISTS "authenticated_select_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "admin_manage_staff" ON public.staff_profiles;

-- Lectura para cualquier usuario autenticado de la misma empresa (para ver nombres de equipo).
CREATE POLICY "authenticated_select_staff" ON public.staff_profiles
    FOR SELECT
    TO authenticated
    USING (
        (tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
         OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
    );

-- Modificación/Creación/Eliminación exclusiva para administradores.
CREATE POLICY "admin_manage_staff" ON public.staff_profiles
    FOR ALL
    TO authenticated
    USING (
        ((tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
         OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
        AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
    WITH CHECK (
        ((tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
         OR tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
        AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
