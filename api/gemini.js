export default async function handler(request, response) {
  const allowedOrigin = '*';

  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { question } = request.body || {};

  if (!question || !String(question).trim()) {
    response.status(400).json({ error: 'Question is required.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    response.status(500).json({ error: 'Gemini API key is not configured.' });
    return;
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: 'You are Sifwaku AI, a practical learning assistant for data analysis, evidence-based thinking, research, digital protection, and programming. Give accurate, concise answers. When writing code, return complete runnable code in fenced Markdown code blocks with the correct language tag, preserve indentation, use descriptive names, include required imports, and explain how to run it. Never invent APIs or claim code was tested when it was not. Ask one clarifying question when requirements are ambiguous.'
              }
            ]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: String(question).trim() }]
            }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini upstream error:', errorText);
      response.status(502).json({ error: 'Gemini upstream request failed.' });
      return;
    }

    const data = await geminiResponse.json();
    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .join('')
      ?.trim();

    if (!reply) {
      response.status(502).json({ error: 'Gemini returned no usable reply.' });
      return;
    }

    response.status(200).json({ reply });
  } catch (error) {
    console.error('Gemini handler error:', error);
    response.status(500).json({ error: 'Unable to complete the Gemini request.' });
  }
}
