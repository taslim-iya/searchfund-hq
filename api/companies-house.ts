import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, x-api-key, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = (req.headers['x-api-key'] as string) || '';
  const authHeader = (req.headers['authorization'] as string) || '';
  const path = req.query.path as string || '';
  const query = req.query.q as string || '';

  if (!path && !query) {
    return res.status(400).json({ error: 'Missing path or q parameter' });
  }

  // Build URL
  let url: string;
  if (path) {
    const extra = Object.entries(req.query)
      .filter(([k]) => k !== 'path')
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join('&');
    url = `https://api.company-information.service.gov.uk${path}${extra ? '?' + extra : ''}`;
  } else {
    url = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}&items_per_page=20`;
  }

  // Auth: prefer x-api-key header, then Authorization header, then env var fallback
  let key = apiKey;
  if (!key && authHeader) {
    // Extract key from Basic auth header
    try {
      const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
      key = decoded.replace(/:$/, '');
    } catch {}
  }
  if (!key) {
    key = process.env.COMPANIES_HOUSE_KEY || '';
  }
  if (!key) {
    return res.status(401).json({ error: 'No Companies House API key. Set COMPANIES_HOUSE_KEY env var or pass x-api-key header.' });
  }

  const auth = `Basic ${Buffer.from(`${key}:`).toString('base64')}`;

  try {
    const response = await fetch(url, { headers: { Authorization: auth } });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
