-- =====================================================================
-- 🛡️ ELEVORE EMPIRE: IMMUTABLE AUDIT LOGS (NIVEL PENTÁGONO)
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase.
-- Objetivo: Rastrear absolutamente todos los cambios financieros y operativos de forma imborrable.

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bloqueo Total (Nadie puede borrar ni modificar el registro de auditoría, ni siquiera un admin)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo lectura para dueños de tenant" ON public.audit_logs FOR SELECT USING (true);
-- No hay política de INSERT, UPDATE o DELETE manuales. Solo la Base de Datos puede insertar.

-- =====================================================================
-- TRIGGER FUNCTION: Capturador Automático
-- =====================================================================
CREATE OR REPLACE FUNCTION public.capture_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- CONECTANDO EL TRIGGER A LAS TABLAS CLAVE
-- =====================================================================
DROP TRIGGER IF EXISTS audit_missions_trigger ON public.elevore_missions;
CREATE TRIGGER audit_missions_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.elevore_missions
FOR EACH ROW EXECUTE FUNCTION public.capture_audit_log();

DROP TRIGGER IF EXISTS audit_staff_trigger ON public.staff_profiles;
CREATE TRIGGER audit_staff_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.staff_profiles
FOR EACH ROW EXECUTE FUNCTION public.capture_audit_log();

DROP TRIGGER IF EXISTS audit_tenant_trigger ON public.tenants;
CREATE TRIGGER audit_tenant_trigger
AFTER UPDATE OR DELETE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.capture_audit_log();
