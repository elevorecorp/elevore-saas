import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema.js';
import { eq, and, or, gte } from 'drizzle-orm';
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
    const date60 = new Date();
    date60.setDate(date60.getDate() - 60);
    const str60 = date60.toISOString().split('T')[0];

    const date90 = new Date();
    date90.setDate(date90.getDate() - 90);
    const str90 = date90.toISOString().split('T')[0];

    // Query jobs completed or paid exactly 60 or 90 days ago
    const recentJobs = await db.select().from(schema.elevoreMissions).where(
      and(
        or(
          eq(schema.elevoreMissions.scheduledDate, str60),
          eq(schema.elevoreMissions.scheduledDate, str90)
        ),
        or(
          eq(schema.elevoreMissions.status, 'completed'),
          eq(schema.elevoreMissions.status, 'paid')
        )
      )
    );

    let sentCount = 0;

    for (const job of recentJobs) {
      const email = job.clientEmail || (job.specs && job.specs.email) || "";
      if (!email) continue;

      // Check if they have future jobs scheduled
      const todayStr = new Date().toISOString().split('T')[0];
      const futureJobs = await db.select().from(schema.elevoreMissions).where(
        and(
          eq(schema.elevoreMissions.clientName, job.clientName),
          gte(schema.elevoreMissions.scheduledDate, todayStr)
        )
      ).limit(1);

      if (futureJobs.length === 0) {
        const settings = (await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, job.tenantId)).limit(1))[0] || {};
        const bizName = settings.businessFullName || "Elevore Premium Services";

        await sendEmail({
          to: email,
          subject: `We miss you! Save 10% on your next service with ${bizName} 🏠`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; text-align: center; border: 1px dashed #fbbf24; border-radius: 12px;">
              <h2 style="color: #1a202c;">We miss cleaning for you! 🌟</h2>
              <p style="color: #4a5568; font-size: 16px;">Hi ${job.clientName},</p>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">It has been a while since your last service with ${bizName}, and we'd love to help you keep your space clean and shining again.</p>
              <p style="color: #1a202c; font-size: 18px; font-weight: bold; margin: 20px 0;">Get 10% OFF your next booking!</p>
              <p style="color: #4a5568; font-size: 14px;">Use coupon code: <span style="font-family: monospace; font-weight: bold; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">REGRESA10</span></p>
              <div style="margin: 25px 0;">
                <a href="https://elevore-saas.vercel.app/" style="display: inline-block; padding: 12px 28px; background-color: #fbbf24; color: black; font-weight: bold; text-decoration: none; border-radius: 8px;">Book Now</a>
              </div>
              <p style="color: #718096; font-size: 12px;">Offer expires in 14 days.</p>
            </div>
          `
        });
        sentCount++;
      }
    }

    return res.status(200).json({ status: 'ok', sent: sentCount });
  } catch (error) {
    console.error('Error in cron win back:', error);
    return res.status(500).json({ error: error.message });
  }
}
