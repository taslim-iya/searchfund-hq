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
    // Fetch all data in parallel
    const [profile, officers, pscs, filingHistory, charges] = await Promise.all([
      chFetch(`/company/${num}`),
      chFetch(`/company/${num}/officers?items_per_page=50`),
      chFetch(`/company/${num}/persons-with-significant-control`),
      chFetch(`/company/${num}/filing-history?items_per_page=50&category=accounts`),
      chFetch(`/company/${num}/charges`),
    ]);

    if (!profile) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Extract financial data from accounts filing descriptions
    const financials: any[] = [];
    if (filingHistory?.items) {
      for (const filing of filingHistory.items) {
        if (filing.category === 'accounts' && filing.description_values) {
          financials.push({
            date: filing.date,
            type: filing.type,
            description: filing.description,
            madeUpTo: filing.description_values?.made_up_date,
            links: filing.links,
          });
        }
      }
    }

    // Build LinkedIn search URLs for officers
    const officersList = (officers?.items || []).map((o: any) => ({
      name: o.name,
      role: o.officer_role,
      appointedOn: o.appointed_on,
      resignedOn: o.resigned_on,
      nationality: o.nationality,
      occupation: o.occupation,
      countryOfResidence: o.country_of_residence,
      linkedin: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(o.name)}`,
    }));

    // PSCs (ownership)
    const pscList = (pscs?.items || []).map((p: any) => ({
      name: p.name || p.name_elements?.title + ' ' + p.name_elements?.forename + ' ' + p.name_elements?.surname,
      kind: p.kind,
      naturesOfControl: p.natures_of_control,
      notifiedOn: p.notified_on,
      nationality: p.nationality,
      countryOfResidence: p.country_of_residence,
    }));

    const result = {
      number: num,
      name: profile.company_name,
      status: profile.company_status,
      type: profile.type,
      incorporatedOn: profile.date_of_creation,
      dissolvedOn: profile.date_of_cessation,
      address: profile.registered_office_address,
      sicCodes: profile.sic_codes || [],
      sicDescriptions: [], // Will be enriched client-side
      accounts: profile.accounts,
      lastAccounts: profile.accounts?.last_accounts,
      nextAccounts: profile.accounts?.next_accounts,
      companyLinkedin: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(profile.company_name)}`,
      officers: officersList,
      pscs: pscList,
      financials,
      charges: charges?.items || [],
      hasCharges: (charges?.total_results || 0) > 0,
      externalLinks: {
        companiesHouse: `https://find-and-update.company-information.service.gov.uk/company/${num}`,
        endole: `https://suite.endole.co.uk/insight/company/${num}`,
      },
    };

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
