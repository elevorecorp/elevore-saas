const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== INSPECTING ALL STAFF PROFILES ===");
    const profiles = await sql`
      SELECT id, tenant_id, user_id, name, role, passcode
      FROM public.staff_profiles
    `;
    console.table(profiles);
  } catch (err) {
    console.error("Error inspecting staff profiles:", err);
  } finally {
    await sql.end();
  }
}

main();
