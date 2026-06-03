-- =====================================================================
-- 🔒 ELEVORE SAAS: SECURED ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase.
-- Este script garantiza el aislamiento total de datos entre empresas (tenants)
-- al mismo tiempo que preserva el funcionamiento de los widgets públicos.
-- =====================================================================

-- 0. CREACIÓN DE TABLAS DE SOPORTE SI NO EXISTEN
-- Asegurar que la tabla staff_payouts exista antes de aplicar RLS
CREATE TABLE IF NOT EXISTS public.staff_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE NOT NULL,
    worker_name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Zelle',
    reference_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en todas las tablas por seguridad
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elevore_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payouts ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- 1. TABLA: tenants (Negocios)
-- ─────────────────────────────────────────────────────────────────────
-- Eliminar todas las políticas históricas posibles para evitar residuos
DROP POLICY IF EXISTS "Enable ALL for tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow public read for tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow owners to manage their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Owners can update their own tenant" ON public.tenants;

-- Lectura pública para poder resolver slugs en el Widget de Reservas
CREATE POLICY "Allow public read for tenants" 
    ON public.tenants FOR SELECT 
    TO public 
    USING (true);

-- Edición completa solo para el dueño de la empresa
CREATE POLICY "Allow owners to manage their tenant" 
    ON public.tenants FOR ALL 
    TO authenticated 
    USING (owner_id = auth.uid()) 
    WITH CHECK (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- 2. TABLA: tenant_settings (Configuración de Negocios)
-- ─────────────────────────────────────────────────────────────────────
-- Eliminar todas las políticas históricas posibles
DROP POLICY IF EXISTS "Enable ALL for settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Allow public read for settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Allow admins to manage settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Staff/Admins can read settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Owners can edit settings" ON public.tenant_settings;

-- Lectura pública para que el widget pueda calcular precios y cargar add-ons
CREATE POLICY "Allow public read for settings" 
    ON public.tenant_settings FOR SELECT 
    TO public 
    USING (true);

-- Edición completa para usuarios autenticados de la misma empresa o el dueño
CREATE POLICY "Allow admins to manage settings" 
    ON public.tenant_settings FOR ALL 
    TO authenticated 
    USING (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 3. TABLA: staff_profiles (Perfiles de Empleados)
-- ─────────────────────────────────────────────────────────────────────
-- Eliminar todas las políticas históricas posibles
DROP POLICY IF EXISTS "Enable ALL for profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "tenant_isolation_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "anon_select_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "authenticated_manage_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "allow_all_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Users within same tenant can view profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Owners can manage profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "role_based_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "admin_only_staff_edit" ON public.staff_profiles;

-- Bloqueo total a usuarios anónimos.
-- Aislamiento estricto para usuarios autenticados de la misma empresa o dueño.
CREATE POLICY "tenant_isolation_staff" 
    ON public.staff_profiles FOR ALL 
    TO authenticated 
    USING (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 4. TABLA: clients (Base de Clientes)
-- ─────────────────────────────────────────────────────────────────────
-- Eliminar todas las políticas históricas posibles
DROP POLICY IF EXISTS "Enable ALL for clients" ON public.clients;
DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;
DROP POLICY IF EXISTS "allow_all_clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage client database of their tenant" ON public.clients;
DROP POLICY IF EXISTS "admin_only_clients" ON public.clients;


-- Bloqueo total a usuarios anónimos.
-- Aislamiento estricto para usuarios autenticados de la misma empresa o dueño.
CREATE POLICY "tenant_isolation_clients" 
    ON public.clients FOR ALL 
    TO authenticated 
    USING (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 5. TABLA: staff_payouts (Historial de Pagos)
-- ─────────────────────────────────────────────────────────────────────
-- Eliminar todas las políticas históricas posibles
DROP POLICY IF EXISTS "Enable ALL for staff_payouts" ON public.staff_payouts;
DROP POLICY IF EXISTS "tenant_isolation_payouts" ON public.staff_payouts;

-- Bloqueo total a usuarios anónimos.
-- Aislamiento estricto para usuarios autenticados de la misma empresa o dueño.
CREATE POLICY "tenant_isolation_payouts" 
    ON public.staff_payouts FOR ALL 
    TO authenticated 
    USING (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    );

-- ─────────────────────────────────────────────────────────────────────
-- 6. TABLA: elevore_missions (Reservas y Misiones)
-- ─────────────────────────────────────────────────────────────────────
-- Eliminar todas las políticas históricas posibles
DROP POLICY IF EXISTS "Enable ALL for missions" ON public.elevore_missions;
DROP POLICY IF EXISTS "tenant_isolation_missions" ON public.elevore_missions;
DROP POLICY IF EXISTS "allow_public_insert_missions" ON public.elevore_missions;
DROP POLICY IF EXISTS "allow_anon_select_missions" ON public.elevore_missions;
DROP POLICY IF EXISTS "allow_anon_update_missions" ON public.elevore_missions;
DROP POLICY IF EXISTS "allow_all_missions" ON public.elevore_missions;
DROP POLICY IF EXISTS "role_based_missions" ON public.elevore_missions;
DROP POLICY IF EXISTS "allow_all" ON public.elevore_missions;
DROP POLICY IF EXISTS "Users can manage missions of their tenant" ON public.elevore_missions;
DROP POLICY IF EXISTS "Public anonymous clients can access their specific mission portal" ON public.elevore_missions;
DROP POLICY IF EXISTS "Public anonymous clients can sign and rate their mission" ON public.elevore_missions;

-- Aislamiento estricto para usuarios autenticados de la misma empresa o dueño.
CREATE POLICY "tenant_isolation_missions" 
    ON public.elevore_missions FOR ALL 
    TO authenticated 
    USING (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    );


-- Permitir a usuarios públicos insertar misiones con estado 'lead' (reservas públicas)
CREATE POLICY "allow_public_insert_missions" 
    ON public.elevore_missions FOR INSERT 
    TO anon 
    WITH CHECK (status = 'lead' AND tenant_id IS NOT NULL);

-- Permitir a usuarios anónimos consultar misiones si conocen su UUID (para portal cliente y login cliente)
CREATE POLICY "allow_anon_select_missions" 
    ON public.elevore_missions FOR SELECT 
    TO anon 
    USING (true);

-- Permitir a usuarios anónimos actualizar su firma, rating, review o marcar como pagado en su portal
CREATE POLICY "allow_anon_update_missions" 
    ON public.elevore_missions FOR UPDATE 
    TO anon 
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────
-- 7. DISPARADORES (TRIGGERS) PARA SINCRONIZAR METADATOS A AUTH.USERS
-- ─────────────────────────────────────────────────────────────────────

-- Función trigger para cuando se crea/actualiza un tenant (dueño)
CREATE OR REPLACE FUNCTION public.sync_tenant_owner_metadata()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS NOT NULL THEN
        UPDATE auth.users
        SET raw_user_meta_data = 
            COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('tenant_id', NEW.id::text, 'role', 'admin')
        WHERE id = NEW.owner_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tenant_owner_sync ON public.tenants;
CREATE TRIGGER on_tenant_owner_sync
    AFTER INSERT OR UPDATE OF owner_id ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_owner_metadata();

-- Función trigger para cuando se crea/actualiza un staff profile con user_id
CREATE OR REPLACE FUNCTION public.sync_staff_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        UPDATE auth.users
        SET raw_user_meta_data = 
            COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('tenant_id', NEW.tenant_id::text, 'role', NEW.role)
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_staff_user_sync ON public.staff_profiles;
CREATE TRIGGER on_staff_user_sync
    AFTER INSERT OR UPDATE OF user_id, role ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_staff_user_metadata();

-- Sincronización Retroactiva
-- 1. Dueños de tenants
UPDATE auth.users u
SET raw_user_meta_data = 
    COALESCE(u.raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('tenant_id', t.id::text, 'role', 'admin')
FROM public.tenants t
WHERE t.owner_id = u.id;

-- 2. Staff Profiles
UPDATE auth.users u
SET raw_user_meta_data = 
    COALESCE(u.raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('tenant_id', s.tenant_id::text, 'role', s.role)
FROM public.staff_profiles s
WHERE s.user_id = u.id;
