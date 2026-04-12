import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * API endpoint to check Companies House data freshness and trigger refresh info.
 * The actual bulk data refresh is handled by a scheduled cron job.
 * This endpoint returns:
 * - Current data date
 * - Latest available data date from Companies House
 * - Whether a refresh is needed
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check what's available on Companies House download page
    const response = await fetch('http://download.companieshouse.gov.uk/en_output.html');
    const html = await response.text();
    
    // Extract the latest data date from the page
    const match = html.match(/BasicCompanyDataAsOneFile-(\d{4}-\d{2}-\d{2})\.zip/);
    const latestAvailable = match ? match[1] : null;
    
    // Our current data date (set during last build)
    const currentDate = '2026-04-01';
    
    const needsRefresh = latestAvailable && latestAvailable > currentDate;
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      currentDataDate: currentDate,
      latestAvailable,
      needsRefresh,
      lastChecked: new Date().toISOString(),
      source: 'Companies House Bulk Data Product',
      downloadUrl: latestAvailable 
        ? `http://download.companieshouse.gov.uk/BasicCompanyDataAsOneFile-${latestAvailable}.zip`
        : null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
