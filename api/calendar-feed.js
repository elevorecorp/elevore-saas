import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';

const connectionString = process.env.DATABASE_URL;

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

    if (!connectionString) {
      return res.status(500).send('Error: DATABASE_URL is not configured on the server environment');
    }

    // Initialize Drizzle client
    const client = postgres(connectionString, { prepare: false });
    const db = drizzle(client, { schema });

    // Fetch missions using Drizzle ORM
    const missions = await db
      .select()
      .from(schema.elevoreMissions)
      .where(eq(schema.elevoreMissions.tenantId, tenant_id));

    // Close postgres client to free connection
    await client.end();

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

      const dateStr = job.scheduledDate;
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
      const dtstamp = formatDateToICS(job.createdAt) || formatDateToICS(new Date()) || '';
      
      const summary = `[${String(job.status).toUpperCase()}] ${job.clientName} - ${job.serviceType || 'Servicio'}`;
      const description = `Servicio: ${job.serviceType || 'N/A'}\\nCliente: ${job.clientName}\\nEstado: ${job.status}\\nPrecio: $${job.totalPrice || 0} USD`;

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
