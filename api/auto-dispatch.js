import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ceijlgurveaalvjmptns.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                       process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                       process.env.VITE_SUPABASE_ANON_KEY;

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Haversine Distance Formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // in meters
}

// Simple Geocoding helper using Nominatim
async function geocodeAddress(address) {
  if (!address) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
      headers: {
        'User-Agent': 'ElevoreSaaS/1.0 (contact@elevorecorp.com)'
      }
    });
    const data = await res.json();
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (e) {
    console.error("Geocoding failed for:", address, e);
  }
  return null;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Support both GET and POST for easy integration
  const missionId = req.query.mission_id || req.body?.mission_id;

  if (!missionId) {
    return res.status(400).json({ error: 'Missing mission_id parameter' });
  }

  try {
    console.log(`[AI Auto-Dispatcher]: Processing mission ID ${missionId}...`);

    // 1. Fetch Mission from Supabase
    const { data: mission, error: missionErr } = await sb
      .from('elevore_missions')
      .select('*')
      .eq('id', missionId)
      .maybeSingle();

    if (missionErr || !mission) {
      return res.status(404).json({ error: `Mission not found: ${missionErr?.message || 'Empty result'}` });
    }

    const tenantId = mission.tenant_id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Mission has no tenant_id associated.' });
    }

    let jobLat = mission.specs?.lat;
    let jobLng = mission.specs?.lng;

    // 2. Geocode address if coordinates are missing in specs
    if (jobLat === undefined || jobLng === undefined || jobLat === null || jobLng === null) {
      console.log(`[AI Auto-Dispatcher]: Coordinates missing. Geocoding address: "${mission.address}"`);
      const coords = await geocodeAddress(mission.address);
      if (coords) {
        jobLat = coords.lat;
        jobLng = coords.lng;
        console.log(`[AI Auto-Dispatcher]: Geocoding success: ${jobLat}, ${jobLng}`);
      } else {
        // Fallback coordinates (Downtown Orlando) if Nominatim rate-limits or fails
        console.warn(`[AI Auto-Dispatcher]: Geocoding failed. Using Orlando default fallback coords.`);
        jobLat = 28.5383;
        jobLng = -81.3792;
      }
    }

    // 3. Fetch Active Crew Locations (Updated within the last 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data: activeLocations, error: locErr } = await sb
      .from('crew_locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('updated_at', twelveHoursAgo);

    if (locErr) {
      console.error('[AI Auto-Dispatcher]: Error querying crew locations:', locErr);
    }

    // 4. Fetch Staff Profiles to map location to worker names
    const { data: staffProfiles, error: staffErr } = await sb
      .from('staff_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('role', 'staff');

    if (staffErr || !staffProfiles) {
      return res.status(500).json({ error: `Could not load staff profiles: ${staffErr?.message}` });
    }

    let assignedStaff = null;
    let shortestDistance = Infinity;

    // 5. Match active crew locations to staff profiles and calculate distances
    if (activeLocations && activeLocations.length > 0) {
      for (const loc of activeLocations) {
        const staffProfile = staffProfiles.find(s => s.id === loc.staff_id);
        if (!staffProfile) continue;

        const distance = calculateDistance(jobLat, jobLng, Number(loc.lat), Number(loc.lng));
        console.log(`[AI Auto-Dispatcher]: Calculated distance to ${staffProfile.name}: ${distance} meters`);

        if (distance < shortestDistance) {
          shortestDistance = distance;
          assignedStaff = staffProfile;
        }
      }
    }

    let isFallback = false;
    // 6. Fallback: If no staff broadcasted location in the last 12 hours, pick the first staff profile
    if (!assignedStaff) {
      console.warn('[AI Auto-Dispatcher]: No active GPS signals found. Falling back to default staff roster.');
      if (staffProfiles.length > 0) {
        assignedStaff = staffProfiles[0];
        isFallback = true;
        shortestDistance = 0; // Distance unknown
      } else {
        return res.status(404).json({ error: 'No staff profiles available for assignment in this tenant.' });
      }
    }

    // 7. Update Mission with assignment details
    const updatedSpecs = {
      ...(mission.specs || {}),
      lat: jobLat,
      lng: jobLng,
      dispatch_method: 'ai_auto_dispatcher',
      dispatch_distance_meters: isFallback ? null : shortestDistance,
      dispatched_at: new Date().toISOString(),
      is_fallback_dispatch: isFallback
    };

    const updatePayload = {
      team_assigned: assignedStaff.name,
      status: mission.status === 'lead' || mission.status === 'estimate' ? 'scheduled' : mission.status,
      specs: updatedSpecs
    };

    const { error: saveErr } = await sb
      .from('elevore_missions')
      .update(updatePayload)
      .eq('id', missionId);

    if (saveErr) {
      console.error('[AI Auto-Dispatcher]: Failed to update mission database record:', saveErr);
      return res.status(500).json({ error: `Database update failed: ${saveErr.message}` });
    }

    console.log(`[AI Auto-Dispatcher]: Mission ${missionId} assigned successfully to ${assignedStaff.name} (Distance: ${isFallback ? 'Fallback' : shortestDistance + 'm'})`);

    // Simulate sending dispatch notification via WhatsApp / webhook
    const dispatchMessage = `¡Hola ${assignedStaff.name}! Se te ha asignado automáticamente la misión de ${mission.service_type} en ${mission.address}. Tarifa estimada: $${mission.total_price || 0} USD. Abre la app para iniciar tu shift.`;
    console.log(`[SMS/WhatsApp Simulator]: ${dispatchMessage}`);

    return res.status(200).json({
      success: true,
      assignedWorker: assignedStaff.name,
      workerId: assignedStaff.id,
      distanceMeters: isFallback ? null : shortestDistance,
      isFallback,
      geocodedCoords: { lat: jobLat, lng: jobLng }
    });

  } catch (error) {
    console.error('[AI Auto-Dispatcher]: Unexpected exception:', error);
    return res.status(500).json({ error: error.message });
  }
}
