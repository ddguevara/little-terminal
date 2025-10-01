const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const fetch = global.fetch
  ? global.fetch.bind(global)
  : (...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

async function forwardToGeminiBridge(message, sessionId) {
  const payload = { message: String(message ?? '') };
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  const response = await fetch(`${PYTHON_SERVICE_URL}/llm/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM bridge error ${response.status}: ${errorText}`);
  }

  return response.json();
}

app.post('/chat', async (req, res) => {
  try {
    const { message = '', sessionId } = req.body || {};
    const chatResponse = await forwardToGeminiBridge(message, sessionId);
    res.json(chatResponse);
  } catch (error) {
    console.error('Gemini bridge request failed:', error);
    res.status(502).json({
      sessionId: (req.body && req.body.sessionId) || null,
      lines: ['Temporary outage contacting the Gemini bridge.'],
      secretRevealed: false
    });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Little Terminal listening on http://localhost:${PORT}`);
});
