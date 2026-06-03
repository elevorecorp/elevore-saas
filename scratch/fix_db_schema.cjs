const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("Conectando a Supabase para aplicar alteración de tabla...");
    
    // Add client_email column to elevore_missions if it doesn't exist
    await sql`
      ALTER TABLE public.elevore_missions 
      ADD COLUMN IF NOT EXISTS client_email TEXT;
    `;
    console.log("✅ Columna client_email agregada (o ya existía) a elevore_missions.");

    // Let's also verify that it was successfully added
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'elevore_missions' 
      ORDER BY ordinal_position;
    `;
    console.table(columns);

  } catch (err) {
    console.error("❌ Error alterando la base de datos:", err);
  } finally {
    await sql.end();
  }
}

main();
