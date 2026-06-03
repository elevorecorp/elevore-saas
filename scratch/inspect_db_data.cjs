const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== INSPECTING SUPABASE DATABASE ===");
    
    // 1. Check clients count and sample
    const clientsCount = await sql`SELECT COUNT(*)::integer FROM public.clients`;
    console.log(`Total clients in database: ${clientsCount[0].count}`);
    
    const sampleClients = await sql`SELECT id, name, email, tenant_id FROM public.clients LIMIT 5`;
    console.log("Sample clients:");
    console.table(sampleClients);

    // 2. Check tenants
    const tenants = await sql`SELECT id, business_name, owner_id FROM public.tenants`;
    console.log(`Total tenants: ${tenants.length}`);
    console.table(tenants);

    // 3. Check auth.users
    const users = await sql`SELECT id, email, raw_user_meta_data FROM auth.users`;
    console.log(`Total auth users: ${users.length}`);
    users.forEach(u => {
      console.log(`User ID: ${u.id}`);
      console.log(`Email: ${u.email}`);
      console.log(`Metadata:`, JSON.stringify(u.raw_user_meta_data, null, 2));
      console.log("-----------------------------------------");
    });
    
  } catch (err) {
    console.error("Error inspecting database:", err);
  } finally {
    await sql.end();
  }
}

main();
