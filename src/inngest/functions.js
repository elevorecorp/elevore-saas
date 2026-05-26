import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { inngest } from "./client.js";
import * as schema from '../db/schema.js';
import { eq, and, or, sql, gte, lte } from 'drizzle-orm';
import { sendEmail } from '../lib/email.js';

// Setup database connection for serverless environment
const connectionString = process.env.DATABASE_URL;
const client = connectionString ? postgres(connectionString, { prepare: false }) : null;
export const db = client ? drizzle(client, { schema }) : null;

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

// Simple test function
export const helloWorld = inngest.createFunction(
  { id: "hello-world", event: "test/hello.world" },
  async ({ event, step }) => {
    const message = await step.run("log-event", async () => {
      return `Hello ${event.data.name || 'World'}! Event received.`;
    });
    return { message };
  }
);

// Example daily sync cron task
export const dailySyncExample = inngest.createFunction(
  { id: "daily-sync-example", cron: "0 0 * * *" },
  async ({ step }) => {
    const result = await step.run("perform-sync", async () => {
      if (db) {
        try {
          const tenantsList = await db.select().from(schema.tenants).limit(5);
          return {
            status: "success",
            count: tenantsList.length,
            tenants: tenantsList.map(t => t.businessName)
          };
        } catch (err) {
          return { status: "error", error: err.message };
        }
      }
      return { status: "no-database-connection-string" };
    });
    return result;
  }
);

// 1. Google Review Booster Function
export const googleReviewBooster = inngest.createFunction(
  { id: "google-review-booster", event: "elevore/mission.paid" },
  async ({ event, step }) => {
    const { jobId } = event.data;

    // Sleep for 2 hours
    await step.sleep("wait-for-2-hours", "2h");

    const result = await step.run("process-review-flow", async () => {
      if (!db) return { status: "no-database" };

      // 1. Get Job Details
      const jobs = await db.select().from(schema.elevoreMissions).where(eq(schema.elevoreMissions.id, jobId)).limit(1);
      const job = jobs[0];
      if (!job) return { status: "job-not-found" };
      if (job.status !== 'paid') return { status: "job-not-paid-anymore", currentStatus: job.status };

      // 2. Get Settings
      const settingsList = await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, job.tenantId)).limit(1);
      const settings = settingsList[0] || {};
      const businessName = settings.businessFullName || "Elevore Premium Services";
      const reviewLink = settings.googleReviewLink || "https://g.page/r/review";

      // 3. Find Client Email
      const email = job.clientEmail || (job.specs && job.specs.email) || "";
      if (!email) return { status: "no-client-email", job };

      const rating = job.clientRating ? Number(job.clientRating) : 0;

      if (rating === 0) {
        // Send feedback/rating request email
        const ratingUrl = `https://elevore-saas.vercel.app/?jid=${job.id}`;
        await sendEmail({
          to: email,
          subject: `How did we do? Rate your service with ${businessName} ✨`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1a202c; text-align: center;">Thank you for choosing ${businessName}!</h2>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Hi ${job.clientName || 'valued customer'},</p>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">We completed your <strong>${job.serviceType}</strong> service. We'd love to know how we did! Please take 5 seconds to rate your experience:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ratingUrl}&rating=5" style="display: inline-block; padding: 12px 24px; margin: 5px; background-color: #fbbf24; color: black; font-weight: bold; text-decoration: none; border-radius: 8px; font-size: 18px;">⭐⭐⭐⭐⭐ Excellent</a>
                <br/><br/>
                <a href="${ratingUrl}&rating=4" style="display: inline-block; padding: 10px 20px; margin: 5px; background-color: #f3f4f6; color: #4a5568; text-decoration: none; border-radius: 8px;">⭐⭐⭐⭐ Good</a>
                <a href="${ratingUrl}&rating=3" style="display: inline-block; padding: 10px 20px; margin: 5px; background-color: #f3f4f6; color: #4a5568; text-decoration: none; border-radius: 8px;">⭐⭐⭐ Okay</a>
                <a href="${ratingUrl}&rating=1" style="display: inline-block; padding: 10px 20px; margin: 5px; background-color: #f3f4f6; color: #4a5568; text-decoration: none; border-radius: 8px;">⭐ Disappointed</a>
              </div>
              <p style="color: #718096; font-size: 12px; text-align: center;">Clicking any button will take you to your client portal to submit comments.</p>
            </div>
          `
        });
        return { status: "feedback-request-sent" };
      } else if (rating === 5) {
        // Send Google Review request
        await sendEmail({
          to: email,
          subject: `Could you do us a quick favor? 🏠`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1a202c; text-align: center;">You made our day! ⭐⭐⭐⭐⭐</h2>
              <p style="color: #4a5568; font-size: 16px;">Hi ${job.clientName},</p>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Thank you so much for your 5-star rating of our service! As a local business, online reviews mean the world to us and help others find us.</p>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Could you take 1 minute to share your experience on Google?</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewLink}" target="_blank" style="display: inline-block; padding: 15px 30px; background-color: #3b82f6; color: white; font-weight: bold; text-decoration: none; border-radius: 8px; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">Write a Google Review</a>
              </div>
              <p style="color: #4a5568; font-size: 16px;">We appreciate your support so much!</p>
              <p style="color: #718096; font-size: 14px;">— The team at ${businessName}</p>
            </div>
          `
        });
        return { status: "google-review-invite-sent" };
      } else if (rating <= 3) {
        // Alert admin staff about low rating
        const admins = await db.select().from(schema.staffProfiles).where(and(eq(schema.staffProfiles.tenantId, job.tenantId), eq(schema.staffProfiles.role, 'admin'))).limit(1);
        const adminEmail = admins[0]?.staffEmail || admins[0]?.email || process.env.ADMIN_ALERT_EMAIL;
        
        if (adminEmail) {
          await sendEmail({
            to: adminEmail,
            subject: `⚠️ ACTION REQUIRED: Low Customer Rating (${rating}/5) ⚠️`,
            html: `
              <h3>Attention Admin,</h3>
              <p>A client has left a low rating for service ID: <strong>${job.id}</strong></p>
              <ul>
                <li><strong>Client:</strong> ${job.clientName}</li>
                <li><strong>Phone:</strong> ${job.clientPhone}</li>
                <li><strong>Rating:</strong> ${rating}/5 Stars</li>
                <li><strong>Service:</strong> ${job.serviceType}</li>
                <li><strong>Team Assigned:</strong> ${job.teamAssigned || "Unassigned"}</li>
              </ul>
              <p>Please contact the client to resolve any issues and protect our service quality reputation.</p>
            `
          });
          return { status: "admin-alert-sent", adminEmail };
        }
        return { status: "no-admin-configured-for-alert" };
      }

      return { status: "no-action-needed", rating };
    });
    return result;
  }
);

// 2. Quote Chase / Follow-up Function
export const quoteChase = inngest.createFunction(
  { id: "quote-chase", event: "elevore/quote.created" },
  async ({ event, step }) => {
    const { jobId } = event.data;

    // 1st Wait: 24 Hours
    await step.sleep("wait-24h", "24h");

    const step1Result = await step.run("send-first-followup", async () => {
      if (!db) return { status: "no-database" };
      const jobs = await db.select().from(schema.elevoreMissions).where(eq(schema.elevoreMissions.id, jobId)).limit(1);
      const job = jobs[0];
      if (!job) return { status: "job-not-found" };
      
      // Only proceed if still a lead/estimate
      if (job.status !== 'lead' && job.status !== 'estimate') {
        return { status: "quote-already-converted", currentStatus: job.status };
      }

      const settings = (await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, job.tenantId)).limit(1))[0] || {};
      const bizName = settings.businessFullName || "Elevore Premium Services";
      const email = job.clientEmail || (job.specs && job.specs.email) || "";
      if (!email) return { status: "no-email" };

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
      return { status: "first-followup-sent" };
    });

    // 2nd Wait: Another 48 Hours (Total 72h / 3 days)
    await step.sleep("wait-48h", "48h");

    const step2Result = await step.run("send-second-followup", async () => {
      if (!db) return { status: "no-database" };
      const jobs = await db.select().from(schema.elevoreMissions).where(eq(schema.elevoreMissions.id, jobId)).limit(1);
      const job = jobs[0];
      if (!job) return { status: "job-not-found" };
      
      // Check again
      if (job.status !== 'lead' && job.status !== 'estimate') {
        return { status: "quote-already-converted", currentStatus: job.status };
      }

      const settings = (await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, job.tenantId)).limit(1))[0] || {};
      const bizName = settings.businessFullName || "Elevore Premium Services";
      const email = job.clientEmail || (job.specs && job.specs.email) || "";
      if (!email) return { status: "no-email" };

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
      return { status: "second-followup-sent" };
    });

    return { step1: step1Result, step2: step2Result };
  }
);

// 3. Win-Back Campaign Function (Daily Cron)
export const winBackCampaign = inngest.createFunction(
  { id: "win-back-campaign", cron: "0 9 * * *" }, // Daily at 9:00 AM
  async ({ step }) => {
    const result = await step.run("process-win-back", async () => {
      if (!db) return { status: "no-database" };

      // Calculate date thresholds
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

      let emailsSentCount = 0;
      const details = [];

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
          // Send Win-Back Offer
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
          emailsSentCount++;
          details.push({ client: job.clientName, email });
        }
      }

      return { status: "processed", count: emailsSentCount, details };
    });
    return result;
  }
);

// 4. On-My-Way Alert Function
export const onMyWayAlert = inngest.createFunction(
  { id: "on-my-way-alert", event: "elevore/mission.in_progress" },
  async ({ event, step }) => {
    const { jobId } = event.data;

    const result = await step.run("send-on-my-way-email", async () => {
      if (!db) return { status: "no-database" };
      const jobs = await db.select().from(schema.elevoreMissions).where(eq(schema.elevoreMissions.id, jobId)).limit(1);
      const job = jobs[0];
      if (!job) return { status: "job-not-found" };

      const settings = (await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, job.tenantId)).limit(1))[0] || {};
      const bizName = settings.businessFullName || "Elevore Premium Services";
      const email = job.clientEmail || (job.specs && job.specs.email) || "";
      if (!email) return { status: "no-email" };

      await sendEmail({
        to: email,
        subject: `🚀 On our way! Your ${bizName} team is heading over`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-top: 4px solid #10b981;">
            <h2>Hi ${job.clientName},</h2>
            <p>Exciting news! Our service team is currently heading towards your address: <strong>${job.address}</strong>.</p>
            <p>We will be starting your <strong>${job.serviceType}</strong> service shortly. You can expect us to arrive in approximately 20-30 minutes.</p>
            <p>If you need to share any entry codes, parking details, or last-minute instructions, please let us know by replying to this message or calling us.</p>
            <p>Thank you for choosing ${bizName}!</p>
          </div>
        `
      });
      return { status: "on-my-way-alert-sent", client: job.clientName };
    });
    return result;
  }
);

// 5. Weekly Payroll Report Function (Weekly Cron on Sunday Night)
export const weeklyPayrollReport = inngest.createFunction(
  { id: "weekly-payroll-report", cron: "0 20 * * 0" }, // Sundays at 8:00 PM
  async ({ step }) => {
    const result = await step.run("generate-payroll-reports", async () => {
      if (!db) return { status: "no-database" };

      // Calculate date range (current week: Monday to Sunday)
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

      if (weeklyPaidJobs.length === 0) return { status: "no-paid-jobs-this-week" };

      // Group jobs by Tenant ID
      const jobsByTenant = {};
      weeklyPaidJobs.forEach(job => {
        if (!job.tenantId) return;
        if (!jobsByTenant[job.tenantId]) jobsByTenant[job.tenantId] = [];
        jobsByTenant[job.tenantId].push(job);
      });

      const processedTenants = [];

      for (const tenantId of Object.keys(jobsByTenant)) {
        const tenantJobs = jobsByTenant[tenantId];

        // 1. Get Tenant details and Admin/Owner Email
        const tenantList = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId)).limit(1);
        const tenant = tenantList[0];
        if (!tenant) continue;

        const admins = await db.select().from(schema.staffProfiles).where(and(eq(schema.staffProfiles.tenantId, tenantId), eq(schema.staffProfiles.role, 'admin'))).limit(1);
        const adminEmail = admins[0]?.staffEmail || admins[0]?.email || process.env.ADMIN_ALERT_EMAIL;
        if (!adminEmail) continue;

        const settings = (await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, tenantId)).limit(1))[0] || {};
        const bizName = settings.businessFullName || tenant.businessName;

        // 2. Get Staff profiles
        const staffList = await db.select().from(schema.staffProfiles).where(eq(schema.staffProfiles.tenantId, tenantId));

        // 3. Process calculations per employee
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

          // Calculate bonus
          const mins = job.checkInTime && job.checkOutTime ? Math.round((new Date(job.checkOutTime) - new Date(job.checkInTime)) / 60000) : null;
          const bonus = (job.finalSignature && mins && mins <= 180 && Number(job.clientRating || 0) >= 4) ? 5 : 0;

          staffPayroll[workerName].basePay += base;
          staffPayroll[workerName].bonusPay += bonus;
          staffPayroll[workerName].totalPay += (base + bonus);
          staffPayroll[workerName].jobsCount++;
        });

        // 4. Generate HTML payroll table rows
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

        // 5. Send Payroll Report Email
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

        processedTenants.push({ businessName: bizName, admin: adminEmail });
      }

      return { status: "weekly-reports-processed", tenants: processedTenants };
    });
    return result;
  }
);
