const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== INSPECTING ELEVORE MISSIONS ===");
    const missions = await sql`
      SELECT id, client_name, client_email, status, created_at
      FROM elevore_missions
      WHERE tenant_id = '4ec723ab-4612-4c23-a550-f220939ff1c4'
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    console.table(missions);
  } catch (err) {
    console.error("Error reading database:", err);
  } finally {
    await sql.end();
  }
}

main();
