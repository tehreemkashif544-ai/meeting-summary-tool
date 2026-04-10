const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = 3000;

// Debug: confirm .env is loaded and key is present
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('[STARTUP ERROR] OPENAI_API_KEY is not set in .env file');
  process.exit(1);
}
const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
console.log(`[STARTUP] OPENAI_API_KEY loaded: ${maskedKey} (length: ${apiKey.length})`);
console.log(`[STARTUP] .env loaded from: ${path.join(__dirname, '.env')}`);

const openai = new OpenAI({ apiKey });

app.use(cors());
app.use(express.json());

app.post('/summarize', async (req, res) => {
  const { meeting_notes } = req.body;

  // Input validation
  if (!meeting_notes) {
    return res.status(400).json({ error: 'Missing required field: meeting_notes' });
  }
  if (typeof meeting_notes !== 'string' || meeting_notes.trim() === '') {
    return res.status(400).json({ error: 'meeting_notes must be a non-empty string' });
  }

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Received meeting notes (${meeting_notes.trim().length} chars)`);

  try {
    console.log(`[${timestamp}] Sending request to OpenAI...`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that analyzes meeting notes and extracts structured information.
Always respond with valid JSON only — no markdown, no extra text.
Use this exact format:
{
  "action_items": ["item 1", "item 2"],
  "decisions": ["decision 1", "decision 2"]
}
If there are no action items or decisions, return empty arrays.`,
        },
        {
          role: 'user',
          content: `Extract the action items and decisions from these meeting notes:\n\n${meeting_notes.trim()}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const rawResponse = completion.choices[0].message.content;
    console.log(`[${timestamp}] OpenAI raw response:`, rawResponse);

    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch (parseErr) {
      console.error(`[${timestamp}] Failed to parse OpenAI response as JSON:`, rawResponse);
      return res.status(500).json({ error: 'OpenAI returned an invalid JSON response' });
    }

    // Ensure expected fields are present
    const summary = {
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    };

    console.log(`[${timestamp}] Summary generated — ${summary.action_items.length} action item(s), ${summary.decisions.length} decision(s)`);

    return res.status(200).json(summary);

  } catch (err) {
    // OpenAI API errors
    if (err.status) {
      console.error(`[${timestamp}] OpenAI API error [${err.status}]:`, err.message);
      return res.status(502).json({ error: `OpenAI API error: ${err.message}` });
    }

    console.error(`[${timestamp}] Unexpected error:`, err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
