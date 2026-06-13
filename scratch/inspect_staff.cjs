const postgres = require('postgres');
const connectionString = 'postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres';
const sql = postgres(connectionString);

async function main() {
  try {
    console.log("=== INSPECTING STAFF PROFILES ===");
    const profiles = await sql`SELECT id, tenant_id, name, role, passcode, wallet_balance, total_earned FROM staff_profiles;`;
    console.table(profiles);

    console.log("\n=== INSPECTING MISSIONS ===");
    const missions = await sql`SELECT id, tenant_id, client_name, service_type, status, total_price, team_assigned FROM elevore_missions ORDER BY created_at DESC LIMIT 5;`;
    console.table(missions);
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await sql.end();
  }
}
main();
