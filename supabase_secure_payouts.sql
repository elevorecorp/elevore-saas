-- =====================================================================
-- 🛡️ ELEVORE SAAS: REFACTORIZACIÓN DE SEGURIDAD PARA OPERACIONES POR PIN
-- =====================================================================
-- Instrucción: Ejecuta este script en el SQL Editor de tu Supabase
-- o córrelo usando el script de automatización.
-- =====================================================================

-- 1. ELIMINAR ACCESO ANÓNIMO DIRECTO A PERFILES DE EMPLEADOS
-- Esto previene que usuarios no autenticados puedan leer passcodes/PINs.
DROP POLICY IF EXISTS "anon_select_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Enable ALL for profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "authenticated_manage_staff" ON public.staff_profiles;

-- Asegurar aislamiento estricto: solo usuarios autenticados de la misma empresa pueden gestionar staff
CREATE POLICY "authenticated_manage_staff" ON public.staff_profiles
    FOR ALL
    TO authenticated
    USING (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    );

-- 2. ASEGURAR TABLA DE HISTORIAL DE PAGOS (STAFF_PAYOUTS)
-- Los anónimos no deben poder escribir o leer aquí directamente.
DROP POLICY IF EXISTS "Enable ALL for staff_payouts" ON public.staff_payouts;
DROP POLICY IF EXISTS "tenant_isolation_payouts" ON public.staff_payouts;
DROP POLICY IF EXISTS "authenticated_manage_payouts" ON public.staff_payouts;

CREATE POLICY "authenticated_manage_payouts" ON public.staff_payouts
    FOR ALL
    TO authenticated
    USING (
        tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')
        OR
        tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
    );

-- 3. FUNCIÓN RPC: CONSULTAR PERFIL DE STAFF DE FORMA SEGURA
CREATE OR REPLACE FUNCTION public.get_staff_profile_secure(
    p_staff_id UUID,
    p_passcode TEXT
)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    name TEXT,
    role TEXT,
    staff_email TEXT,
    phone TEXT,
    payout_pct NUMERIC,
    wallet_balance NUMERIC,
    total_earned NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.tenant_id,
        s.name,
        s.role,
        s.staff_email,
        s.phone,
        s.payout_pct,
        s.wallet_balance,
        s.total_earned
    FROM public.staff_profiles s
    WHERE s.id = p_staff_id AND s.passcode = p_passcode;
END;
$$;

-- 4. FUNCIÓN RPC: CONSULTAR ÚLTIMOS PAGOS DE FORMA SEGURA
CREATE OR REPLACE FUNCTION public.get_staff_payouts_secure(
    p_staff_id UUID,
    p_passcode TEXT
)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    staff_id UUID,
    worker_name TEXT,
    amount NUMERIC,
    payment_method TEXT,
    reference_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificamos primero el PIN del empleado
    IF EXISTS (SELECT 1 FROM public.staff_profiles WHERE public.staff_profiles.id = p_staff_id AND passcode = p_passcode) THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.tenant_id,
            p.staff_id,
            p.worker_name,
            p.amount,
            p.payment_method,
            p.reference_note,
            p.created_at
        FROM public.staff_payouts p
        WHERE p.staff_id = p_staff_id
        ORDER BY p.created_at DESC
        LIMIT 5;
    END IF;
END;
$$;

-- 5. FUNCIÓN RPC: COMPLETAR MISIÓN Y CALCULAR COMISIÓN ATÓMICAMENTE
CREATE OR REPLACE FUNCTION public.complete_mission_secure(
    p_mission_id UUID,
    p_staff_id UUID,
    p_passcode TEXT
)
RETURNS TABLE (
    wallet_balance NUMERIC,
    total_earned NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_price NUMERIC;
    v_payout_pct NUMERIC;
    v_commission NUMERIC;
    v_tenant_id UUID;
    v_staff_name TEXT;
BEGIN
    -- 1. Validar PIN y obtener comisiones y tenant_id
    SELECT s.payout_pct, s.tenant_id, s.name INTO v_payout_pct, v_tenant_id, v_staff_name
    FROM public.staff_profiles s
    WHERE s.id = p_staff_id AND s.passcode = p_passcode;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'PIN o ID de empleado incorrectos.';
    END IF;

    -- 2. Validar que la misión exista y pertenezca al mismo negocio
    SELECT total_price INTO v_total_price
    FROM public.elevore_missions
    WHERE id = p_mission_id AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Misión no encontrada o no pertenece a tu negocio.';
    END IF;

    -- 3. Cambiar estado de la misión a completado
    UPDATE public.elevore_missions
    SET status = 'completed'
    WHERE id = p_mission_id;

    -- 4. Calcular comisión (default al 15% si no se especifica)
    IF v_payout_pct IS NULL THEN
        v_payout_pct := 15.0;
    END IF;
    v_commission := COALESCE(v_total_price, 0.0) * (v_payout_pct / 100.0);

    -- 5. Acreditar comisiones a la billetera
    UPDATE public.staff_profiles
    SET 
        wallet_balance = COALESCE(public.staff_profiles.wallet_balance, 0.0) + v_commission,
        total_earned = COALESCE(public.staff_profiles.total_earned, 0.0) + v_commission
    WHERE id = p_staff_id;

    -- 6. Retornar balances actualizados
    RETURN QUERY
    SELECT s.wallet_balance, s.total_earned
    FROM public.staff_profiles s
    WHERE s.id = p_staff_id;
END;
$$;

-- 6. FUNCIÓN RPC: SOLICITAR RETIRO A ZELLE ATÓMICAMENTE
CREATE OR REPLACE FUNCTION public.request_cashout_secure(
    p_staff_id UUID,
    p_passcode TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_balance NUMERIC;
    v_tenant_id UUID;
    v_worker_name TEXT;
BEGIN
    -- 1. Validar PIN y obtener balance actual
    SELECT s.wallet_balance, s.tenant_id, s.name INTO v_wallet_balance, v_tenant_id, v_worker_name
    FROM public.staff_profiles s
    WHERE s.id = p_staff_id AND s.passcode = p_passcode;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'PIN o ID de empleado incorrectos.';
    END IF;

    -- 2. Validar que tenga saldo acumulado
    IF COALESCE(v_wallet_balance, 0.0) <= 0.0 THEN
        RAISE EXCEPTION 'Saldo insuficiente para retirar.';
    END IF;

    -- 3. Registrar el retiro en el historial
    INSERT INTO public.staff_payouts (tenant_id, staff_id, worker_name, amount, payment_method, reference_note)
    VALUES (v_tenant_id, p_staff_id, v_worker_name, v_wallet_balance, 'Zelle', 'Retiro solicitado desde la app móvil (Seguro)');

    -- 4. Reiniciar el balance de la billetera a 0
    UPDATE public.staff_profiles
    SET wallet_balance = 0.0
    WHERE id = p_staff_id;

    RETURN 0.0;
END;
$$;
