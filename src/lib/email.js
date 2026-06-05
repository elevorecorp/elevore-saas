import nodemailer from 'nodemailer';

/**
 * Robust Email Helper utility
 * Uses direct fetch calls to Resend API or direct Gmail SMTP via nodemailer.
 * Gracefully falls back to console logging when RESEND_API_KEY/Password is not defined.
 */
export async function sendEmail({ to, subject, html, apiKeyOverride, fromName, senderEmailOverride }) {
  const apiKey = apiKeyOverride || process.env.RESEND_API_KEY;
  const senderName = fromName || "Elevore";
  const fromEmail = senderEmailOverride || "onboarding@resend.dev";

  // If using a Gmail address and we have an API key/Password, route through Gmail SMTP
  if (fromEmail.toLowerCase().endsWith('@gmail.com') && apiKey) {
    try {
      console.log(`📨 Sending direct email via Gmail SMTP (from: ${fromEmail})...`);
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: fromEmail,
          pass: apiKey
        }
      });

      const info = await transporter.sendMail({
        from: `${senderName} <${fromEmail}>`,
        to,
        subject,
        html
      });

      console.log(`📨 Email sent successfully via Gmail SMTP. ID: ${info.messageId}`);
      return { id: info.messageId };
    } catch (error) {
      console.error("Error sending email via Gmail SMTP:", error);
      return { id: "error_fallback_id_" + Date.now(), error: error.message };
    }
  }

  // Fallback to Resend API
  if (!apiKey) {
    console.log("=========================================");
    console.log(`📨 [MOCKED EMAIL SENT] (Missing RESEND_API_KEY, sender: ${senderName}, from: ${fromEmail})`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("Content Preview:");
    console.log(html ? html.substring(0, 1000) + (html.length > 1000 ? "..." : "") : "[No Content]");
    console.log("=========================================");
    return { id: "mock_id_" + Math.random().toString(36).substring(2, 11) };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} <${fromEmail}>`,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API Error details:", errorText);
      throw new Error(`Resend API Error: status ${response.status}`);
    }

    const data = await response.json();
    console.log(`📨 Email sent successfully via Resend. ID: ${data.id}`);
    return data;
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    // Return fallback ID to prevent crashing background workers
    return { id: "error_fallback_id_" + Date.now(), error: error.message };
  }
}
