const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== ADDING SENDER EMAIL COLUMN ===");
    await sql`
      ALTER TABLE tenant_settings 
      ADD COLUMN IF NOT EXISTS sender_email text;
    `;
    console.log("Column sender_email added successfully!");
  } catch (err) {
    console.error("Error adding column:", err);
  } finally {
    await sql.end();
  }
}

main();
