CREATE OR REPLACE FUNCTION public.admin_delete_ica_orders(p_order_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_ica_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_order_ids IS NULL THEN
    DELETE FROM public.order_items WHERE id IS NOT NULL;
    DELETE FROM public.orders WHERE id IS NOT NULL;
  ELSE
    DELETE FROM public.order_items
    WHERE order_id = ANY(p_order_ids);

    DELETE FROM public.orders
    WHERE id = ANY(p_order_ids);
  END IF;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_ica_orders(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_ica_orders(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_clear_ica_activity_log()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_ica_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  DELETE FROM public.admin_audit_log WHERE id IS NOT NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_clear_ica_activity_log() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_clear_ica_activity_log() TO authenticated;
