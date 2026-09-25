const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function loadEnvFile() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

async function handleGeminiRequest(req, res, body) {
  let parsed;
  try {
    parsed = JSON.parse(body || '{}');
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body.' });
  }

  const question = parsed.question;
  if (!question || !String(question).trim()) {
    return sendJson(res, 400, { error: 'Question is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, { error: 'Gemini API key is not configured.' });
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
            { role: 'user', parts: [{ text: String(question).trim() }] }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini upstream error:', errorText);
      return sendJson(res, 502, { error: 'Gemini upstream request failed.' });
    }

    const data = await geminiResponse.json();
    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .join('')
      ?.trim();

    if (!reply) {
      return sendJson(res, 502, { error: 'Gemini returned no usable reply.' });
    }

    return sendJson(res, 200, { reply });
  } catch (error) {
    console.error('Gemini handler error:', error);
    return sendJson(res, 500, { error: 'Unable to complete the Gemini request.' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.url === '/api/gemini' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      await handleGeminiRequest(req, res, body);
    });
    return;
  }

  let requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(path.join(root, requestedPath));

  if (!safePath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(port, () => {
  console.log(`Local app running at http://localhost:${port}`);
  console.log('API endpoint live at http://localhost:' + port + '/api/gemini');
});
