-- =====================================================================
-- 🔒 ELEVORE EMPIRE: ENFORCED ROW LEVEL SECURITY (RLS)
-- =====================================================================
-- IMPORTANTE: Ejecuta este script en el SQL Editor de Supabase.
-- Este script garantiza que ninguna empresa pueda ver los datos de otra.
-- Es la segunda línea de defensa (la primera es el filtro en el código).
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- TABLA: clients
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;
DROP POLICY IF EXISTS "allow_all_clients" ON public.clients;

-- New strict policy: users can only see their own tenant's clients
CREATE POLICY "tenant_isolation_clients"
  ON public.clients
  FOR ALL
  USING (
    tenant_id::text = (
      SELECT raw_user_meta_data->>'tenant_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- TABLA: elevore_missions
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.elevore_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_missions" ON public.elevore_missions;
DROP POLICY IF EXISTS "allow_all_missions" ON public.elevore_missions;

CREATE POLICY "tenant_isolation_missions"
  ON public.elevore_missions
  FOR ALL
  USING (
    tenant_id::text = (
      SELECT raw_user_meta_data->>'tenant_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- TABLA: staff_profiles
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "allow_all_staff" ON public.staff_profiles;

CREATE POLICY "tenant_isolation_staff"
  ON public.staff_profiles
  FOR ALL
  USING (
    tenant_id::text = (
      SELECT raw_user_meta_data->>'tenant_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- TABLA: businesses (si existe)
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'businesses') THEN
    EXECUTE 'ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_owner_only_businesses" ON public.businesses';
    EXECUTE '
      CREATE POLICY "tenant_owner_only_businesses"
        ON public.businesses
        FOR ALL
        USING (
          owner_id = auth.uid()
        )
    ';
  END IF;
END $$;
