const postgres = require('postgres');
const nodemailer = require('nodemailer');

const sql = postgres('postgres://postgres:lXBr7lsOvmWpGGQW@db.ceijlgurveaalvjmptns.supabase.co:6543/postgres');

async function main() {
  try {
    console.log("=== FETCHING YOUR TENANT CREDENTIALS ===");
    const [settings] = await sql`
      SELECT custom_resend_key, sender_email, business_full_name 
      FROM tenant_settings 
      WHERE tenant_id = '4ec723ab-4612-4c23-a550-f220939ff1c4';
    `;

    if (!settings) {
      console.error("No settings found for your account.");
      return;
    }

    const apiKey = settings.custom_resend_key;
    const senderEmail = settings.sender_email;
    const senderName = settings.business_full_name || "Elevore";

    console.log(`Key/Password Found: ${apiKey ? apiKey.substring(0, 4) + "..." : "NONE"}`);
    console.log(`Sender Email: ${senderEmail}`);

    if (!apiKey || !senderEmail) {
      console.error("Missing Gmail credentials (email or app password).");
      return;
    }

    console.log("=== SENDING TEST EMAIL VIA GMAIL SMTP ===");
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: senderEmail,
        pass: apiKey
      }
    });

    const info = await transporter.sendMail({
      from: `${senderName} <${senderEmail}>`,
      to: "josemarioal14@gmail.com",
      subject: "Test Email from Elevore SaaS Gmail SMTP",
      html: "<p>This is a verification email testing your Gmail SMTP setup.</p>"
    });

    console.log("📨 Email sent successfully via Gmail SMTP!");
    console.log("Message ID:", info.messageId);

  } catch (err) {
    console.error("Exception during verification:", err);
  } finally {
    await sql.end();
  }
}

main();
