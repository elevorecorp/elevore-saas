-- =====================================================================
-- 🔑 ELEVORE SAAS: SUPERADMIN DASHBOARD & LEADS DELETION SYSTEM
-- =====================================================================
-- Este script crea la infraestructura para:
-- 1. Identificar a los Administradores de la Plataforma (SuperAdmins).
-- 2. Guardar leads de cancelación (churned leads) en una tabla dedicada.
-- 3. Función segura (SECURITY DEFINER) para eliminar la cuenta y tenant del CEO,
--    preservando su contacto en la tabla de leads antes de borrar.
-- 4. Ampliar políticas RLS para permitir a los SuperAdmins auditar el SaaS.
-- =====================================================================

-- 1. Función para verificar si un ID de usuario es SuperAdmin
CREATE OR REPLACE FUNCTION public.is_platform_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
BEGIN
    SELECT email INTO user_email FROM auth.users WHERE id = user_id;
    RETURN COALESCE(user_email, '') IN (
        'josemario@elevorecorp.com',
        'josemarioal14@gmail.com',
        'debug_josemario@elevorecorp.com',
        'debug_josemario@gmail.com',
        'elevorecorporation@gmail.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Tabla de Leads/Churned Users para marketing
CREATE TABLE IF NOT EXISTS public.saas_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    business_name TEXT,
    owner_name TEXT,
    phone TEXT,
    status TEXT DEFAULT 'churned', -- 'churned' | 'lead' | 'active'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saas_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated insert to saas_leads" ON public.saas_leads;
CREATE POLICY "Allow authenticated insert to saas_leads" 
    ON public.saas_leads FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow platform admins to manage saas_leads" ON public.saas_leads;
CREATE POLICY "Allow platform admins to manage saas_leads" 
    ON public.saas_leads FOR ALL 
    TO authenticated 
    USING (public.is_platform_admin(auth.uid()))
    WITH CHECK (public.is_platform_admin(auth.uid()));

-- 3. Ampliar políticas de tenants y settings para auditoría de SuperAdmin
DROP POLICY IF EXISTS "Allow platform admins to select all tenants" ON public.tenants;
CREATE POLICY "Allow platform admins to select all tenants" 
    ON public.tenants FOR SELECT 
    TO authenticated 
    USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow platform admins to select all settings" ON public.tenant_settings;
CREATE POLICY "Allow platform admins to select all settings" 
    ON public.tenant_settings FOR SELECT 
    TO authenticated 
    USING (public.is_platform_admin(auth.uid()));

-- 4. Función de eliminación de cuenta con resguardo de datos (leads)
CREATE OR REPLACE FUNCTION public.delete_tenant_account(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_owner_id UUID;
    target_email TEXT;
    target_owner_name TEXT;
    target_biz_name TEXT;
    target_phone TEXT;
BEGIN
    -- Obtener detalles del tenant
    SELECT owner_id, business_name 
    INTO target_owner_id, target_biz_name
    FROM public.tenants
    WHERE id = target_tenant_id;
    
    -- Validar que el usuario que ejecuta la función es el dueño del tenant
    IF target_owner_id IS NULL OR target_owner_id <> auth.uid() THEN
        RAISE EXCEPTION 'No autorizado para eliminar este tenant.';
    END IF;
    
    -- Obtener datos de contacto del dueño
    SELECT email, COALESCE(raw_user_meta_data->>'name', 'Owner')
    INTO target_email, target_owner_name
    FROM auth.users
    WHERE id = target_owner_id;
    
    -- Obtener teléfono del dueño desde settings si existe
    SELECT owner_phone 
    INTO target_phone 
    FROM public.tenant_settings 
    WHERE tenant_id = target_tenant_id;
    
    -- Insertar en la tabla de leads de marketing
    INSERT INTO public.saas_leads (email, business_name, owner_name, phone, status)
    VALUES (target_email, target_biz_name, target_owner_name, target_phone, 'churned')
    ON CONFLICT (email) DO UPDATE 
    SET status = 'churned', 
        business_name = EXCLUDED.business_name,
        owner_name = EXCLUDED.owner_name,
        phone = EXCLUDED.phone,
        created_at = now();
        
    -- Eliminar tenant (esto cascadeará y borrará settings, profiles, clients, missions)
    DELETE FROM public.tenants WHERE id = target_tenant_id;
    
    -- Eliminar usuario de auth.users
    DELETE FROM auth.users WHERE id = target_owner_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
