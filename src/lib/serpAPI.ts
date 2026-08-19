export interface SerpSalaryData {
  intlMin: number;
  intlAvg: number;
  intlMax: number;
  localMin: number;
  localAvg: number;
  localMax: number;
  dataPoints: number;
  source: string;
  lastUpdated: Date;
}

/**
 * Cache SERP results in localStorage for 24 hours
 */
export function getCachedSalaryData(role: string, experience: string, location: string): SerpSalaryData | null {
  const key = `serp_salary_${role}_${experience}_${location}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    if (isCacheExpired(new Date(parsed.lastUpdated))) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

export function setCachedSalaryData(role: string, experience: string, location: string, data: SerpSalaryData): void {
  const key = `serp_salary_${role}_${experience}_${location}`;
  localStorage.setItem(key, JSON.stringify(data));
}

export function isCacheExpired(timestamp: Date): boolean {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  return new Date().getTime() - new Date(timestamp).getTime() > TWENTY_FOUR_HOURS;
}

/**
 * Convert hourly to annual salary
 */
function hourlyToAnnual(hourlyRate: number): number {
  return hourlyRate * 40 * 52;
}

/**
 * Convert monthly to annual salary
 */
function monthlyToAnnual(monthlyRate: number): number {
  return monthlyRate * 12;
}

/**
 * Parse salary ranges from SERP search results
 */
export function parseSalaryFromSearchResults(html: string): { min: number; avg: number; max: number } | null {
  // Simple heuristic parsing to grab $XX,XXX or $XX/hr
  // This is a rough estimation used when parsing organic search snippets.
  
  const snippets = html.toLowerCase();
  let values: number[] = [];

  // Match numbers like $120,000 or $120k or $120.5k
  const numberRegex = /\$(?:([0-9]{1,3}(?:,[0-9]{3})+)|([0-9]{2,4}(?:\.[0-9])?)[kK])/g;
  let match;
  while ((match = numberRegex.exec(snippets)) !== null) {
    let valStr = match[1] || match[2];
    if (valStr) {
       valStr = valStr.replace(/,/g, '');
       let minVal = parseFloat(valStr);
       if (match[2]) { // it was isolated as a 'k' value
         minVal = minVal * 1000;
       }
       if (minVal > 10000 && minVal <= 500000) values.push(minVal);
    }
  }

  // Match standalone hourly like $50 /hr
  const hourlyRegex = /\$([0-9]{2,3})\s*(?:\/hr|\/hour|per hour|an hour)/g;
  while ((match = hourlyRegex.exec(snippets)) !== null) {
      let valStr = match[1];
      if (valStr) {
          let h = parseFloat(valStr);
          if (h >= 5 && h <= 200) values.push(hourlyToAnnual(h));
      }
  }

  // Also match standalone hourly rates if they look like $50
  const standaloneHourly = /\$([0-9]{2,3})(?!\s*[kK])/g;
  while ((match = standaloneHourly.exec(snippets)) !== null) {
      let valStr = match[1];
      if (valStr) {
          let h = parseFloat(valStr);
          if (h >= 5 && h <= 200) values.push(hourlyToAnnual(h));
      }
  }

  if (values.length === 0) return null;

  values.sort((a, b) => a - b);
  const min = values[Math.floor(values.length * 0.25)] || values[0]; 
  const max = values[Math.floor(values.length * 0.75)] || values[values.length - 1]; 
  
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;

  return {
    min: Math.round(min),
    avg: Math.round(avg),
    max: Math.round(max)
  };
}

/**
 * Try to fetch JSON from a URL, attempting direct first then falling
 * back through two CORS proxies. Returns the parsed JSON object.
 */
async function fetchWithCORSFallback(url: string): Promise<any> {
  // 1️⃣ Direct — SerpAPI does support CORS on paid plans
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      // SerpAPI can return 200 with an error field — surface it properly
      if (data?.error) throw new Error(data.error);
      return data;
    }
  } catch (directErr: any) {
    // If it's a meaningful SerpAPI error (not a network/CORS error) re-throw immediately
    const msg: string = directErr?.message ?? '';
    if (
      msg.toLowerCase().includes('invalid api key') ||
      msg.toLowerCase().includes('api key') ||
      msg.toLowerCase().includes('rate limit') ||
      msg.toLowerCase().includes('quota')
    ) {
      throw directErr;
    }
    console.warn('[serpAPI] Direct fetch failed, trying proxy 1:', msg);
  }

  // 2️⃣ corsproxy.io — more reliable than allorigins
  try {
    const proxy1 = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const res = await fetch(proxy1);
    if (res.ok) {
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      return data;
    }
  } catch (p1Err: any) {
    const msg: string = p1Err?.message ?? '';
    if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('quota')) {
      throw p1Err;
    }
    console.warn('[serpAPI] Proxy 1 failed, trying proxy 2:', msg);
  }

  // 3️⃣ allorigins — last resort
  const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxy2);
  if (!res.ok) throw new Error(`All proxies failed (status ${res.status})`);
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Fetch salary data from SERP API for a custom role.
 * Import path: import { fetchSalaryFromSERP } from './serpAPI'  (root-level file)
 */
export async function fetchSalaryFromSERP(
  role: string,
  experience: string,
  location: string
): Promise<SerpSalaryData> {
  const cached = getCachedSalaryData(role, experience, location);
  if (cached) return cached;

  const SERPAPI_KEY = import.meta.env.VITE_SERPAPI_KEY;
  if (!SERPAPI_KEY) {
    // Match what the SalaryCoach catch block checks for
    throw new Error('Missing API Key: VITE_SERPAPI_KEY not set in .env.local');
  }

  const query = `${role} salary ${experience} ${location} 2024`;
  const params = new URLSearchParams({
    engine:  'google',
    q:       query,
    api_key: SERPAPI_KEY,
    num:     '10',
  });

  const serpUrl = `https://serpapi.com/search.json?${params.toString()}`;
  console.log('[serpAPI] Fetching:', `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}`);

  // fetchWithCORSFallback handles direct + 2 proxies and always throws a clean Error
  const data = await fetchWithCORSFallback(serpUrl);

  if (!data.organic_results || data.organic_results.length === 0) {
    throw new Error('No search results found for this role');
  }

  // Concatenate all snippets for salary parsing
  const organicText = data.organic_results
    .map((r: any) => r.snippet || '')
    .join('\n');

  console.log('[serpAPI] Snippets to parse:', organicText.slice(0, 300));

  const parsed = parseSalaryFromSearchResults(organicText);
  if (!parsed) {
    throw new Error('No valid salary numbers found in the search results');
  }

  // Convert annual USD → hourly for international display
  const intlMinHourly = parsed.min / (40 * 52);
  const intlAvgHourly = parsed.avg / (40 * 52);
  const intlMaxHourly = parsed.max / (40 * 52);

  // Convert to PKR/month (1 USD ≈ 280 PKR)
  const localMultiplier = location.toLowerCase().includes('pakistan') ? 1 : 0.3;
  const localAnnual     = parsed.avg * 280 * localMultiplier;
  const localMonthlyAvg = localAnnual / 12;

  const result: SerpSalaryData = {
    intlMin:     Math.round(intlMinHourly),
    intlAvg:     Math.round(intlAvgHourly),
    intlMax:     Math.round(intlMaxHourly),
    localMin:    Math.round(localMonthlyAvg * 0.7),
    localAvg:    Math.round(localMonthlyAvg),
    localMax:    Math.round(localMonthlyAvg * 1.3),
    dataPoints:  data.organic_results.length,
    source:      'Google SERP Analysis',
    lastUpdated: new Date(),
  };

  setCachedSalaryData(role, experience, location, result);
  return result;
}