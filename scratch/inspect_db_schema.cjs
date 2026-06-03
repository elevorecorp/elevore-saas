const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("Conectando a Supabase para inspeccionar columnas...");
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'elevore_missions' 
      ORDER BY ordinal_position;
    `;
    console.log("Columnas de elevore_missions:");
    console.table(columns);
  } catch (err) {
    console.error("Error al inspeccionar la base de datos:", err);
  } finally {
    await sql.end();
  }
}

main();
