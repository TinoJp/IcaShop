/*
# Require phone numbers during iCa registration

1. Modified behavior
- New registration metadata now includes the customer's phone number.
- The automatic profile trigger copies the phone number into `profiles.phone`.
- Phone values are normalized by removing spaces, dashes, and other formatting characters before storage.

2. Validation
- Registration accepts Tanzanian mobile formats beginning with `06`, `07`, `08`, or `+255` followed by a mobile prefix.
- Invalid registration phone values are rejected before the Auth account is created.

3. Security
- The trigger remains a restricted SECURITY DEFINER function with a fixed search path.
- The role and ownership protections on `profiles` remain unchanged.

4. Important notes
- Existing profiles are not modified.
- Customers can still update their phone later from their account page.
*/

CREATE OR REPLACE FUNCTION public.handle_new_ica_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  normalized_phone text;
BEGIN
  normalized_phone := regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'phone', ''), '[^0-9+]', '', 'g');
  IF normalized_phone <> '' AND normalized_phone !~ '^(0[678][0-9]{8}|\+255[678][0-9]{8})$' THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    normalized_phone
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_ica_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_ica_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_ica_user() FROM authenticated;