import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema.js';
import { eq, and, or, gte, lte, sql } from 'drizzle-orm';
import { sendEmail } from '../src/lib/email.js';

const connectionString = process.env.DATABASE_URL;
const client = connectionString ? postgres(connectionString, { prepare: false }) : null;
const db = client ? drizzle(client, { schema }) : null;

// Helper to determine payout percentage
function getPayoutPct(worker, settings) {
  if (worker && worker.payoutBalance !== undefined && worker.payout_pct !== undefined) {
    return Number(worker.payout_pct) / 100;
  }
  if (worker && worker.payoutPct !== undefined && worker.payoutPct !== null) {
    return Number(worker.payoutPct) / 100;
  }
  if (settings && settings.staffPayPct !== undefined && settings.staffPayPct !== null) {
    return Number(settings.staffPayPct);
  }
  return 0.40;
}

export default async function handler(req, res) {
  // Authorize Vercel Cron Request (Allow local testing bypass)
  const authHeader = req.headers['authorization'];
  const host = req.headers.host || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  if (process.env.VERCEL_ENV === 'production' && !isLocal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  const action = req.query.action || req.query.task || '';

  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter (e.g. ?action=quote-chase)' });
  }

  try {
    if (action === 'quote-chase') {
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

        // Fetch tenant details to get businessName and slug
        const tenantList = await db.select().from(schema.tenants).where(eq(schema.tenants.id, job.tenantId)).limit(1);
        const tenant = tenantList[0] || {};
        const slug = tenant.slug || "";

        // Fetch settings for custom resend keys
        const settings = (await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, job.tenantId)).limit(1))[0] || {};
        const bizName = settings.businessFullName || tenant.businessName || "Elevore Premium Services";
        
        const apiKeyOverride = settings.customResendKey || null;
        const fromName = bizName;

        // Construct dynamic slug links for quote approval
        const linkUrl = slug 
          ? `https://elevore-saas.vercel.app/?t=${slug}&jid=${job.id}`
          : `https://elevore-saas.vercel.app/?jid=${job.id}`;

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
                  <a href="${linkUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fbbf24; font-weight: bold; text-decoration: none; border-radius: 8px; border: 1px solid #fbbf24;">Lock in My Booking</a>
                </div>
                <p>Feel free to reply if you need any adjustments to the scope or pricing.</p>
                <p>Best,<br/>The team at ${bizName}</p>
              </div>
            `,
            apiKeyOverride,
            fromName
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
                  <a href="${linkUrl}" style="display: inline-block; padding: 12px 24px; background-color: #fbbf24; color: black; font-weight: bold; text-decoration: none; border-radius: 8px;">View & Approve Quote</a>
                </div>
                <p>Have a great day!</p>
                <p>Best regards,<br/>The team at ${bizName}</p>
              </div>
            `,
            apiKeyOverride,
            fromName
          });
        }
        sentCount++;
      }

      return res.status(200).json({ status: 'ok', sent: sentCount });

    } else if (action === 'win-back') {
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
          // Fetch tenant details to get businessName and slug
          const tenantList = await db.select().from(schema.tenants).where(eq(schema.tenants.id, job.tenantId)).limit(1);
          const tenant = tenantList[0] || {};
          const slug = tenant.slug || "";

          // Fetch settings for custom keys
          const settings = (await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, job.tenantId)).limit(1))[0] || {};
          const bizName = settings.businessFullName || tenant.businessName || "Elevore Premium Services";
          
          const apiKeyOverride = settings.customResendKey || null;
          const fromName = bizName;

          // Construct dynamic slug links with auto-applied discount parameter
          const linkUrl = slug 
            ? `https://elevore-saas.vercel.app/?t=${slug}&discount=10`
            : `https://elevore-saas.vercel.app/?discount=10`;

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
                  <a href="${linkUrl}" style="display: inline-block; padding: 12px 28px; background-color: #fbbf24; color: black; font-weight: bold; text-decoration: none; border-radius: 8px;">Book Now</a>
                </div>
                <p style="color: #718096; font-size: 12px;">Offer expires in 14 days.</p>
              </div>
            `,
            apiKeyOverride,
            fromName
          });
          sentCount++;
        }
      }

      return res.status(200).json({ status: 'ok', sent: sentCount });

    } else if (action === 'weekly-payroll') {
      const endOfWeek = new Date();
      const startOfWeek = new Date();
      startOfWeek.setDate(endOfWeek.getDate() - 6);

      const startStr = startOfWeek.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];

      // Get all paid jobs in this week
      const weeklyPaidJobs = await db.select().from(schema.elevoreMissions).where(
        and(
          eq(schema.elevoreMissions.status, 'paid'),
          gte(schema.elevoreMissions.scheduledDate, startStr),
          lte(schema.elevoreMissions.scheduledDate, endStr)
        )
      );

      if (weeklyPaidJobs.length === 0) {
        return res.status(200).json({ status: 'ok', message: 'No paid jobs found this week.' });
      }

      // Group jobs by Tenant ID
      const jobsByTenant = {};
      weeklyPaidJobs.forEach(job => {
        if (!job.tenantId) return;
        if (!jobsByTenant[job.tenantId]) jobsByTenant[job.tenantId] = [];
        jobsByTenant[job.tenantId].push(job);
      });

      const sentEmailsList = [];

      for (const tenantId of Object.keys(jobsByTenant)) {
        const tenantJobs = jobsByTenant[tenantId];

        const tenantList = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId)).limit(1);
        const tenant = tenantList[0];
        if (!tenant) continue;

        const admins = await db.select().from(schema.staffProfiles).where(and(eq(schema.staffProfiles.tenantId, tenantId), eq(schema.staffProfiles.role, 'admin'))).limit(1);
        const adminEmail = admins[0]?.staffEmail || admins[0]?.email || process.env.ADMIN_ALERT_EMAIL;
        if (!adminEmail) continue;

        const settings = (await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, tenantId)).limit(1))[0] || {};
        const bizName = settings.businessFullName || tenant.businessName;

        const apiKeyOverride = settings.customResendKey || null;
        const fromName = bizName;

        const staffList = await db.select().from(schema.staffProfiles).where(eq(schema.staffProfiles.tenantId, tenantId));

        const staffPayroll = {};
        staffList.forEach(s => {
          staffPayroll[s.name] = { name: s.name, passcode: s.passcode, zelle: s.phone || "N/A", basePay: 0, bonusPay: 0, totalPay: 0, jobsCount: 0 };
        });

        tenantJobs.forEach(job => {
          const workerName = job.teamAssigned || 'Unassigned';
          if (workerName === 'Unassigned') return;

          if (!staffPayroll[workerName]) {
            staffPayroll[workerName] = { name: workerName, passcode: 'N/A', zelle: "N/A", basePay: 0, bonusPay: 0, totalPay: 0, jobsCount: 0 };
          }

          const workerProfile = staffList.find(s => s.name === workerName);
          const pct = getPayoutPct(workerProfile, settings);
          const base = Math.round(Number(job.totalPrice || 0) * pct);

          const mins = job.checkInTime && job.checkOutTime ? Math.round((new Date(job.checkOutTime) - new Date(job.checkInTime)) / 60000) : null;
          const bonus = (job.finalSignature && mins && mins <= 180 && Number(job.clientRating || 0) >= 4) ? 5 : 0;

          staffPayroll[workerName].basePay += base;
          staffPayroll[workerName].bonusPay += bonus;
          staffPayroll[workerName].totalPay += (base + bonus);
          staffPayroll[workerName].jobsCount++;
        });

        let rowsHtml = '';
        Object.values(staffPayroll).forEach(p => {
          if (p.jobsCount === 0) return;
          rowsHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold; color: #1a202c;">${p.name}</td>
              <td style="padding: 12px; text-align: center;">${p.jobsCount}</td>
              <td style="padding: 12px; text-align: right; color: #4a5568;">$${p.basePay}</td>
              <td style="padding: 12px; text-align: right; color: #4a5568;">$${p.bonusPay}</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; color: #10b981;">$${p.totalPay}</td>
              <td style="padding: 12px; text-align: center; color: #718096; font-family: monospace;">${p.zelle}</td>
            </tr>
          `;
        });

        await sendEmail({
          to: adminEmail,
          subject: `📊 Weekly Payroll Ledger Report: ${bizName} (${startStr} to ${endStr})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a202c; border-bottom: 2px solid #fbbf24; padding-bottom: 10px;">Weekly Payroll Statement</h2>
              <p style="color: #4a5568; font-size: 15px;">Here is the calculated payroll for the week ending <strong>${endStr}</strong>.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #cbd5e1;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
                    <th style="padding: 12px; text-align: left;">Employee Name</th>
                    <th style="padding: 12px; text-align: center;">Jobs</th>
                    <th style="padding: 12px; text-align: right;">Base Pay</th>
                    <th style="padding: 12px; text-align: right;">Bonus Pay</th>
                    <th style="padding: 12px; text-align: right;">Total Payroll</th>
                    <th style="padding: 12px; text-align: center;">Zelle Account</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #718096;">No payroll transactions to report this week.</td></tr>'}
                </tbody>
              </table>

              <p style="color: #718096; font-size: 12px; margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 10px;">
                Generated automatically by Elevore Cloud SaaS automations. Please cross-reference with Supabase ledger logs before sending payments.
              </p>
            </div>
          `,
          apiKeyOverride,
          fromName
        });

        sentEmailsList.push(adminEmail);
      }

      return res.status(200).json({ status: 'ok', sentTo: sentEmailsList });
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error(`Error in cron-tasks (${action}):`, error);
    return res.status(500).json({ error: error.message });
  }
}
