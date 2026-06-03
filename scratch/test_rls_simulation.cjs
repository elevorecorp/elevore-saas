const postgres = require('postgres');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function testRLS(jwtClaims, caseLabel) {
  console.log(`\n--- Testing RLS: ${caseLabel} ---`);
  try {
    const results = await sql.begin(async sql => {
      // 1. Set the role to authenticated
      await sql`SET LOCAL ROLE authenticated`;
      
      // 2. Set the jwt claims session variable
      await sql`SELECT set_config('request.jwt.claims', ${JSON.stringify(jwtClaims)}, true)`;
      
      // 3. Try to select clients
      const clients = await sql`SELECT id, name, tenant_id FROM public.clients`;
      return clients;
    });
    console.log(`Success! Retrieved ${results.length} clients.`);
    console.table(results);
  } catch (err) {
    console.error(`Error simulating RLS:`, err.message);
  }
}

async function main() {
  try {
    const userId = 'b38c9dd4-4723-4bf4-9f97-f4f51a82dc32'; // josemarioal14@gmail.com
    const correctTenantId = '4ec723ab-4612-4c23-a550-f220939ff1c4'; // Elevore Empire
    
    // Case 1: JWT contains tenant_id (after metadata sync & token refresh)
    await testRLS({
      sub: userId,
      role: 'authenticated',
      user_metadata: {
        tenant_id: correctTenantId,
        role: 'admin'
      }
    }, "JWT has tenant_id");

    // Case 2: JWT does NOT contain tenant_id (before token refresh or fallback check)
    await testRLS({
      sub: userId,
      role: 'authenticated',
      user_metadata: {}
    }, "JWT has NO tenant_id (checking database owner fallback)");

    // Case 3: Unauthorized user (different tenant owner or staff)
    const otherUserId = 'ebdbeb61-43e0-425a-8334-49e2e279dc98'; // test@example.com (owns different tenant)
    await testRLS({
      sub: otherUserId,
      role: 'authenticated',
      user_metadata: {}
    }, "Different tenant owner query (should not see Elevore Empire clients)");

  } catch (err) {
    console.error("Main execution error:", err);
  } finally {
    await sql.end();
  }
}

main();
