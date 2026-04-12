import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = req.headers['x-api-key'] as string || '';
  const authHeader = req.headers['authorization'] as string || '';
  const path = req.query.path as string || '';
  const query = req.query.q as string || '';

  if (!path && !query) {
    return res.status(400).json({ error: 'Missing path or q parameter' });
  }

  // Build URL
  let url: string;
  if (path) {
    // Direct path proxy: /api/companies-house?path=/company/12345678
    const extra = Object.entries(req.query)
      .filter(([k]) => k !== 'path')
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join('&');
    url = `https://api.company-information.service.gov.uk${path}${extra ? '?' + extra : ''}`;
  } else {
    url = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}&items_per_page=20`;
  }

  // Auth: prefer x-api-key, fall back to Authorization header
  let auth: string;
  if (apiKey) {
    auth = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  } else if (authHeader) {
    auth = authHeader;
  } else {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const response = await fetch(url, { headers: { Authorization: auth } });
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(response.status).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
