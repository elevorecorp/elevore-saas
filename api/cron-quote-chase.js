import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema.js';
import { eq, and, or, sql } from 'drizzle-orm';
import { sendEmail } from '../src/lib/email.js';

const connectionString = process.env.DATABASE_URL;
const client = connectionString ? postgres(connectionString, { prepare: false }) : null;
const db = client ? drizzle(client, { schema }) : null;

export default async function handler(req, res) {
  // Authorize Vercel Cron Request
  const authHeader = req.headers['authorization'];
  if (process.env.VERCEL_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    // 1. Calculate date ranges
    const target1 = new Date();
    target1.setDate(target1.getDate() - 1);
    const dateStr1 = target1.toISOString().split('T')[0];

    const target3 = new Date();
    target3.setDate(target3.getDate() - 3);
    const dateStr3 = target3.toISOString().split('T')[0];

    // Query pending jobs created around target1 or target3
    const jobs = await db.select().from(schema.elevoreMissions).where(
      and(
        or(
          sql`DATE(${schema.elevoreMissions.createdAt}) = ${dateStr1}`,
          sql`DATE(${schema.elevoreMissions.createdAt}) = ${dateStr3}`
        ),
        or(
          eq(schema.elevoreMissions.status, 'lead'),
          eq(schema.elevoreMissions.status, 'estimate')
        )
      )
    );

    let sentCount = 0;

    for (const job of jobs) {
      const email = job.clientEmail || (job.specs && job.specs.email) || "";
      if (!email) continue;

      const settings = (await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, job.tenantId)).limit(1))[0] || {};
      const bizName = settings.businessFullName || "Elevore Premium Services";

      // Check creation date to see if it's Chase 1 or Chase 2
      const createdStr = new Date(job.createdAt).toISOString().split('T')[0];
      const isChase2 = createdStr === dateStr3;

      if (isChase2) {
        // Send Chase 2 (Urgent)
        await sendEmail({
          to: email,
          subject: `Spots are filling fast! Secure your booking with ${bizName} ⏰`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-left: 4px solid #fbbf24;">
              <h2>Hi ${job.clientName},</h2>
              <p>We wanted to give you a quick heads up. Our schedule is filling up quickly for the upcoming days.</p>
              <p>To ensure we can save your preferred timeslot for your <strong>${job.serviceType}</strong>, please review and approve your quote now:</p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="https://elevore-saas.vercel.app/?jid=${job.id}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fbbf24; font-weight: bold; text-decoration: none; border-radius: 8px; border: 1px solid #fbbf24;">Lock in My Booking</a>
              </div>
              <p>Feel free to reply if you need any adjustments to the scope or pricing.</p>
              <p>Best,<br/>The team at ${bizName}</p>
            </div>
          `
        });
      } else {
        // Send Chase 1
        await sendEmail({
          to: email,
          subject: `Your custom quote from ${bizName} is ready! 📋`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Hi ${job.clientName},</h2>
              <p>Just checking in! We sent over a custom quote for your <strong>${job.serviceType}</strong> service.</p>
              <p>We are ready to schedule our team to help you. If you have any questions or would like to approve the quote, click below:</p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="https://elevore-saas.vercel.app/?jid=${job.id}" style="display: inline-block; padding: 12px 24px; background-color: #fbbf24; color: black; font-weight: bold; text-decoration: none; border-radius: 8px;">View & Approve Quote</a>
              </div>
              <p>Have a great day!</p>
              <p>Best regards,<br/>The team at ${bizName}</p>
            </div>
          `
        });
      }
      sentCount++;
    }

    return res.status(200).json({ status: 'ok', sent: sentCount });
  } catch (error) {
    console.error('Error in cron quote chase:', error);
    return res.status(500).json({ error: error.message });
  }
}
