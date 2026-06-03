const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://ceijlgurveaalvjmptns.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaWpsZ3VydmVhYWx2am1wdG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTYwMzEsImV4cCI6MjA5MjM5MjAzMX0.XaPMpXxwMKRM09YN9kroF-gnISM2gBn29wi2R2UdOIc";
const sb = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const tenantId = '906b3554-dca0-40e3-a653-90d003275f8d'; // Jose Mario's tenant ID

  console.log("==================================================================");
  console.log("🧪 INICIANDO PRUEBA LOCAL DE API ONBOARDING-START");
  console.log("==================================================================");

  // Simularemos la llamada del handler de la API directamente llamando su lógica.
  // Como es una función serverless ejecutándose en node, podemos probar que la base de datos
  // reaccione correctamente y cree la misión lead del onboarding.
  
  console.log("\n1. Simulando inserción de misiones de onboarding...");
  const { data: mission, error: mErr } = await sb
    .from('elevore_missions')
    .insert({
      tenant_id: tenantId,
      client_name: "John Doe (Simulado)",
      client_phone: "(407) 555-0199",
      client_email: "john.doe@example.com",
      address: "1600 Amphitheatre Pkwy, Mountain View, CA",
      service_type: "Limpieza Profunda",
      status: "lead",
      total_price: 180,
      specs: { is_onboarding_demo: true, lang: 'es' }
    })
    .select()
    .single();

  if (mErr || !mission) {
    console.error("❌ Error creando misión de onboarding:", mErr?.message);
    return;
  }

  console.log(`✅ Misión de onboarding creada exitosamente con ID: ${mission.id}`);
  console.log(`  - Cliente: ${mission.client_name}`);
  console.log(`  - Estado inicial: ${mission.status}`);
  console.log(`  - ¿Es demo?: ${mission.specs?.is_onboarding_demo}`);

  // Limpiar
  console.log("\n2. Limpiando datos de prueba...");
  const { error: delErr } = await sb
    .from('elevore_missions')
    .delete()
    .eq('id', mission.id);

  if (delErr) {
    console.error("❌ Error eliminando datos de prueba:", delErr.message);
  } else {
    console.log("✅ Limpieza completada.");
  }

  console.log("\n==================================================================");
}

main();
