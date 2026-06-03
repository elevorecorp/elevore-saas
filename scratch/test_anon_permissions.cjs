const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://ceijlgurveaalvjmptns.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaWpsZ3VydmVhYWx2am1wdG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTYwMzEsImV4cCI6MjA5MjM5MjAzMX0.XaPMpXxwMKRM09YN9kroF-gnISM2gBn29wi2R2UdOIc";

const sb = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const tenantId = '906b3554-dca0-40e3-a653-90d003275f8d'; // jose mario's tenant_id from database inspection

  console.log("==================================================================");
  console.log("🧪 PROBANDO POLÍTICAS DE ACCESO ANÓNIMO (RLS)");
  console.log("==================================================================");

  // 1. Intentar obtener perfiles de staff (Debe ser denegado / 0 filas)
  console.log("\n1. Obteniendo staff_profiles de forma anónima...");
  const { data: staff, error: stErr } = await sb.from('staff_profiles').select('*');
  console.log("Resultado: ", stErr ? `Error: ${stErr.message}` : `Filas obtenidas: ${staff.length}`);
  if (staff && staff.length > 0) {
    console.log("⚠️ ALERTA: ¡Acceso no seguro! Se pudieron leer los empleados anónimamente.");
  } else {
    console.log("✅ SEGURO: Acceso denegado o 0 filas retornadas.");
  }

  // 2. Intentar obtener clientes (Debe ser denegado / 0 filas)
  console.log("\n2. Obteniendo clients de forma anónima...");
  const { data: clients, error: cErr } = await sb.from('clients').select('*');
  console.log("Resultado: ", cErr ? `Error: ${cErr.message}` : `Filas obtenidas: ${clients.length}`);
  if (clients && clients.length > 0) {
    console.log("⚠️ ALERTA: ¡Acceso no seguro! Se pudieron leer los clientes anónimamente.");
  } else {
    console.log("✅ SEGURO: Acceso denegado o 0 filas retornadas.");
  }

  // 3. Obtener configuraciones del tenant (Debe funcionar para el widget)
  console.log("\n3. Obteniendo tenant_settings de forma anónima...");
  const { data: settings, error: sErr } = await sb.from('tenant_settings').select('*').eq('tenant_id', tenantId);
  console.log("Resultado: ", sErr ? `Error: ${sErr.message}` : `Filas obtenidas: ${settings.length}`);
  if (settings && settings.length > 0) {
    console.log("✅ CORRECTO: El widget puede leer la configuración del negocio.");
  } else {
    console.log("⚠️ ERROR: El widget no puede leer la configuración.");
  }

  // 4. Intentar crear una misión con estado 'completed' (Debe fallar por la política RLS)
  console.log("\n4. Intentando insertar misión con estado 'completed' de forma anónima...");
  const { data: insertCompleted, error: icErr } = await sb.from('elevore_missions').insert([{
    tenant_id: tenantId,
    client_name: 'Intruso Anónimo',
    status: 'completed',
    service_type: 'Limpieza Regular',
    total_price: 150
  }]).select();
  if (icErr) {
    console.log("✅ SEGURO: Inserción bloqueada por RLS. Mensaje:", icErr.message);
  } else {
    console.log("⚠️ ALERTA: ¡Acceso no seguro! Un usuario anónimo pudo crear una misión completada.");
  }

  // 5. Intentar crear una misión con estado 'lead' (Debe funcionar para el widget)
  console.log("\n5. Intentando insertar misión con estado 'lead' (reserva pública) de forma anónima...");
  const { data: insertLead, error: ilErr } = await sb.from('elevore_missions').insert([{
    tenant_id: tenantId,
    client_name: 'Cliente Widget Test RLS',
    status: 'lead',
    service_type: 'Limpieza Regular',
    total_price: 100
  }]).select();
  if (ilErr) {
    console.log("⚠️ ERROR: El widget no pudo crear el lead. Mensaje:", ilErr.message);
  } else {
    console.log("✅ CORRECTO: Lead creado exitosamente por RLS.");
    // Limpieza del registro de prueba
    if (insertLead && insertLead.length > 0) {
      console.log("Limpiando lead de prueba...");
      const { error: delErr } = await sb.from('elevore_missions').delete().eq('id', insertLead[0].id);
      if (delErr) {
        console.log("Nota: No se pudo eliminar el lead de prueba de forma anónima (lo cual es seguro y correcto por RLS).");
      } else {
        console.log("Lead eliminado.");
      }
    }
  }

  console.log("\n==================================================================");
}

main();
