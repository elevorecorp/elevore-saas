const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://ceijlgurveaalvjmptns.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaWpsZ3VydmVhYWx2am1wdG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTYwMzEsImV4cCI6MjA5MjM5MjAzMX0.XaPMpXxwMKRM09YN9kroF-gnISM2gBn29wi2R2UdOIc";

const sb = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const tenantId = '4ec723ab-4612-4c23-a550-f220939ff1c4'; // Jei's tenant_id

  console.log("1. Fetching elevore_missions as anonymous user...");
  const { data: missions, error: mErr } = await sb.from('elevore_missions').select('*').eq('tenant_id', tenantId);
  console.log("Missions error:", mErr);
  console.log("Missions count:", missions ? missions.length : null);

  console.log("\n2. Fetching clients as anonymous user...");
  const { data: clients, error: cErr } = await sb.from('clients').select('*').eq('tenant_id', tenantId);
  console.log("Clients error:", cErr);
  console.log("Clients count:", clients ? clients.length : null);

  console.log("\n3. Fetching tenant_settings as anonymous user...");
  const { data: settings, error: sErr } = await sb.from('tenant_settings').select('*').eq('tenant_id', tenantId);
  console.log("Settings error:", sErr);
  console.log("Settings count:", settings ? settings.length : null);
}

main();
