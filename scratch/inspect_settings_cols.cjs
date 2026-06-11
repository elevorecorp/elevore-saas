const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== INSPECTING TENANT SETTINGS COLUMNS ===");
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenant_settings' 
      ORDER BY ordinal_position;
    `;
    console.table(columns);
  } catch (err) {
    console.error("Error inspecting database:", err);
  } finally {
    await sql.end();
  }
}

main();
