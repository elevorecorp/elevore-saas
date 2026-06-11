const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== INSPECTING SPECS AND EMAIL ===");
    const mission = await sql`
      SELECT id, client_name, client_email, specs 
      FROM elevore_missions
      WHERE id = '72d052c8-63f5-466e-a135-0d1470120b8d';
    `;
    console.log(JSON.stringify(mission[0], null, 2));
  } catch (err) {
    console.error("Error reading database:", err);
  } finally {
    await sql.end();
  }
}

main();
