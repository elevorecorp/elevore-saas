const postgres = require('postgres');

const connectionString = 'postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres';
const sql = postgres(connectionString);

async function main() {
  const tenantId = '4ec723ab-4612-4c23-a550-f220939ff1c4'; // Elevore Empire
  console.log(`=== STARTING PRICING LIMITS & DEGRADATION TEST FOR: ${tenantId} ===`);

  try {
    // 1. Set tenant to 'free' plan to simulate trial expiration or manual downgrade
    console.log("\n1. Simulating subscription degradation to 'free'...");
    await sql`
      UPDATE public.tenants
      SET stripe_subscription_status = 'free'
      WHERE id = ${tenantId}
    `;

    // Fetch updated tenant to confirm
    const [tenant] = await sql`
      SELECT id, business_name, stripe_subscription_status
      FROM public.tenants
      WHERE id = ${tenantId}
    `;
    console.log(`✅ Tenant status updated: stripe_subscription_status = '${tenant.stripe_subscription_status}'`);

    // 2. Count missions created in the current calendar month
    console.log("\n2. Counting current month's missions in the database...");
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const missions = await sql`
      SELECT id, client_name, created_at
      FROM public.elevore_missions
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startOfMonth.toISOString()}
    `;

    console.log(`Found ${missions.length} missions created since ${startOfMonth.toISOString().split('T')[0]}:`);
    missions.forEach((m, i) => {
      console.log(`  [${i + 1}] Client: ${m.client_name} (Created: ${m.created_at.toISOString()})`);
    });

    const isLimitExceeded = missions.length >= 2;
    console.log(`📊 Limit calculation (Count >= 2?): ${isLimitExceeded ? '⚠️ LIMIT EXCEEDED!' : '✅ ACCESS GRANTED'}`);

    // 3. Restore status to 'trialing' to leave the test tenant in its default clean state
    console.log("\n3. Restoring tenant state to 'trialing'...");
    await sql`
      UPDATE public.tenants
      SET stripe_subscription_status = 'trialing'
      WHERE id = ${tenantId}
    `;
    console.log("✅ Tenant status successfully restored.");

  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    await sql.end();
  }
}

main();
