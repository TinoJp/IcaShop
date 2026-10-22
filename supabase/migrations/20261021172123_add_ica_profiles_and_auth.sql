/*
# Add iCa profiles and authentication roles

1. New Tables
- `profiles` stores each signed-in customer's editable name, phone, and delivery address.
- `profiles.id` matches the Supabase Auth user ID.
- `profiles.role` stores the server-controlled account role: `customer` or `admin`.
- `profiles.created_at` and `profiles.updated_at` track profile changes.

2. Account setup
- A database trigger creates a customer profile automatically when a new Auth account is registered.
- New accounts receive the customer role and cannot choose an admin role.

3. Security
- Row Level Security is enabled on `profiles`.
- Customers can read and update only their own profile.
- The role and profile ownership fields are not client-writable.
- Profile creation and deletion are denied through the browser; account creation is handled by the Auth trigger.

4. Important notes
- Admin promotion is intentionally not exposed in this phase.
- The browser can safely use the profile role for display and navigation because database writes remain protected by RLS and column privileges.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users cannot create profiles from the browser" ON profiles;
CREATE POLICY "Users cannot create profiles from the browser" ON profiles FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Users cannot delete profiles from the browser" ON profiles;
CREATE POLICY "Users cannot delete profiles from the browser" ON profiles FOR DELETE TO authenticated USING (false);

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, phone, address) ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_ica_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ica_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_ica_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_ica_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_ica_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_ica_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_ica_user() FROM authenticated;