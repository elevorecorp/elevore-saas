import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { tenant_id } = req.query;

    if (!tenant_id) {
      return res.status(400).send('Error: Missing tenant_id parameter');
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).send('Error: Supabase environment variables not configured on server');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: missions, error } = await supabase
      .from('elevore_missions')
      .select('*')
      .eq('tenant_id', tenant_id);

    if (error) {
      console.error('Supabase error fetching missions:', error);
      return res.status(500).send('Database error fetching missions');
    }

    // iCal (RFC 5545) Header
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Elevore//SaaS Calendar Feed//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Elevore - Misiones',
      'X-WR-TIMEZONE:UTC'
    ];

    const formatDateToICS = (dateStr) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        // Format to YYYYMMDDTHHmmssZ
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      } catch (e) {
        return null;
      }
    };

    const formatDayOnlyToICS = (dateStr) => {
      if (!dateStr) return null;
      const clean = dateStr.replace(/[-:]/g, '');
      if (clean.length >= 8) {
        return clean.substring(0, 8); // YYYYMMDD
      }
      return null;
    };

    for (const job of (missions || [])) {
      // Skip lost leads to keep calendar clean
      if (job.status === 'lost') continue;

      const dateStr = job.scheduled_date;
      if (!dateStr) continue;

      const start = formatDateToICS(dateStr) || formatDayOnlyToICS(dateStr);
      if (!start) continue;

      // Assume 2 hours duration by default
      let end = '';
      try {
        const d = new Date(dateStr);
        d.setHours(d.getHours() + 2);
        end = formatDateToICS(d) || start;
      } catch (e) {
        end = start;
      }

      const uid = `job-${job.id}@elevore-saas.vercel.app`;
      const dtstamp = formatDateToICS(job.created_at) || formatDateToICS(new Date()) || '';
      
      const summary = `[${job.status.toUpperCase()}] ${job.client_name} - ${job.service_type || 'Servicio'}`;
      const description = `Servicio: ${job.service_type || 'N/A'}\\nCliente: ${job.client_name}\\nTeléfono: ${job.client_phone || 'N/A'}\\nDirección: ${job.address || 'N/A'}\\nEstado: ${job.status}\\nPrecio: $${job.total_price || 0} USD\\nEquipo: ${job.team_assigned || 'Por asignar'}`;
      const location = job.address || '';

      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${uid}`);
      if (dtstamp) ics.push(`DTSTAMP:${dtstamp}`);
      
      // If it contains a specific time
      if (dateStr.includes('T') || dateStr.includes(':')) {
        ics.push(`DTSTART:${start}`);
        ics.push(`DTEND:${end}`);
      } else {
        // Full day event
        ics.push(`DTSTART;VALUE=DATE:${start}`);
        try {
          const d = new Date(dateStr + 'T00:00:00');
          d.setDate(d.getDate() + 1);
          const endDay = d.toISOString().replace(/-/g, '').substring(0, 8);
          ics.push(`DTEND;VALUE=DATE:${endDay}`);
        } catch (e) {
          ics.push(`DTEND;VALUE=DATE:${start}`);
        }
      }

      ics.push(`SUMMARY:${summary}`);
      ics.push(`DESCRIPTION:${description}`);
      if (location) ics.push(`LOCATION:${location}`);
      ics.push('END:VEVENT');
    }

    ics.push('END:VCALENDAR');

    const calendarData = ics.join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="elevore_calendar.ics"');
    
    return res.status(200).send(calendarData);
  } catch (error) {
    console.error('Error generating calendar feed serverless:', error);
    return res.status(500).send('Internal Server Error');
  }
}
