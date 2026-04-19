import type { VercelRequest, VercelResponse } from '@vercel/node';

const CH_KEY = process.env.COMPANIES_HOUSE_API_KEY || '6d4778d5-6ac2-4de8-9209-e71bbfb00e8c';
const BASE = 'https://api.company-information.service.gov.uk';
const DOC_BASE = 'https://document-api.company-information.service.gov.uk';

async function chFetch(url: string) {
  const auth = 'Basic ' + Buffer.from(CH_KEY + ':').toString('base64');
  const res = await fetch(url.startsWith('http') ? url : `${BASE}${url}`, {
    headers: { Authorization: auth },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchIXBRL(docUrl: string): Promise<string | null> {
  const auth = 'Basic ' + Buffer.from(CH_KEY + ':').toString('base64');
  // Get document metadata first
  const meta = await fetch(docUrl, { headers: { Authorization: auth } });
  if (!meta.ok) return null;
  const metaJson = await meta.json();

  // Check if XHTML (iXBRL) version exists
  if (!metaJson.resources?.['application/xhtml+xml']) return null;

  // Fetch the actual iXBRL content
  const contentUrl = metaJson.links?.document + '/content';
  if (!contentUrl) return null;

  const res = await fetch(contentUrl, {
    headers: { Authorization: auth, Accept: 'application/xhtml+xml' },
    redirect: 'follow',
  });
  if (!res.ok) return null;
  return res.text();
}

interface FinancialFigures {
  yearEnd: string;
  turnover?: number;
  costOfSales?: number;
  grossProfit?: number;
  operatingProfit?: number;
  profitBeforeTax?: number;
  profitAfterTax?: number;
  totalAssets?: number;
  totalAssetsLessCurrentLiabilities?: number;
  netAssets?: number;
  fixedAssets?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  longTermLiabilities?: number;
  cashAtBank?: number;
  debtors?: number;
  creditors?: number;
  equity?: number;
  employees?: number;
  tradeDebtors?: number;
  tradeCreditors?: number;
  propertyPlantEquipment?: number;
}

function parseIXBRL(html: string, yearEnd: string): FinancialFigures {
  const figures: FinancialFigures = { yearEnd };

  // Extract ix:nonFraction values — these are the tagged XBRL numbers
  const regex = /<ix:nonFraction[^>]*name="([^"]+)"[^>]*(?:sign="([^"]*)")?[^>]*>([\-\d,\.]+)<\/ix:nonFraction>/g;
  const all: { name: string; value: number; sign?: string }[] = [];

  let m;
  while ((m = regex.exec(html)) !== null) {
    const name = m[1].split(':').pop() || '';
    const sign = m[2];
    let raw = m[3].replace(/,/g, '');
    if (raw === '-' || raw === '') continue;
    let val = parseFloat(raw);
    if (isNaN(val)) continue;
    if (sign === 'minus' || sign === '-') val = -val;
    all.push({ name, value: val, sign: sign });
  }

  // Also handle sign attribute on the tag itself
  const regex2 = /<ix:nonFraction[^>]*sign="([^"]*)"[^>]*name="([^"]+)"[^>]*>([\-\d,\.]+)<\/ix:nonFraction>/g;
  while ((m = regex2.exec(html)) !== null) {
    const sign = m[1];
    const name = m[2].split(':').pop() || '';
    let raw = m[3].replace(/,/g, '');
    if (raw === '-' || raw === '') continue;
    let val = parseFloat(raw);
    if (isNaN(val)) continue;
    if (sign === 'minus' || sign === '-') val = -val;
    // Only add if not already found
    if (!all.find(a => a.name === name && a.value === val)) {
      all.push({ name, value: val });
    }
  }

  // Map XBRL tags to our structure - take the FIRST occurrence (current year, not prior year)
  const first = (names: string[]): number | undefined => {
    for (const n of names) {
      const found = all.find(a => a.name === n);
      if (found) return found.value;
    }
    return undefined;
  };

  figures.turnover = first(['TurnoverRevenue', 'TurnoverGrossIncome', 'Revenue']);
  figures.costOfSales = first(['CostSales']);
  figures.grossProfit = first(['GrossProfitLoss', 'GrossProfit']);
  figures.operatingProfit = first(['OperatingProfitLoss', 'ProfitLossOnOrdinaryActivitiesBeforeInterest']);
  figures.profitBeforeTax = first(['ProfitLossBeforeTax', 'ProfitLossOnOrdinaryActivitiesBeforeTax']);
  figures.profitAfterTax = first(['ProfitLossForPeriod', 'ProfitLoss', 'ProfitLossOnOrdinaryActivitiesAfterTax']);
  figures.fixedAssets = first(['FixedAssets', 'PropertyPlantEquipment', 'IntangibleAssetsIncludingGoodwill', 'TangibleFixedAssets', 'NonCurrentAssets']);
  figures.propertyPlantEquipment = first(['PropertyPlantEquipment', 'TangibleFixedAssets']);
  figures.currentAssets = first(['CurrentAssets']);
  figures.debtors = first(['Debtors', 'TradeOtherReceivables']);
  figures.tradeDebtors = first(['TradeDebtorsTradeReceivables', 'TradeReceivables']);
  figures.cashAtBank = first(['CashBankOnHand', 'CashBankInHand', 'CashCashEquivalents']);
  figures.creditors = first(['Creditors', 'CreditorsDueWithinOneYear']);
  figures.currentLiabilities = first(['CreditorsDueWithinOneYear', 'Creditors', 'CurrentLiabilities']);
  figures.tradeCreditors = first(['TradeCreditorsTradePayables', 'TradePayables']);
  figures.longTermLiabilities = first(['CreditorsDueAfterOneYear', 'NonCurrentLiabilities', 'CreditorsDueAfterMoreThanOneYear']);
  figures.totalAssetsLessCurrentLiabilities = first(['TotalAssetsLessCurrentLiabilities']);
  figures.netAssets = first(['NetAssetsLiabilities', 'NetAssets']);
  figures.equity = first(['Equity', 'ShareholderFunds', 'TotalEquity', 'EquityShareholdersFunds']);
  figures.employees = first(['AverageNumberEmployeesDuringPeriod', 'AverageNumberEmployees']);

  // Calculate total assets if not directly available
  if (!figures.totalAssets && figures.fixedAssets && figures.currentAssets) {
    figures.totalAssets = figures.fixedAssets + figures.currentAssets;
  } else if (!figures.totalAssets && figures.totalAssetsLessCurrentLiabilities && figures.currentLiabilities) {
    figures.totalAssets = figures.totalAssetsLessCurrentLiabilities + figures.currentLiabilities;
  }

  return figures;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { number, years } = req.query;
  if (!number || typeof number !== 'string') {
    return res.status(400).json({ error: 'Company number required' });
  }

  const num = number.padStart(8, '0');
  const maxYears = Math.min(parseInt(String(years) || '6'), 8);

  try {
    // Get filing history (accounts only)
    const filings = await chFetch(`/company/${num}/filing-history?items_per_page=100&category=accounts`);
    if (!filings?.items?.length) {
      return res.status(200).json({ financials: [], message: 'No accounts found' });
    }

    // Filter to actual accounts (not reference date changes etc)
    const accountsFilings = filings.items
      .filter((f: any) => f.category === 'accounts' && f.type?.startsWith('AA') && f.links?.document_metadata)
      .filter((f: any) => !f.description?.includes('change-account-reference'))
      .slice(0, maxYears);

    const results: FinancialFigures[] = [];

    for (const filing of accountsFilings) {
      try {
        const docUrl = filing.links.document_metadata;
        const ixbrl = await fetchIXBRL(docUrl);
        if (ixbrl) {
          const yearEnd = filing.description_values?.made_up_date || filing.date;
          const figures = parseIXBRL(ixbrl, yearEnd);
          results.push(figures);
        }
      } catch {
        // Skip filings we can't parse
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ financials: results, company: num });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
