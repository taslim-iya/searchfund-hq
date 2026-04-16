import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { name, number, sicCodes, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Company name required' });

  if (!OPENAI_KEY) {
    return res.status(200).json({
      summary: 'AI enrichment unavailable — no API key configured.',
      enriched: false,
    });
  }

  try {
    const prompt = `You are a business research analyst. Given this UK company, provide a brief research summary.

Company: ${name}
Company Number: ${number || 'N/A'}
SIC Codes: ${(sicCodes || []).join(', ')}
Address: ${address || 'N/A'}

Provide:
1. What the company does (2-3 sentences)
2. Estimated staff size if known
3. Key products/services
4. Any notable news, awards, or public information
5. Industry position and competitors
6. Acquisition attractiveness (for a search fund buyer)

Be factual. If unsure, say so. Keep it concise.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'No summary available.';

    res.setHeader('Cache-Control', 'public, s-maxage=86400');
    return res.status(200).json({ summary, enriched: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, enriched: false });
  }
}
