const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== INSERTING TEST MISSION WITH EMAIL ===");
    const [result] = await sql`
      INSERT INTO elevore_missions (client_name, client_email, status, tenant_id, address, service_type)
      VALUES ('Test User', 'testemail@gmail.com', 'scheduled', '4ec723ab-4612-4c23-a550-f220939ff1c4', '123 Test St', 'regular')
      RETURNING id, client_name, client_email;
    `;
    console.log("Inserted:", result);
  } catch (err) {
    console.error("Error inserting:", err);
  } finally {
    await sql.end();
  }
}

main();
