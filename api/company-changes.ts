import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Check for recent changes to a company via Companies House streaming API.
 * Returns filing history + officer changes since a given date.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const companyNumber = req.query.company as string;
  const apiKey = req.headers['x-api-key'] as string || '';
  const since = req.query.since as string || '';
  
  if (!companyNumber || !apiKey) {
    return res.status(400).json({ error: 'Missing company number or API key' });
  }

  const auth = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  const BASE = 'https://api.company-information.service.gov.uk';

  try {
    // Fetch filing history and company profile in parallel
    const [filingRes, profileRes, officerRes] = await Promise.all([
      fetch(`${BASE}/company/${companyNumber}/filing-history?items_per_page=10`, { headers: { Authorization: auth } }),
      fetch(`${BASE}/company/${companyNumber}`, { headers: { Authorization: auth } }),
      fetch(`${BASE}/company/${companyNumber}/officers?items_per_page=10`, { headers: { Authorization: auth } }),
    ]);

    const [filings, profile, officers] = await Promise.all([
      filingRes.json(),
      profileRes.json(),
      officerRes.json(),
    ]);

    // Filter filings since date
    const recentFilings = (filings.items || []).filter((f: any) => {
      if (!since) return true;
      return f.date >= since;
    });

    // Check for officer changes
    const recentOfficerChanges = (officers.items || []).filter((o: any) => {
      if (!since) return false;
      return (o.appointed_on && o.appointed_on >= since) || (o.resigned_on && o.resigned_on >= since);
    });

    // Build change summary
    const changes = {
      companyNumber,
      companyName: profile.company_name,
      status: profile.company_status,
      hasCharges: profile.has_charges,
      hasInsolvency: profile.has_insolvency_history,
      lastAccountsDate: profile.accounts?.last_accounts?.made_up_to,
      lastAccountsType: profile.accounts?.last_accounts?.type,
      recentFilings: recentFilings.map((f: any) => ({
        date: f.date,
        category: f.category,
        description: f.description,
        type: f.type,
      })),
      recentOfficerChanges: recentOfficerChanges.map((o: any) => ({
        name: o.name,
        role: o.officer_role,
        appointedOn: o.appointed_on,
        resignedOn: o.resigned_on,
      })),
      totalRecentChanges: recentFilings.length + recentOfficerChanges.length,
      checkedAt: new Date().toISOString(),
    };

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(changes);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
