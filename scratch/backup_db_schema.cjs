const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres';
const sql = postgres(connectionString);

async function main() {
  try {
    console.log("=== STARTING DATABASE SCHEMA AND STATUS BACKUP ===");
    const backup = {
      timestamp: new Date().toISOString(),
      database: 'db.ceijlgurveaalvjmptns.supabase.co',
      tables: {},
      policies: [],
      triggers: []
    };

    // 1. Get all tables in public schema
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    console.log(`Found ${tables.length} tables in public schema.`);

    // 2. Fetch columns and row count for each table
    for (const t of tables) {
      const tableName = t.table_name;
      console.log(`Backing up schema and row count for table: ${tableName}...`);

      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      const rowCountResult = await sql.unsafe(`SELECT COUNT(*)::integer FROM public."${tableName}"`);
      const rowCount = rowCountResult[0].count;

      backup.tables[tableName] = {
        rowCount,
        columns: columns.map(c => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable,
          default: c.column_default
        }))
      };
    }

    // 3. Fetch RLS Policies
    console.log("Backing up RLS policies...");
    const policies = await sql`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
    `;
    backup.policies = policies.map(p => ({
      table: p.tablename,
      name: p.policyname,
      roles: p.roles,
      cmd: p.cmd,
      using: p.qual,
      withCheck: p.with_check
    }));

    // 4. Fetch triggers
    console.log("Backing up triggers...");
    const triggers = await sql`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement, action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `;
    backup.triggers = triggers.map(tr => ({
      name: tr.trigger_name,
      event: tr.event_manipulation,
      table: tr.event_object_table,
      timing: tr.action_timing,
      action: tr.action_statement
    }));

    // 5. Write to backup file
    const backupPath = path.join(__dirname, '../supabase_backup_schema_20260603.json');
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
    console.log(`Database snapshot saved successfully to: ${backupPath}`);
    console.log("=== DATABASE BACKUP COMPLETE ===");

  } catch (err) {
    console.error("Error during schema backup:", err);
  } finally {
    await sql.end();
  }
}

main();
