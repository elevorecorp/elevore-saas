import { sendEmail } from "../src/lib/email.js";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required email fields (to, subject, html)' });
    }

    const result = await sendEmail({ to, subject, html });
    return res.status(200).json({ status: 'ok', id: result.id });
  } catch (error) {
    console.error('Error sending direct email:', error);
    return res.status(500).json({ error: error.message });
  }
}
