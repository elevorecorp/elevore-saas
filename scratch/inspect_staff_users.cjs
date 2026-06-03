const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== INSPECTING STAFF PROFILES WITH USER_ID ===");
    const profiles = await sql`
      SELECT id, tenant_id, user_id, name, role 
      FROM public.staff_profiles 
      WHERE user_id IS NOT NULL
    `;
    console.table(profiles);
  } catch (err) {
    console.error("Error inspecting staff profiles:", err);
  } finally {
    await sql.end();
  }
}

main();
