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
    const { text = '', model = 'text-embedding-004' } = req.body || {};
    const apiKey = req.headers['x-gemini-key'] || req.headers['authorization']?.replace('Bearer ', '') || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server environment. Please configure it in Vercel or enter it in your App settings.' });
    }

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Text field is required for generating embeddings.' });
    }

    // Call Google Gemini Embed Content API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: `models/${model}`,
        content: {
          parts: [{ text }]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Embed API returned error status:', response.status, errorText);
      return res.status(response.status).json({ error: `Gemini Embed API Error: ${errorText}` });
    }

    const result = await response.json();
    const embedding = result?.embedding?.values || [];

    return res.status(200).json({ embedding });
  } catch (error) {
    console.error('Error in embed serverless function:', error);
    return res.status(500).json({ error: error.message });
  }
}
