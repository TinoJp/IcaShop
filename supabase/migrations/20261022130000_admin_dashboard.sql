-- Admin dashboard capabilities. Apply this migration in the project's Supabase
-- SQL editor before using dashboard pages that read the protected admin data.
GRANT EXECUTE ON FUNCTION public.is_ica_admin() TO anon;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid','paid'));
REVOKE UPDATE ON public.orders FROM authenticated;
GRANT UPDATE (status, payment_status) ON public.orders TO authenticated;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_ica_admin());

CREATE OR REPLACE FUNCTION public.set_ica_admin(target_user_id uuid, make_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_count integer; actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT public.is_ica_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF target_user_id IS NULL OR make_admin IS NULL THEN RAISE EXCEPTION 'Target and role are required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ica-admin-role-change'));
  IF target_user_id = actor AND NOT make_admin THEN RAISE EXCEPTION 'You cannot remove your own admin access'; END IF;
  IF NOT make_admin THEN
    SELECT count(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    IF admin_count <= 1 THEN RAISE EXCEPTION 'The last administrator cannot be removed'; END IF;
  END IF;
  UPDATE public.profiles SET role = CASE WHEN make_admin THEN 'admin' ELSE 'customer' END, updated_at = now() WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.set_ica_admin(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ica_admin(uuid, boolean) TO authenticated;

INSERT INTO public.settings(setting_key,setting_value) VALUES ('monthly_target','1000000') ON CONFLICT (setting_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view activity log" ON public.admin_audit_log;
CREATE POLICY "Admins can view activity log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_ica_admin());
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;
REVOKE ALL ON SEQUENCE public.admin_audit_log_id_seq FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_ica_admin_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor uuid := auth.uid(); entity text; action_name text;
BEGIN
  IF actor IS NULL OR NOT public.is_ica_admin() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  entity := TG_TABLE_NAME;
  action_name := lower(TG_OP);
  IF TG_TABLE_NAME = 'settings' THEN
    INSERT INTO public.admin_audit_log(actor_id,action,entity_type,entity_id) VALUES (actor,action_name,entity,COALESCE(NEW.setting_key,OLD.setting_key));
  ELSE
    INSERT INTO public.admin_audit_log(actor_id,action,entity_type,entity_id) VALUES (actor,action_name,entity,COALESCE(NEW.id::text,OLD.id::text));
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
DROP TRIGGER IF EXISTS admin_audit_products ON public.products;
CREATE TRIGGER admin_audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_ica_admin_change();
DROP TRIGGER IF EXISTS admin_audit_categories ON public.categories;
CREATE TRIGGER admin_audit_categories AFTER INSERT OR UPDATE OR DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.log_ica_admin_change();
DROP TRIGGER IF EXISTS admin_audit_settings ON public.settings;
CREATE TRIGGER admin_audit_settings AFTER INSERT OR UPDATE OR DELETE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.log_ica_admin_change();
DROP TRIGGER IF EXISTS admin_audit_orders ON public.orders;
CREATE TRIGGER admin_audit_orders AFTER UPDATE OF status,payment_status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_ica_admin_change();
DROP TRIGGER IF EXISTS admin_audit_profile_role ON public.profiles;
CREATE TRIGGER admin_audit_profile_role AFTER UPDATE OF role ON public.profiles FOR EACH ROW WHEN (OLD.role IS DISTINCT FROM NEW.role) EXECUTE FUNCTION public.log_ica_admin_change();

CREATE OR REPLACE FUNCTION public.enforce_ica_order_status_flow()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT ((OLD.status='pending' AND NEW.status IN ('confirmed','cancelled')) OR
          (OLD.status='confirmed' AND NEW.status IN ('shipped','cancelled')) OR
          (OLD.status='shipped' AND NEW.status='delivered')) THEN
    RAISE EXCEPTION 'Invalid order status transition: % to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_ica_order_status_flow ON public.orders;
CREATE TRIGGER enforce_ica_order_status_flow BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_ica_order_status_flow();

CREATE OR REPLACE FUNCTION public.restore_ica_stock_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    UPDATE public.products p SET stock = p.stock + oi.quantity, updated_at = now()
    FROM public.order_items oi WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS restore_ica_stock_on_cancel ON public.orders;
CREATE TRIGGER restore_ica_stock_on_cancel AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.restore_ica_stock_on_cancel();
