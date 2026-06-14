-- =====================================================================
-- 🏢 ELEVORE SAAS: WHITE-LABEL BUSINESS NAME BRANDING
-- =====================================================================
-- Este script modifica la función trigger para que los nuevos tenants
-- utilicen su nombre de negocio real (business_name) como business_full_name
-- por defecto, en lugar del nombre genérico de "Elevore Premium Services".
-- También sincroniza de forma retroactiva los tenants existentes.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tenant_settings (tenant_id, business_full_name)
    VALUES (NEW.id, NEW.business_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sincronizar retroactivamente todos los configuraciones de tenants que tengan el nombre por defecto
UPDATE public.tenant_settings ts
SET business_full_name = t.business_name
FROM public.tenants t
WHERE ts.tenant_id = t.id 
  AND (ts.business_full_name = 'Elevore Premium Services' OR ts.business_full_name IS NULL OR ts.business_full_name = '');
