const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== INSPECTING CURRENT TENANT SETTINGS ===");
    const settings = await sql`
      SELECT tenant_id, business_full_name, custom_resend_key, sender_email 
      FROM tenant_settings;
    `;
    console.table(settings);
  } catch (err) {
    console.error("Error reading database:", err);
  } finally {
    await sql.end();
  }
}

main();
