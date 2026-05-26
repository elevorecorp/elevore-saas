/**
 * Robust Email Helper utility
 * Uses direct fetch calls to Resend API to send HTML emails.
 * Gracefully falls back to console logging when RESEND_API_KEY is not defined.
 */
export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("=========================================");
    console.log("📨 [MOCKED EMAIL SENT] (Missing RESEND_API_KEY)");
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
        from: "Elevore <onboarding@resend.dev>",
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
