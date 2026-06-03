const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://ceijlgurveaalvjmptns.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaWpsZ3VydmVhYWx2am1wdG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTYwMzEsImV4cCI6MjA5MjM5MjAzMX0.XaPMpXxwMKRM09YN9kroF-gnISM2gBn29wi2R2UdOIc";
const sb = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const tenantId = '906b3554-dca0-40e3-a653-90d003275f8d'; // Jose Mario's Tenant ID

  console.log("==================================================================");
  console.log("🧪 INICIANDO VERIFICACIÓN DE FLUJO DE PAGOS MOCK");
  console.log("==================================================================");

  // 1. Crear una cotización / misión temporal de prueba
  console.log("\n1. Insertando misión temporal (lead) para simular cotización...");
  const { data: quote, error: createErr } = await sb
    .from('elevore_missions')
    .insert({
      tenant_id: tenantId,
      client_name: "Cliente Test de Pagos",
      client_email: "test_pagos@example.com",
      address: "742 Evergreen Terrace",
      service_type: "Limpieza Profunda",
      status: "lead",
      total_price: 250
    })
    .select()
    .single();

  if (createErr || !quote) {
    console.error("❌ Error creando cotización de prueba:", createErr?.message || "No retornó datos.");
    return;
  }

  const quoteId = quote.id;
  console.log(`✅ Cotización de prueba creada con ID: ${quoteId}`);

  // 2. Simular llamada a /api/create-checkout-session con mission_id (mock mode)
  console.log("\n2. Simulando llamada a la API de Checkout...");
  // Dado que no estamos corriendo el servidor backend Vercel de forma local, 
  // simularemos la respuesta de la lógica que acabamos de meter en api/create-checkout-session.js.
  // Lógica: Si mission_id está presente, la URL de éxito redirige al portal con ?propuesta=ID&payment_success=true
  
  const mockAmount = Math.round(quote.total_price * 0.20); // 20% deposit = 50
  const mockSessionId = 'cs_mock_' + Math.random().toString(36).substring(2, 11);
  const successUrl = `http://localhost:5173/?propuesta=${quoteId}&payment_success=true&session_id=${mockSessionId}&mock=true&amount=${mockAmount}`;
  
  console.log(`- Monto del depósito (20%): $${mockAmount}`);
  console.log(`- URL de redirección generada (Simulación): ${successUrl}`);

  // 3. Simular el retorno al Client Portal y la sincronización (Client-side fallback)
  console.log("\n3. Simulando sincronización en el Portal del Cliente (Retorno de Stripe)...");
  // Al retornar de Stripe con ?payment_success=true, el componente ejecuta:
  const updatedSpecs = {
    ...(quote.specs || {}),
    deposit_paid: true,
    payment_method: 'stripe',
    paid_at: new Date().toISOString(),
    stripe_session_id: mockSessionId
  };

  const updateData = {
    status: 'scheduled',
    specs: updatedSpecs
  };

  console.log("- Enviando actualización del portal a Supabase...");
  const { data: updated, error: updateErr } = await sb
    .from('elevore_missions')
    .update(updateData)
    .eq('id', quoteId)
    .select()
    .single();

  if (updateErr) {
    console.error("❌ Error actualizando misión tras el pago:", updateErr.message);
  } else {
    console.log("✅ Misión actualizada en Supabase:");
    console.log(`  - Nuevo estado: ${updated.status}`);
    console.log(`  - ¿Depósito pagado?: ${updated.specs?.deposit_paid}`);
    console.log(`  - Método de pago: ${updated.specs?.payment_method}`);
    console.log(`  - ID sesión de Stripe: ${updated.specs?.stripe_session_id}`);
    console.log(`  - Fecha pago: ${updated.specs?.paid_at}`);
  }

  // 4. Limpieza: Eliminar la misión de prueba
  console.log("\n4. Limpiando datos de prueba...");
  const { error: delErr } = await sb
    .from('elevore_missions')
    .delete()
    .eq('id', quoteId);

  if (delErr) {
    console.error("❌ Error eliminando misión de prueba:", delErr.message);
  } else {
    console.log("✅ Datos de prueba eliminados correctamente.");
  }

  console.log("\n==================================================================");
}

main();
