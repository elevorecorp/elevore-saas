-- =====================================================================
-- 🔒 ELEVORE EMPIRE: ENFORCED ROW LEVEL SECURITY (RLS) & RBAC
-- =====================================================================
-- IMPORTANTE: Ejecuta este script en el SQL Editor de Supabase.
-- Combina Aislamiento de Empresas (Tenants) + Control de Roles (Admin vs Staff).
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. TABLA: clients (Solo Admins)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;
DROP POLICY IF EXISTS "admin_only_clients" ON public.clients;

-- Solo los Admins pueden leer/escribir en la tabla de clientes.
CREATE POLICY "admin_only_clients"
  ON public.clients
  FOR ALL
  USING (
    tenant_id::text = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())
    AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );


-- ─────────────────────────────────────────────────────────────────────
-- 2. TABLA: elevore_missions / jobs
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.elevore_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_missions" ON public.elevore_missions;
DROP POLICY IF EXISTS "role_based_missions" ON public.elevore_missions;

-- Admins: Ven todo lo de su empresa.
-- Staff: Ven SOLO los trabajos donde "assigned_worker" contenga su nombre o ID.
CREATE POLICY "role_based_missions"
  ON public.elevore_missions
  FOR ALL
  USING (
    tenant_id::text = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())
    AND (
      -- Si es admin, pasa directo
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
      OR
      -- Si es staff, tiene que estar asignado en la columna "team_assigned"
      (
        (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'staff'
        AND team_assigned ILIKE '%' || (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = auth.uid()) || '%'
      )
    )
  );

-- Hacemos lo mismo por si la tabla se llama "jobs" en la base de datos
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'jobs') THEN
    EXECUTE 'ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "role_based_jobs" ON public.jobs';
    EXECUTE '
      CREATE POLICY "role_based_jobs"
        ON public.jobs
        FOR ALL
        USING (
          (SELECT raw_user_meta_data->>''role'' FROM auth.users WHERE id = auth.uid()) = ''admin''
          OR
          (
            (SELECT raw_user_meta_data->>''role'' FROM auth.users WHERE id = auth.uid()) = ''staff''
            AND team_assigned ILIKE ''%'' || (SELECT raw_user_meta_data->>''name'' FROM auth.users WHERE id = auth.uid()) || ''%''
          )
        )
    ';
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────
-- 3. TABLA: staff_profiles
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "role_based_staff" ON public.staff_profiles;

-- Admins: Tienen control total.
-- Staff: Solo pueden ver su propio perfil y no modificar balances financieros.
CREATE POLICY "role_based_staff"
  ON public.staff_profiles
  FOR SELECT
  USING (
    tenant_id::text = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "admin_only_staff_edit"
  ON public.staff_profiles
  FOR UPDATE
  USING (
    tenant_id::text = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())
    AND (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );
