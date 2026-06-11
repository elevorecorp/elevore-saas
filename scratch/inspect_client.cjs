const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== INSPECTING CLIENTS ===");
    const clients = await sql`
      SELECT id, name, email, phone, tenant_id
      FROM clients
      WHERE tenant_id = '4ec723ab-4612-4c23-a550-f220939ff1c4'
      ORDER BY name ASC;
    `;
    console.table(clients);
  } catch (err) {
    console.error("Error reading database:", err);
  } finally {
    await sql.end();
  }
}

main();
