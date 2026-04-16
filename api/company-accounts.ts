import type { VercelRequest, VercelResponse } from '@vercel/node';

const CH_KEY = process.env.COMPANIES_HOUSE_API_KEY || '6d4778d5-6ac2-4de8-9209-e71bbfb00e8c';
const BASE = 'https://api.company-information.service.gov.uk';

async function chFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(CH_KEY + ':').toString('base64') },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { number } = req.query;
  if (!number || typeof number !== 'string') {
    return res.status(400).json({ error: 'Company number required' });
  }

  const num = number.padStart(8, '0');

  try {
    // Get all filing history (accounts category)
    const filings = await chFetch(`/company/${num}/filing-history?items_per_page=100&category=accounts`);
    
    if (!filings?.items?.length) {
      return res.status(200).json({ accounts: [], message: 'No accounts filings found' });
    }

    // Extract accounts data — last 6 years
    const accountsFilings = filings.items
      .filter((f: any) => f.category === 'accounts')
      .slice(0, 8) // Get up to 8 filings for 6+ years coverage
      .map((f: any) => ({
        date: f.date,
        madeUpTo: f.description_values?.made_up_date || f.date,
        type: f.type,
        description: f.description,
        transactionId: f.transaction_id,
        documentLink: f.links?.document_metadata,
      }));

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ accounts: accountsFilings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
