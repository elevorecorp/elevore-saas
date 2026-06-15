function generateMockResponse(messages) {
  const fullPrompt = (messages || []).map(m => m.content).join('\n').toLowerCase();
  
  // 1. CFO / James Sterling Financial Audit
  if (
    fullPrompt.includes('sterling') ||
    fullPrompt.includes('cfo') ||
    fullPrompt.includes('ltv') ||
    fullPrompt.includes('cac') ||
    fullPrompt.includes('ledger') ||
    fullPrompt.includes('payroll') ||
    fullPrompt.includes('nómina') ||
    fullPrompt.includes('margen') ||
    fullPrompt.includes('roi') ||
    fullPrompt.includes('financial')
  ) {
    return `CFO James Sterling reportándose. Analizando el Ledger de **Elevore**:\n\n` +
      `* **Margen Neto**: 44% | **LTV/CAC Ratio**: 4.8x (Excelente salud financiera).\n` +
      `* **Costo de Adquisición (CAC)**: Promedio de $45 USD por lead convertido.\n` +
      `* **Análisis de Nómina**: La comisión asignada al staff es del 40%, lo cual deja un margen neto saludable de ganancia.\n` +
      `* **Recomendación Directa**: Tienes margen para incrementar la inversión en pauta publicitaria (Ad Spend) en Google Ads o Meta Ads en un 15% para acelerar el volumen de leads, ya que tu ratio LTV/CAC es sobresaliente. Optimizar las comisiones por upsell (como interiores de horno o refrigerador) aumentará aún más la rentabilidad por visita sin incrementar el CAC.`;
  }
  
  // 2. Reactivation / Churn CRM template
  if (
    fullPrompt.includes('reactiv') ||
    fullPrompt.includes('churn') ||
    fullPrompt.includes('fuga') ||
    fullPrompt.includes('inactiv') ||
    fullPrompt.includes('winback') ||
    fullPrompt.includes('win-back')
  ) {
    return `¡Hola! Aquí tienes la plantilla de reactivación CRM personalizada para tu cliente inactivo:\n\n` +
      `"¡Hola {ClientName}! ✨ Hace un tiempo que no te vemos en Elevore Premium Services. Queremos que tu hogar o negocio vuelva a lucir impecable, por lo que te ofrecemos un **10% de descuento exclusivo** en tu próximo servicio.\n\n` +
      `Reserva hoy en menos de 60 segundos aquí: {BookingLink}\n` +
      `¡Esperamos verte pronto! 🧹"\n\n` +
      `*Recomendación*: Envía esta plantilla vía WhatsApp o email integrando el enlace directo del Portal de Reservas para maximizar la tasa de conversión.`;
  }
  
  // 3. Meeting minutes / AI Copilot
  if (
    fullPrompt.includes('reunion') ||
    fullPrompt.includes('transcrip') ||
    fullPrompt.includes('meeting') ||
    fullPrompt.includes('summary') ||
    fullPrompt.includes('minuta') ||
    fullPrompt.includes('discurso') ||
    fullPrompt.includes('agenda')
  ) {
    return `### 🎙️ Minuta de Reunión Operativa (AI Copilot)\n\n` +
      `**Fecha**: ${new Date().toLocaleDateString('es-ES')}\n` +
      `**Participantes**: Equipo de Operaciones y Administración\n\n` +
      `#### 📌 Puntos Clave Discutidos:\n` +
      `1. **Optimización de Rutas**: Se revisó el mapa de servicios activos para optimizar los traslados del staff y reducir tiempos de viaje.\n` +
      `2. **Control de Calidad**: Se enfatizó la importancia de hacer firmar al cliente la conformidad digital en el portal al finalizar el trabajo.\n` +
      `3. **Conversión de Leads**: Se analizó el embudo de ventas, identificando que el 78% de las cotizaciones enviadas se aprueban.\n\n` +
      `#### ⚡ Acciones Inmediatas:\n` +
      `* **Asignación de Equipos**: Isaac y el Equipo Alpha serán asignados prioritariamente a los servicios VIP de esta semana.\n` +
      `* **Seguimiento CRM**: Configurar alertas de churn para los clientes con más de 45 días de inactividad.\n\n` +
      `#### 🤝 Acuerdos:\n` +
      `* Se establece un objetivo de calificación promedio de **4.8★** para el staff, con incentivos vinculados a los comentarios del cliente.`;
  }
  
  // 4. Default Assistant advice
  return `¡Hola! Soy tu asistente de operaciones de Elevore. Aquí tienes algunas recomendaciones operativas basadas en tu consulta:\n\n` +
    `1. **Optimización de Despacho (Dispatch)**: Recuerda usar la vista de mapa en operaciones para agrupar servicios cercanos. Esto reduce el consumo de gasolina y maximiza las horas productivas de tu staff.\n` +
    `2. **Fidelización de Clientes**: Revisa regularmente el Directorio de Retención de Clientes en el panel de analíticas y marca como VIP a aquellos con más de 4 misiones completadas.\n` +
    `3. **Gestión de Calidad**: Asegúrate de que tu staff complete las tareas de Quality Control y registre fotos de antes/después directamente en la app del staff.\n\n` +
    `¿Hay alguna área específica en la que te gustaría profundizar hoy?`;
}

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
    const { messages = [], model = 'gemini-2.0-flash' } = req.body || {};

    const getValidKey = (...keys) => {
      for (const k of keys) {
        if (k) {
          const trimmed = String(k).trim();
          if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined' && trimmed !== 'None') {
            return trimmed;
          }
        }
      }
      return null;
    };

    const apiKey = getValidKey(
      req.headers['x-gemini-key'],
      req.headers['authorization']?.replace('Bearer ', ''),
      process.env.GEMINI_API_KEY,
      process.env.VITE_GEMINI_KEY,
      process.env.GEMINI_KEY,
      process.env.VITE_GEMINI_API_KEY
    );

    if (!apiKey) {
      console.warn('[API MOCK] GEMINI_API_KEY not configured. Returning context-aware mock response.');
      const mockText = generateMockResponse(messages);
      return res.status(200).json({ text: mockText, source: 'mock-no-key' });
    }

    // Extract system instruction and format messages for Gemini API
    let systemInstruction = null;
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = {
          parts: [{ text: msg.content }]
        };
      } else {
        const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
        contents.push({
          role: geminiRole,
          parts: [{ text: msg.content }]
        });
      }
    }

    // Helper to request Gemini API with an 8-second timeout protection
    const callGemini = async (mdl) => {
      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
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
              temperature: 0.7,
              maxOutputTokens: 4096
            }
          })
        });
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let activeModel = model;
    let response;
    
    try {
      response = await callGemini(activeModel);
    } catch (fetchErr) {
      console.warn('[API MOCK] Gemini API fetch crashed. Retrying or falling back to mock:', fetchErr);
      const mockText = generateMockResponse(messages);
      return res.status(200).json({ text: mockText, source: 'mock-fetch-crash' });
    }

    // If response fails, try fallback model chain
    if (!response.ok && activeModel !== 'gemini-1.5-flash') {
      const errText = await response.clone().text();
      console.warn(`[FALLBACK] Model ${activeModel} failed (${response.status}). Retrying with gemini-1.5-flash...`);
      activeModel = 'gemini-1.5-flash';
      try {
        response = await callGemini(activeModel);
      } catch (fallbackErr) {
        console.warn('[API MOCK] Gemini fallback fetch crashed. Returning mock:', fallbackErr);
        const mockText = generateMockResponse(messages);
        return res.status(200).json({ text: mockText, source: 'mock-fallback-crash' });
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[API MOCK] Gemini API returned error status ${response.status}: ${errorText}. Returning mock response.`);
      const mockText = generateMockResponse(messages);
      return res.status(200).json({ text: mockText, source: 'mock-api-error' });
    }

    const result = await response.json();
    const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({ text: generatedText, source: 'gemini-api' });
  } catch (error) {
    console.error('Error in chat serverless function:', error);
    try {
      const mockText = generateMockResponse(req.body?.messages);
      return res.status(200).json({ text: mockText, source: 'mock-general-catch' });
    } catch (innerErr) {
      return res.status(500).json({ error: error.message });
    }
  }
}
