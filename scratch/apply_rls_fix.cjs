const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== APPLYING STAFF RLS FIX ===");
    
    // 1. Drop existing policies on staff_profiles
    await sql`DROP POLICY IF EXISTS "tenant_isolation_staff" ON public.staff_profiles`;
    await sql`DROP POLICY IF EXISTS "allow_all_staff" ON public.staff_profiles`;
    await sql`DROP POLICY IF EXISTS "anon_select_staff" ON public.staff_profiles`;
    await sql`DROP POLICY IF EXISTS "authenticated_manage_staff" ON public.staff_profiles`;
    console.log("Dropped old policies.");

    // 2. Create authenticated policy
    await sql`
      CREATE POLICY "authenticated_manage_staff" ON public.staff_profiles
      FOR ALL
      TO authenticated
      USING (
          tenant_id::text = (
              SELECT raw_user_meta_data->>'tenant_id'
              FROM auth.users
              WHERE id = auth.uid()
          )
      )
    `;
    console.log("Created authenticated_manage_staff policy.");

    // 3. Create anonymous select policy
    await sql`
      CREATE POLICY "anon_select_staff" ON public.staff_profiles
      FOR SELECT
      TO anon
      USING (true)
    `;
    console.log("Created anon_select_staff policy.");

    console.log("SUCCESS: RLS policies updated.");
  } catch (err) {
    console.error("Error applying RLS fix:", err);
  } finally {
    await sql.end();
  }
}

main();
