const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== POLICIES ON staff_profiles ===");
    const policies = await sql`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'staff_profiles'
    `;
    console.table(policies);
  } catch (err) {
    console.error("Error fetching policies:", err);
  } finally {
    await sql.end();
  }
}

main();
