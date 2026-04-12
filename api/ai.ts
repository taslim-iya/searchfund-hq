export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { apiKey, model = 'gpt-4o-mini', systemPrompt, messages } = req.body;
  const resolvedKey = apiKey || process.env.OPENAI_API_KEY || '';
  if (!resolvedKey) return res.status(400).json({ error: 'API key required' });

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resolvedKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt || 'You are a helpful assistant.' }, ...messages],
        temperature: 0.3,
      }),
    });
    const data = await resp.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    return res.status(200).json({ content: data.choices?.[0]?.message?.content || '' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
