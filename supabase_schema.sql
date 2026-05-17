-- =====================================================================
-- 🚀 SUPABASE SCHEMA: MIGRACIÓN MULTI-TENANT PARA SAAS (ELEVORE EMPIRE)
-- =====================================================================
-- Versión: 2.0 (Soporte para Empleados, Billeteras y Seguridad Avanzada)
-- =====================================================================

-- 1. Tabla de Tenants (Negocios Registrados)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL UNIQUE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_status TEXT DEFAULT 'trialing'
);

-- 2. Tabla de Tenant Settings (Configuraciones dinámicas por Negocio)
CREATE TABLE IF NOT EXISTS public.tenant_settings (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    zelle_phone TEXT DEFAULT '(407) 952-4228',
    business_full_name TEXT DEFAULT 'Elevore Premium Services',
    staff_pay_pct NUMERIC(4,2) DEFAULT 0.40,
    google_review_link TEXT DEFAULT 'https://g.page/r/review',
    currency TEXT DEFAULT 'USD',
    monthly_goal NUMERIC(10,2) DEFAULT 15000.00,
    admin_pin TEXT DEFAULT '2026',
    
    addons JSONB DEFAULT '[
        {"id": "oven", "en": "Inside Oven", "p": 35},
        {"id": "fridge", "en": "Inside Fridge", "p": 30},
        {"id": "windows", "en": "Windows", "p": 50},
        {"id": "pethair", "en": "Pet Hair", "p": 25},
        {"id": "garage", "en": "Garage", "p": 40}
    ]'::jsonb,
    
    quick_jobs JSONB DEFAULT '[
        {"id": "tv", "en": "Mount TV", "p": 150},
        {"id": "door", "en": "Install Door", "p": 200},
        {"id": "patch", "en": "Drywall Patch", "p": 180},
        {"id": "shelves", "en": "Shelving", "p": 100},
        {"id": "lock", "en": "Lock Change", "p": 85},
        {"id": "paint", "en": "Paint Touch-up", "p": 120},
        {"id": "faucet", "en": "Faucet Install", "p": 130},
        {"id": "caulk", "en": "Caulking", "p": 75}
    ]'::jsonb,
    
    membership_plans JSONB DEFAULT '[
        {"id": "none", "name": "None", "price": 0, "color": "#6b7280"},
        {"id": "basic", "name": "Basic", "price": 199, "color": "#6b7280", "perks": ["2 Cleans/mo", "5% off", "Priority"]},
        {"id": "premium", "name": "Premium", "price": 349, "color": "#3b82f6", "perks": ["4 Cleans/mo", "10% off", "Free oven"]},
        {"id": "vip", "name": "VIP", "price": 549, "color": "#fbbf24", "perks": ["6 Cleans/mo", "15% off", "All add-ons", "Dedicated team"]}
    ]'::jsonb
);

-- 3. Tabla de Staff Profiles (Empleados con Billetera y Códigos de Acceso)
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'supervisor')),
    passcode TEXT NOT NULL DEFAULT 'staff123', -- PIN personalizado de ingreso para la app
    wallet_balance NUMERIC(10,2) DEFAULT 0.00, -- Saldo acumulado impago
    total_earned NUMERIC(10,2) DEFAULT 0.00, -- Historial total ganado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Agregar columnas tenant_id a Clientes y Misiones
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='tenant_id') THEN
        ALTER TABLE public.clients ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='elevore_missions' AND column_name='tenant_id') THEN
        ALTER TABLE public.elevore_missions ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Habilitar RLS en todas las tablas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elevore_missions ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de RLS (Adaptadas para Autenticación por PIN del Frontend)
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Owners can update their own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Staff/Admins can read settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Owners can edit settings" ON public.tenant_settings;
DROP POLICY IF EXISTS "Users within same tenant can view profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Owners can manage profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Users can manage client database of their tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can manage missions of their tenant" ON public.elevore_missions;
DROP POLICY IF EXISTS "Public anonymous clients can access their specific mission portal" ON public.elevore_missions;
DROP POLICY IF EXISTS "Public anonymous clients can sign and rate their mission" ON public.elevore_missions;

CREATE POLICY "Enable ALL for tenants" ON public.tenants FOR ALL USING (true);
CREATE POLICY "Enable ALL for settings" ON public.tenant_settings FOR ALL USING (true);
CREATE POLICY "Enable ALL for profiles" ON public.staff_profiles FOR ALL USING (true);
CREATE POLICY "Enable ALL for clients" ON public.clients FOR ALL USING (true);
CREATE POLICY "Enable ALL for missions" ON public.elevore_missions FOR ALL USING (true);

-- 7. Trigger Automático para Configuración
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tenant_settings (tenant_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_tenant_created
    AFTER INSERT ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();
