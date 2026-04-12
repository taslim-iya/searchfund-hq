import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Deep company enrichment API.
 * Sources: Companies House, company website scraping, OpenAI analysis.
 * Optional: Apollo.io for contact data.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { companyNumber, companyName, website, companiesHouseKey, openaiKey, apolloKey } = req.body;

  // Fall back to server-side env vars
  const resolvedOpenaiKey = openaiKey || process.env.OPENAI_API_KEY || '';
  const resolvedApolloKey = apolloKey || process.env.APOLLO_API_KEY || '';

  if (!companyNumber || !companiesHouseKey) {
    return res.status(400).json({ error: 'Missing companyNumber or companiesHouseKey' });
  }

  const chAuth = `Basic ${Buffer.from(`${companiesHouseKey}:`).toString('base64')}`;
  const BASE = 'https://api.company-information.service.gov.uk';
  const results: any = { companyNumber, companyName, enrichedAt: new Date().toISOString(), sources: [] };

  try {
    // 1. Companies House — full profile + officers + PSCs + filing history
    const [profileRes, officersRes, pscRes, filingsRes] = await Promise.all([
      fetch(`${BASE}/company/${companyNumber}`, { headers: { Authorization: chAuth } }),
      fetch(`${BASE}/company/${companyNumber}/officers`, { headers: { Authorization: chAuth } }),
      fetch(`${BASE}/company/${companyNumber}/persons-with-significant-control`, { headers: { Authorization: chAuth } }),
      fetch(`${BASE}/company/${companyNumber}/filing-history?items_per_page=20`, { headers: { Authorization: chAuth } }),
    ]);

    const [profile, officers, pscs, filings] = await Promise.all([
      profileRes.json(), officersRes.json(), pscRes.json(), filingsRes.json(),
    ]);

    results.companyHouse = {
      name: profile.company_name,
      status: profile.company_status,
      type: profile.type,
      created: profile.date_of_creation,
      sicCodes: profile.sic_codes || [],
      address: profile.registered_office_address,
      accounts: profile.accounts?.last_accounts,
      hasCharges: profile.has_charges,
      hasInsolvency: profile.has_insolvency_history,
      previousNames: (profile.previous_company_names || []).slice(0, 5),
    };
    results.officers = (officers.items || []).filter((o: any) => !o.resigned_on).map((o: any) => ({
      name: o.name, role: o.officer_role, since: o.appointed_on,
      nationality: o.nationality, occupation: o.occupation,
      dob: o.date_of_birth ? `${o.date_of_birth.month}/${o.date_of_birth.year}` : null,
    }));
    results.ownership = (pscs.items || []).map((p: any) => ({
      name: p.name, control: p.natures_of_control, since: p.notified_on,
      nationality: p.nationality, residence: p.country_of_residence,
    }));
    results.recentFilings = (filings.items || []).slice(0, 10).map((f: any) => ({
      date: f.date, category: f.category, description: f.description,
    }));
    results.sources.push('Companies House');

    // 2. Website scraping (if URL provided)
    if (website) {
      try {
        const siteUrl = website.startsWith('http') ? website : `https://${website}`;
        const siteRes = await fetch(siteUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 SearchFund Research Bot' },
          signal: AbortSignal.timeout(8000),
        });
        const html = await siteRes.text();

        // Extract useful text (strip tags, get first 3000 chars)
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000);

        // Extract emails from page
        const emails = [...new Set((html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []))];

        // Extract phone numbers
        const phones = [...new Set((html.match(/(?:(?:\+44|0)[\s.-]?(?:\d[\s.-]?){9,10})/g) || []))];

        // Extract social links
        const socialLinks: Record<string, string> = {};
        const linkedinMatch = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^\s"'<>]+/gi);
        const twitterMatch = html.match(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>]+/gi);
        const facebookMatch = html.match(/https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/gi);
        if (linkedinMatch) socialLinks.linkedin = linkedinMatch[0];
        if (twitterMatch) socialLinks.twitter = twitterMatch[0];
        if (facebookMatch) socialLinks.facebook = facebookMatch[0];

        results.website = { url: siteUrl, text, emails, phones, socialLinks };
        results.sources.push('Company Website');
      } catch { results.website = { error: 'Could not fetch website' }; }
    }

    // 3. Apollo.io contact enrichment (if key provided)
    if (resolvedApolloKey && companyName) {
      try {
        const apolloRes = await fetch('https://api.apollo.io/v1/mixed_people/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
          body: JSON.stringify({
            api_key: resolvedApolloKey,
            q_organization_name: companyName,
            page: 1,
            per_page: 5,
            person_titles: ['owner', 'director', 'managing director', 'founder', 'ceo', 'chief executive'],
          }),
        });
        const apolloData = await apolloRes.json();
        results.apollo = {
          people: (apolloData.people || []).map((p: any) => ({
            name: p.name,
            title: p.title,
            email: p.email,
            phone: p.phone_numbers?.[0]?.sanitized_number,
            linkedin: p.linkedin_url,
            city: p.city,
            company: p.organization?.name,
            companyLinkedin: p.organization?.linkedin_url,
            companyWebsite: p.organization?.website_url,
            companySize: p.organization?.estimated_num_employees,
            companyRevenue: p.organization?.annual_revenue_printed,
            companyIndustry: p.organization?.industry,
          })),
          orgMatch: apolloData.people?.[0]?.organization ? {
            name: apolloData.people[0].organization.name,
            website: apolloData.people[0].organization.website_url,
            linkedin: apolloData.people[0].organization.linkedin_url,
            employees: apolloData.people[0].organization.estimated_num_employees,
            revenue: apolloData.people[0].organization.annual_revenue_printed,
            industry: apolloData.people[0].organization.industry,
            keywords: apolloData.people[0].organization.keywords,
          } : null,
        };
        results.sources.push('Apollo.io');
      } catch { results.apollo = { error: 'Apollo API call failed' }; }
    }

    // 4. AI Analysis (if OpenAI key provided)
    if (resolvedOpenaiKey) {
      try {
        const context = JSON.stringify({
          company: results.companyHouse,
          officers: results.officers,
          ownership: results.ownership,
          website: results.website?.text?.slice(0, 1500) || 'No website data',
          apollo: results.apollo?.orgMatch || 'No Apollo data',
        });

        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resolvedOpenaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{
              role: 'system',
              content: `You are a search fund analyst. Analyse this company for acquisition potential. Return JSON with: {summary: string (2-3 sentences), strengths: string[], risks: string[], estimatedRevenue: string, ownerProfile: string, acquisitionAngle: string, outreachHook: string (personalised first line for cold email), industryContext: string, competitivePosition: string, growthPotential: string (H/M/L with reasoning)}. Be specific and data-driven.`,
            }, {
              role: 'user',
              content: `Analyse this company for search fund acquisition:\n${context}`,
            }],
            temperature: 0.3,
          }),
        });
        const aiData = await aiRes.json();
        const aiContent = aiData.choices?.[0]?.message?.content || '';
        try {
          results.aiAnalysis = JSON.parse(aiContent.replace(/```json?\n?/g, '').replace(/```/g, ''));
        } catch {
          results.aiAnalysis = { raw: aiContent };
        }
        results.sources.push('AI Analysis (GPT-4o)');
      } catch { results.aiAnalysis = { error: 'AI analysis failed' }; }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(results);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
