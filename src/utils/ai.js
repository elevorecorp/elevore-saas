/**
 * Client-side fallback handler for Google Gemini API.
 * This allows the application to directly communicate with Gemini from the client
 * if the backend serverless endpoint (/api/chat) is not available or fails.
 */

export const callGeminiDirectlyFromClient = async (messages, model = 'gemini-1.5-flash', key) => {
  if (!key) {
    throw new Error("No Gemini API key available.");
  }
  
  const targetModel = model || 'gemini-1.5-flash';
  const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
  
  let systemInstruction = null;
  const contents = [];
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = {
        parts: [{ text: msg.content }]
      };
    } else {
      const geminiRole = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
      contents.push({
        role: geminiRole,
        parts: [{ text: msg.content }]
      });
    }
  }
  
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents,
      ...(systemInstruction && { systemInstruction }),
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ],
      generationConfig: {
        temperature: 0.7
      }
    })
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Client-side Gemini API Error: ${response.status} ${errText}`);
  }
  
  const result = await response.json();
  return result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

export const fetchAIChat = async (messages, model, customKey) => {
  const activeKey = customKey || localStorage.getItem('elevore_gemini_key') || '';
  const activeModel = model || 'gemini-1.5-flash';
  
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (activeKey) {
      headers['x-gemini-key'] = activeKey;
    }
    
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, model: activeModel })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.text !== undefined) {
        return { ok: true, text: data.text, source: 'vercel-api' };
      }
    }
    
    // If relative API call fails but we have a client key, fallback to direct client call
    if (activeKey) {
      console.warn(`[fetchAIChat] Backend /api/chat returned status ${res.status}. Falling back to direct client-side Gemini API.`);
      const text = await callGeminiDirectlyFromClient(messages, activeModel, activeKey);
      return { ok: true, text, source: 'client-direct' };
    }
    
    const errText = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: errText || `HTTP ${res.status}` };
  } catch (err) {
    console.warn("[fetchAIChat] Backend /api/chat fetch threw error:", err);
    if (activeKey) {
      try {
        console.log("[fetchAIChat] Network error occurred. Falling back to direct client-side Gemini API.");
        const text = await callGeminiDirectlyFromClient(messages, activeModel, activeKey);
        return { ok: true, text, source: 'client-direct' };
      } catch (clientErr) {
        return { ok: false, error: clientErr.message };
      }
    }
    return { ok: false, error: err.message };
  }
};
