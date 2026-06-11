const postgres = require('postgres');
const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== TENANTS ===");
    const tenants = await sql`SELECT id, business_name, slug FROM tenants;`;
    console.table(tenants);

    console.log("=== RECENT MISSIONS ===");
    const missions = await sql`
      SELECT id, tenant_id, client_name, client_email, address, service_type, status, total_price 
      FROM elevore_missions 
      ORDER BY created_at DESC 
      LIMIT 10;
    `;
    console.table(missions);
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    await sql.end();
  }
}
main();
