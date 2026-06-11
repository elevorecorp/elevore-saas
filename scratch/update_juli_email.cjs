const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== UPDATING JULI MISSION EMAIL ===");
    const result = await sql`
      UPDATE elevore_missions 
      SET client_email = 'elevorecorporation@gmail.com' 
      WHERE id = '72d052c8-63f5-466e-a135-0d1470120b8d'
      RETURNING id, client_name, client_email;
    `;
    console.log("Updated:", result);
  } catch (err) {
    console.error("Error updating:", err);
  } finally {
    await sql.end();
  }
}

main();
