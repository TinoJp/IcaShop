CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'cancelled', 'delivered')),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, status)
);

CREATE INDEX IF NOT EXISTS customer_notifications_user_created_idx
  ON public.customer_notifications(user_id, created_at DESC);

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own notifications" ON public.customer_notifications;
CREATE POLICY "Customers can view their own notifications" ON public.customer_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers can mark their own notifications as read" ON public.customer_notifications;
CREATE POLICY "Customers can mark their own notifications as read" ON public.customer_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.customer_notifications FROM authenticated;
GRANT SELECT ON public.customer_notifications TO authenticated;
GRANT UPDATE (is_read) ON public.customer_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.create_ica_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_status text;
  notification_message text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    notification_status := NEW.status;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    notification_status := NEW.status;
  ELSE
    RETURN NEW;
  END IF;

  IF notification_status = 'pending' THEN
    notification_message := format(
      'Thank you for your order #%s! We have received it and it is now pending. We will update you when its status changes.',
      upper(left(NEW.id::text, 8))
    );
  ELSIF notification_status = 'cancelled' THEN
    notification_message := format(
      'Your order #%s has been cancelled. Please contact us if you have any questions.',
      upper(left(NEW.id::text, 8))
    );
  ELSIF notification_status = 'delivered' THEN
    notification_message := format(
      'Your order #%s has been delivered. Thank you for shopping with iCa!',
      upper(left(NEW.id::text, 8))
    );
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.customer_notifications (user_id, order_id, status, message)
  VALUES (NEW.user_id, NEW.id, notification_status, notification_message)
  ON CONFLICT (order_id, status) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_ica_order_notification ON public.orders;
CREATE TRIGGER create_ica_order_notification
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ica_order_notification();

REVOKE EXECUTE ON FUNCTION public.create_ica_order_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_ica_order_notification() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_ica_order_notification() FROM authenticated;
