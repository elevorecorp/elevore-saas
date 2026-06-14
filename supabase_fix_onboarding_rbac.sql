-- =====================================================================
-- 🔒 ELEVORE SAAS: FIX ONBOARDING RBAC/RLS POLICIES
-- =====================================================================
-- Este script corrige las políticas de RBAC estricto para permitir que
-- el dueño de la empresa (tenant owner) pueda crear e interactuar con
-- clientes, empleados y misiones inmediatamente después del registro,
-- sin verse bloqueado por la latencia de actualización del JWT (rol en user_metadata).
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. TABLA: clients
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_clients" ON public.clients;

-- Permite gestión completa al dueño del tenant (propietario) o a administradores validados por JWT.
CREATE POLICY "admin_manage_clients" ON public.clients
    FOR ALL
    TO authenticated
    USING (
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
        OR (
            (tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
            AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        )
    )
    WITH CHECK (
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
        OR (
            (tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
            AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        )
    );

-- ─────────────────────────────────────────────────────────────────────
-- 2. TABLA: staff_profiles
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "admin_manage_staff" ON public.staff_profiles;

-- Lectura para cualquier usuario autenticado de la misma empresa o el dueño del tenant.
CREATE POLICY "authenticated_select_staff" ON public.staff_profiles
    FOR SELECT
    TO authenticated
    USING (
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
        OR (tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
    );

-- Gestión completa de empleados para el dueño del tenant o administradores validados por JWT.
CREATE POLICY "admin_manage_staff" ON public.staff_profiles
    FOR ALL
    TO authenticated
    USING (
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
        OR (
            (tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
            AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        )
    )
    WITH CHECK (
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
        OR (
            (tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
            AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        )
    );

-- ─────────────────────────────────────────────────────────────────────
-- 3. TABLA: elevore_missions
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.elevore_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_based_missions" ON public.elevore_missions;

-- Gestión completa para dueños de tenants, admins de la empresa, o lectura/escritura limitada para empleados asignados.
CREATE POLICY "role_based_missions" ON public.elevore_missions
    FOR ALL
    TO authenticated
    USING (
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
        OR (
            (tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
            AND (
                (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
                OR (
                    (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff'
                    AND team_assigned ILIKE '%' || (auth.jwt() -> 'user_metadata' ->> 'name') || '%'
                )
            )
        )
    )
    WITH CHECK (
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
        OR (
            (tenant_id)::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
            AND (
                (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
                OR (
                    (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff'
                    AND team_assigned ILIKE '%' || (auth.jwt() -> 'user_metadata' ->> 'name') || '%'
                )
            )
        )
    );
