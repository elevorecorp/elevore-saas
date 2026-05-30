const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase credentials not found in .env');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Fetching tenants...');
  const { data: tenants, error: tenantError } = await sb.from('tenants').select('*');
  if (tenantError) {
    console.error('Error fetching tenants:', tenantError);
    process.exit(1);
  }

  if (!tenants || tenants.length === 0) {
    console.log('No tenants found.');
    process.exit(0);
  }

  for (const tenant of tenants) {
    console.log(`Configuring webhooks for tenant: ${tenant.business_name} (${tenant.id})`);
    
    // Ensure tenant settings exist
    const { data: existingSettings, error: selectSettingsError } = await sb
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    if (selectSettingsError) {
      console.error('Error checking tenant settings:', selectSettingsError);
      continue;
    }

    const payload = {
      webhook_completed: 'https://tangy-bottles-check.loca.lt/webhook/elevore-servicio-completado',
      webhook_quote_approved: 'https://tangy-bottles-check.loca.lt/webhook/elevore-quote-approved',
      webhook_en_route: 'https://tangy-bottles-check.loca.lt/webhook/elevore-en-route'
    };

    if (!existingSettings) {
      console.log('Settings row does not exist, inserting...');
      const { error: insertSettingsError } = await sb
        .from('tenant_settings')
        .insert({
          tenant_id: tenant.id,
          ...payload
        });
      if (insertSettingsError) {
        console.error('Error inserting settings:', insertSettingsError);
      } else {
        console.log('Inserted webhook settings successfully!');
      }
    } else {
      console.log('Settings row exists, updating...');
      const { error: updateSettingsError } = await sb
        .from('tenant_settings')
        .update(payload)
        .eq('tenant_id', tenant.id);
      if (updateSettingsError) {
        console.error('Error updating settings:', updateSettingsError);
      } else {
        console.log('Updated webhook settings successfully!');
      }
    }
  }
  console.log('Done!');
  process.exit(0);
}

run();
