import { inngest } from "../src/inngest/client.js";

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
    const { event, data = {} } = req.body || {};

    if (!event) {
      return res.status(400).json({ error: 'Missing event name' });
    }

    console.log(`Sending Inngest event: ${event}`);

    const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    const hasEventKey = !!process.env.INNGEST_EVENT_KEY;

    if (isProd && !hasEventKey) {
      console.warn(`⚠️ [Inngest Warning] INNGEST_EVENT_KEY is not configured in Vercel. Event '${event}' was logged to console, but not sent to Inngest cloud:`, data);
      return res.status(200).json({
        status: 'warning',
        message: 'INNGEST_EVENT_KEY is missing. Event logged successfully.',
      });
    }

    const result = await inngest.send({ name: event, data });

    return res.status(200).json({
      status: 'ok',
      ids: result?.ids || [],
    });
  } catch (error) {
    console.error('Error dispatching Inngest event:', error);
    // Return 200 with status: 'error' to avoid breaking frontend operations
    return res.status(200).json({
      status: 'error',
      message: error.message
    });
  }
}
