const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres';
const sql = postgres(connectionString);

async function main() {
  try {
    console.log("Reading supabase_secure_rls.sql...");
    const filePath = path.join(__dirname, '../supabase_secure_rls.sql');
    const sqlContent = fs.readFileSync(filePath, 'utf8');

    console.log("Applying RLS policies, triggers, and migrations to Supabase database...");
    
    // Using sql.unsafe to run raw multi-statement DDL/DML script
    await sql.unsafe(sqlContent);
    
    console.log("Successfully applied RLS policies and synchronized metadata!");
  } catch (err) {
    console.error("Error applying SQL migration:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
