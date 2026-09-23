-- ============================================================================
-- FOLIO — spend_gems: única puerta para GASTAR gemas desde el cliente
-- ============================================================================
-- Contexto: user_gems no tiene policy de UPDATE para clientes (server authority,
-- sprint1_server_authority.sql), así que el descuento client-side de
-- `buyExtraSaves` fallaba siempre. Esta RPC lo sustituye siguiendo el patrón de
-- `cost_search_matches` (trueque_schema.sql): descuento atómico + fila NEGATIVA
-- en reward_ledger.
--
-- Requisitos: sprint1_server_authority.sql (reward_ledger, user_gems).
-- Correr a mano en el SQL Editor de Supabase. Idempotente (CREATE OR REPLACE).
--
-- Contrato:
--   spend_gems(p_amount int, p_reason text, p_ref text DEFAULT NULL) → jsonb
--     éxito : { "success": true,  "balance": <saldo nuevo>, "duplicate": <bool> }
--     error : { "success": false, "error": "<código>" }
--   Códigos: NOT_AUTHENTICATED · GEMS_INVALID_REASON · GEMS_INVALID_AMOUNT ·
--            GEMS_NO_BALANCE (el usuario no tiene fila en user_gems) ·
--            GEMS_INSUFFICIENT (saldo < precio) · cualquier otro = SQLERRM.
--
-- Autoridad del servidor:
--   · El PRECIO lo decide el servidor por `p_reason` (tabla en el CASE): el
--     cliente no puede pagar menos por el mismo producto.
--   · `p_reason` fuera de la lista blanca se rechaza (no se escribe texto libre
--     del cliente en el libro mayor).
--   · Idempotencia OPCIONAL: si se pasa `p_ref`, el par (user, reason, ref) es
--     único en reward_ledger (índice reward_ledger_once): repetir la llamada con
--     el mismo `p_ref` NO vuelve a cobrar y devuelve duplicate=true. Sin `p_ref`
--     cada llamada es una compra nueva (ref aleatorio).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.spend_gems(
  p_amount int,
  p_reason text,
  p_ref    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid    uuid := auth.uid();
  v_price int;
  v_bal  int;
  v_ref  text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  -- Lista blanca de productos → precio fijado por el servidor
  v_price := CASE p_reason
    WHEN 'buy_extra_saves' THEN 5
    ELSE NULL
  END;
  IF v_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'GEMS_INVALID_REASON');
  END IF;
  IF p_amount IS DISTINCT FROM v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'GEMS_INVALID_AMOUNT');
  END IF;

  v_ref := coalesce(nullif(btrim(p_ref), ''), gen_random_uuid()::text);

  -- Reintento con el mismo ref: ya cobrado, no se cobra dos veces
  IF p_ref IS NOT NULL AND EXISTS (
    SELECT 1 FROM reward_ledger WHERE user_id = uid AND reason = p_reason AND ref = v_ref
  ) THEN
    SELECT balance INTO v_bal FROM user_gems WHERE user_id = uid;
    RETURN jsonb_build_object('success', true, 'balance', coalesce(v_bal, 0), 'duplicate', true);
  END IF;

  -- Descuento atómico: solo si alcanza (misma condición que cost_search_matches)
  UPDATE user_gems
     SET balance = balance - v_price
   WHERE user_id = uid AND balance >= v_price
  RETURNING balance INTO v_bal;

  IF NOT FOUND THEN
    IF NOT EXISTS (SELECT 1 FROM user_gems WHERE user_id = uid) THEN
      RETURN jsonb_build_object('success', false, 'error', 'GEMS_NO_BALANCE');
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'GEMS_INSUFFICIENT');
  END IF;

  INSERT INTO reward_ledger (user_id, xp, gems, reason, ref)
    VALUES (uid, 0, -v_price, p_reason, v_ref);

  RETURN jsonb_build_object('success', true, 'balance', v_bal, 'duplicate', false);

EXCEPTION
  WHEN unique_violation THEN
    -- Carrera con otra llamada del mismo ref: el descuento de esta se revierte
    -- (el bloque EXCEPTION deshace el UPDATE) y la otra ya cobró.
    SELECT balance INTO v_bal FROM user_gems WHERE user_id = uid;
    RETURN jsonb_build_object('success', true, 'balance', coalesce(v_bal, 0), 'duplicate', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END $$;

REVOKE ALL ON FUNCTION public.spend_gems(int, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_gems(int, text, text) TO authenticated;

-- Verificación (como usuario autenticado, desde la app o con un JWT):
--   select public.spend_gems(5, 'buy_extra_saves');
--   → {"success": true, "balance": <N-5>, "duplicate": false}   (o GEMS_INSUFFICIENT)
--   select * from reward_ledger where reason = 'buy_extra_saves' order by id desc limit 3;
