const OpenAI = require('openai');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { meeting_notes } = req.body;

  if (!meeting_notes || typeof meeting_notes !== 'string' || meeting_notes.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid field: meeting_notes' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: OPENAI_API_KEY is not set' });
  }

  const openai = new OpenAI({ apiKey });

  try {
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

    let parsed;
    try {
      parsed = JSON.parse(completion.choices[0].message.content);
    } catch {
      return res.status(500).json({ error: 'OpenAI returned an invalid JSON response' });
    }

    return res.status(200).json({
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    });

  } catch (err) {
    if (err.status) {
      return res.status(502).json({ error: `OpenAI API error: ${err.message}` });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};
