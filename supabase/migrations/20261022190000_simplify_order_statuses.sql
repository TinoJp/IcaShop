-- Keep delivery progress simple and track payment separately.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

UPDATE public.orders
SET payment_status = 'unpaid'
WHERE payment_status IS NULL OR btrim(payment_status) = '';

ALTER TABLE public.orders ALTER COLUMN payment_status SET DEFAULT 'unpaid';
ALTER TABLE public.orders ALTER COLUMN payment_status SET NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid'));

-- Remove the old transition guard while normalizing legacy in-between states.
DROP TRIGGER IF EXISTS enforce_ica_order_status_flow ON public.orders;

UPDATE public.orders
SET status = 'pending'
WHERE status NOT IN ('pending', 'delivered', 'cancelled');

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'delivered', 'cancelled'));

CREATE OR REPLACE FUNCTION public.enforce_ica_order_status_flow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status IN ('delivered', 'cancelled') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid order status transition: % to %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER enforce_ica_order_status_flow
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_ica_order_status_flow();

CREATE OR REPLACE FUNCTION public.restore_ica_stock_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    UPDATE public.products p
    SET stock = p.stock + oi.quantity, updated_at = now()
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restore_ica_stock_on_cancel ON public.orders;
CREATE TRIGGER restore_ica_stock_on_cancel
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.restore_ica_stock_on_cancel();

REVOKE UPDATE ON public.orders FROM authenticated;
GRANT UPDATE (status, payment_status) ON public.orders TO authenticated;

NOTIFY pgrst, 'reload schema';
