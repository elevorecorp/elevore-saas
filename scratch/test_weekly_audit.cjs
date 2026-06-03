const postgres = require('postgres');

const connectionString = 'postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres';
const sql = postgres(connectionString);

async function main() {
  try {
    const tenantId = '4ec723ab-4612-4c23-a550-f220939ff1c4'; // Elevore Empire
    console.log(`=== RUNNING WEEKLY AUDIT SIMULATION FOR TENANT: ${tenantId} ===`);

    // 1. Update settings to ensure timezone and owner_phone are configured for testing
    console.log("Updating tenant_settings timezone and owner_phone...");
    await sql`
      UPDATE public.tenant_settings 
      SET timezone = 'America/New_York', owner_phone = '+14079524228'
      WHERE tenant_id = ${tenantId}
    `;

    // 2. Fetch target settings
    const settings = await sql`
      SELECT tenant_id, timezone, google_review_link, owner_phone, zelle_phone, business_full_name 
      FROM public.tenant_settings 
      WHERE tenant_id = ${tenantId}
    `;
    const target = settings[0];
    console.log("Active configuration:", target);

    // 3. Calculate local dates for the last 7 days in America/New_York
    const currentUtc = new Date();
    const tz = target.timezone || 'America/New_York';
    
    console.log(`Calculating last 7 days in timezone: ${tz}...`);
    const localDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentUtc.getTime() - i * 24 * 60 * 60 * 1000);
      const formatterDate = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = formatterDate.formatToParts(d);
      const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
      localDates.push(`${partMap.year}-${partMap.month}-${partMap.day}`);
    }
    console.log("Target local dates to inspect:", localDates);

    // 4. Query weekly jobs
    console.log("Querying completed/paid jobs in the database for this week...");
    const weeklyJobs = await sql`
      SELECT id, total_price, status, client_rating 
      FROM public.elevore_missions
      WHERE tenant_id = ${tenantId} 
        AND scheduled_date = ANY(${localDates})
        AND status IN ('completed', 'paid')
    `;
    
    console.log(`Found ${weeklyJobs.length} eligible jobs.`);

    // 5. Aggregate stats
    let totalRevenue = 0;
    let jobsCompleted = 0;
    let googleReviewsRequested = 0;

    weeklyJobs.forEach(job => {
      totalRevenue += Number(job.total_price || 0);
      jobsCompleted++;
      if (job.client_rating && Number(job.client_rating) === 5) {
        googleReviewsRequested++;
      }
    });

    const milesSaved = Number((jobsCompleted * 3.4).toFixed(1));
    const fuelSaved = Number((milesSaved / 20.0).toFixed(1));

    // Get Year and Week Number
    const formatterYear = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' });
    const localYear = parseInt(formatterYear.format(currentUtc), 10);
    
    const jan4 = new Date(localYear, 0, 4);
    const dayDiff = Math.floor((currentUtc - jan4) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((dayDiff + jan4.getDay() + 1) / 7);

    // Fetch tenant business name
    const tenant = await sql`SELECT business_name FROM public.tenants WHERE id = ${tenantId}`;
    const bizName = target.business_full_name || tenant[0]?.business_name || "Elevore Empire";

    console.log("\n=========================================");
    console.log("📊 WEEKLY AUDIT CALCULATED METRICS:");
    console.log(`- Week Number: ${weekNumber} (${localYear})`);
    console.log(`- Total Revenue: $${totalRevenue}`);
    console.log(`- Jobs Completed: ${jobsCompleted}`);
    console.log(`- Miles Saved (AI Dispatch): ${milesSaved} mi`);
    console.log(`- Fuel Saved: ${fuelSaved} gal`);
    console.log(`- Reviews Requested (5-star): ${googleReviewsRequested}`);
    console.log("=========================================");

    // 6. Format WhatsApp Message
    const reviewLink = target.google_review_link || "https://g.page/r/review";
    const messageText = `👑 *${bizName.toUpperCase()}: Weekly Empire Audit* 👑\n\n` +
      `¡Felicidades por otra gran semana de trabajo!\n\n` +
      `💰 *Ingresos*: $${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
      `✅ *Misiones*: ${jobsCompleted} servicios completados\n` +
      `🌱 *AI Dispatch*: Ahorraste *${milesSaved} millas* de conducción (~${fuelSaved} galones de gasolina).\n` +
      `⭐ *Reviews*: Conseguiste ${googleReviewsRequested} booster invitaciones de 5 estrellas.\n\n` +
      `👉 *Boost Google*: Invita a tus clientes a calificar tu servicio aquí: ${reviewLink}`;

    console.log("\n💬 GENERATED WHATSAPP MESSAGE TEXT:");
    console.log(messageText);
    console.log("=========================================");

  } catch (err) {
    console.error("Error in Weekly Audit test:", err);
  } finally {
    await sql.end();
  }
}

main();
