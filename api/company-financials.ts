import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Fetch real financial data from Companies House filing history.
 * Looks for accounts filings and extracts available financial data.
 * Only returns actual data — never estimates.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const companyNumber = req.query.company as string;
  const apiKey = req.headers['x-api-key'] as string || '';

  if (!companyNumber || !apiKey) {
    return res.status(400).json({ error: 'Missing company or API key' });
  }

  const auth = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  const BASE = 'https://api.company-information.service.gov.uk';

  try {
    // Get company profile for accounts info
    const profileRes = await fetch(`${BASE}/company/${companyNumber}`, { headers: { Authorization: auth } });
    const profile = await profileRes.json();

    const accounts = profile.accounts || {};
    const lastAccounts = accounts.last_accounts || {};
    const addr = profile.registered_office_address || {};

    // Get filing history to find accounts documents
    const filingsRes = await fetch(`${BASE}/company/${companyNumber}/filing-history?items_per_page=50&category=accounts`, {
      headers: { Authorization: auth },
    });
    const filingsData = await filingsRes.json();
    const accountFilings = (filingsData.items || []).filter((f: any) =>
      f.category === 'accounts' || f.type?.includes('AA')
    );

    // Try to get the accounts document for the latest filing
    // Companies House has a document API but actual XBRL/iXBRL parsing is complex
    // We extract what's available from the filing metadata
    let financials: any = null;

    // For companies filing full/small accounts, try the accounts API
    // Note: CH doesn't expose parsed financials via REST — we use what's in the profile
    const accType = lastAccounts.type || '';
    const madeUpTo = lastAccounts.made_up_to || '';

    // Build financial snapshot from available data
    financials = {
      accountsType: accType,
      accountsMadeUpTo: madeUpTo,
      accountsNextDue: accounts.next_due || '',
      accountsOverdue: accounts.overdue ? true : false,
      confirmationNextDue: profile.confirmation_statement?.next_due || '',
      confirmationOverdue: profile.confirmation_statement?.overdue ? true : false,
      hasCharges: profile.has_charges || false,
      hasInsolvency: profile.has_insolvency_history || false,
      // Filing history for accounts
      accountsHistory: accountFilings.slice(0, 10).map((f: any) => ({
        date: f.date,
        description: f.description,
        type: f.type,
        madeUpTo: f.description_values?.made_up_date || '',
      })),
    };

    // Determine company size bracket from accounts type
    let sizeBracket = '';
    if (accType.includes('micro')) sizeBracket = 'micro';
    else if (accType.includes('small') || accType === 'total-exemption-full' || accType === 'total-exemption-small') sizeBracket = 'small';
    else if (accType.includes('medium')) sizeBracket = 'medium';
    else if (accType === 'full') sizeBracket = 'full';
    else if (accType.includes('group')) sizeBracket = 'group';
    else if (accType.includes('dormant')) sizeBracket = 'dormant';

    financials.sizeBracket = sizeBracket;

    // Flag issues
    const flags: string[] = [];
    if (profile.has_insolvency_history) flags.push('INSOLVENCY_HISTORY');
    if (profile.has_charges) flags.push('HAS_CHARGES');
    if (accounts.overdue) flags.push('ACCOUNTS_OVERDUE');
    if (profile.confirmation_statement?.overdue) flags.push('CONFIRMATION_OVERDUE');
    if (accType.includes('dormant')) flags.push('DORMANT');
    financials.flags = flags;

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      companyNumber,
      companyName: profile.company_name,
      status: profile.company_status,
      created: profile.date_of_creation,
      type: profile.type,
      sicCodes: profile.sic_codes || [],
      address: [addr.address_line_1, addr.locality, addr.region, addr.postal_code].filter(Boolean).join(', '),
      financials,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
