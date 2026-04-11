// Vercel serverless: proxy to Companies House API
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { apiKey, action, query, companyNumber } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key required' });

  const base = 'https://api.company-information.service.gov.uk';
  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  const headers: Record<string, string> = { Authorization: `Basic ${auth}`, Accept: 'application/json' };

  try {
    let url = '';
    if (action === 'search') {
      url = `${base}/search/companies?q=${encodeURIComponent(query)}&items_per_page=20`;
    } else if (action === 'profile') {
      url = `${base}/company/${companyNumber}`;
    } else if (action === 'officers') {
      url = `${base}/company/${companyNumber}/officers`;
    } else if (action === 'filing') {
      url = `${base}/company/${companyNumber}/filing-history?items_per_page=5`;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: text });
    }
    const data = await resp.json();
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
