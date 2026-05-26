import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';
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
  // Authorize Vercel Cron Request
  const authHeader = req.headers['authorization'];
  if (process.env.VERCEL_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
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
        `
      });

      sentEmailsList.push(adminEmail);
    }

    return res.status(200).json({ status: 'ok', sentTo: sentEmailsList });
  } catch (error) {
    console.error('Error in cron weekly payroll:', error);
    return res.status(500).json({ error: error.message });
  }
}
