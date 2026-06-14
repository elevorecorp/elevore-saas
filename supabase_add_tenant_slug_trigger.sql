-- =====================================================================
-- ⚙️ ELEVORE SAAS: AUTOMATIC TENANT SLUG GENERATION TRIGGER
-- =====================================================================
-- Este trigger se asegura de que cualquier inserción en la tabla tenants
-- reciba un slug válido autogenerado a partir de business_name si no se provee.
-- Esto evita fallos de violación de restricción NOT NULL en el flujo de registro.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.generate_tenant_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 1;
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        -- Reemplazar caracteres no alfanuméricos por guiones y pasar a minúsculas
        base_slug := LOWER(REGEXP_REPLACE(NEW.business_name, '[^a-zA-Z0-9]+', '-', 'g'));
        -- Quitar guiones duplicados y de los extremos
        base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
        base_slug := TRIM(BOTH '-' FROM base_slug);
        
        -- Fallback si el slug queda vacío
        IF base_slug = '' THEN
            base_slug := 'workspace';
        END IF;
        
        final_slug := base_slug;
        
        -- Bucle para asegurar la unicidad del slug en caso de colisión
        WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = final_slug) LOOP
            final_slug := base_slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        NEW.slug := final_slug;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_tenant_insert_slug ON public.tenants;
CREATE TRIGGER on_tenant_insert_slug
    BEFORE INSERT ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.generate_tenant_slug();
