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

  const queryParams = new URLSearchParams({ role, experience, location });
  const response = await fetch(`/api/serp?${queryParams.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Salary data service request failed');
  }

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