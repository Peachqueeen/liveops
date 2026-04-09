/**
 * Amplitude Data API integration.
 *
 * Docs: https://www.docs.developers.amplitude.com/analytics/apis/dashboard-rest-api/
 *
 * We use the Dashboard REST API v2 to pull:
 *   - Active user counts (DAU)
 *   - Retention cohort analysis
 *   - Revenue metrics (ARPU, paying users)
 */

export interface AmplitudeCredentials {
  apiKey: string;
  secretKey: string;
  projectId?: string;
}

export interface AmplitudeMetrics {
  dau?: number;
  retentionD1?: number;
  retentionD7?: number;
  retentionD30?: number;
  arpu?: number;
  conversionRate?: number;
  avgSessionMin?: number;
  fetchedAt: string;
}

const BASE_URL = "https://amplitude.com/api/2";

function authHeader(creds: AmplitudeCredentials): string {
  const token = Buffer.from(`${creds.apiKey}:${creds.secretKey}`).toString("base64");
  return `Basic ${token}`;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Fetch daily active users for a date range */
async function fetchDAU(
  creds: AmplitudeCredentials,
  start: Date,
  end: Date
): Promise<number | undefined> {
  const params = new URLSearchParams({
    start: formatDate(start),
    end: formatDate(end),
    m: "active",
    i: "1",
    g: "country",
  });
  const res = await fetch(`${BASE_URL}/users?${params}`, {
    headers: { Authorization: authHeader(creds) },
  });
  if (!res.ok) return undefined;
  const json = await res.json();
  // Sum the last day's total
  const series: number[][] = json?.data?.series ?? [];
  if (!series.length) return undefined;
  const last = series[series.length - 1];
  return last?.reduce((a: number, b: number) => a + b, 0) ?? undefined;
}

/** Fetch retention cohort (D1 / D7 / D30) using Amplitude retention endpoint */
async function fetchRetention(
  creds: AmplitudeCredentials,
  start: Date,
  end: Date
): Promise<{ d1?: number; d7?: number; d30?: number }> {
  const params = new URLSearchParams({
    se: JSON.stringify([{ event_type: "Any Event" }]),
    re: JSON.stringify([{ event_type: "Any Event" }]),
    startDate: formatDate(start),
    endDate: formatDate(end),
    retention_type: "n-day",
    i: "1",
  });
  const res = await fetch(`${BASE_URL}/retention?${params}`, {
    headers: { Authorization: authHeader(creds) },
  });
  if (!res.ok) return {};
  const json = await res.json();
  // Amplitude returns percentages keyed by day index
  const data = json?.data?.datasets?.[0]?.series ?? {};
  return {
    d1:  data["1"]  != null ? parseFloat((data["1"]  * 100).toFixed(1)) : undefined,
    d7:  data["7"]  != null ? parseFloat((data["7"]  * 100).toFixed(1)) : undefined,
    d30: data["30"] != null ? parseFloat((data["30"] * 100).toFixed(1)) : undefined,
  };
}

/** Fetch revenue metrics from Amplitude */
async function fetchRevenue(
  creds: AmplitudeCredentials,
  start: Date,
  end: Date
): Promise<{ arpu?: number; conversionRate?: number }> {
  const params = new URLSearchParams({
    start: formatDate(start),
    end: formatDate(end),
    m: "revenue_amount",
    i: "1",
  });
  const res = await fetch(`${BASE_URL}/revenue?${params}`, {
    headers: { Authorization: authHeader(creds) },
  });
  if (!res.ok) return {};
  const json = await res.json();
  const series: number[][] = json?.data?.series ?? [];
  const total = series.flat().reduce((a, b) => a + b, 0);
  const days = Math.max(1, series.length);

  // We also need paying user count to compute conversion
  const params2 = new URLSearchParams({
    start: formatDate(start),
    end: formatDate(end),
    m: "paying_users",
    i: "1",
  });
  const res2 = await fetch(`${BASE_URL}/revenue?${params2}`, {
    headers: { Authorization: authHeader(creds) },
  });
  let conversionRate: number | undefined;
  if (res2.ok) {
    const json2 = await res2.json();
    const payingSeries: number[][] = json2?.data?.series ?? [];
    const payingTotal = payingSeries.flat().reduce((a, b) => a + b, 0);
    // We need total users to compute %; use DAU as proxy
    const dauRes = await fetchDAU(creds, start, end);
    if (dauRes && dauRes > 0) {
      conversionRate = parseFloat(((payingTotal / days / dauRes) * 100).toFixed(2));
    }
  }

  return {
    arpu: total > 0 ? parseFloat((total / days).toFixed(4)) : undefined,
    conversionRate,
  };
}

/**
 * Pull all metrics from Amplitude for the given date range.
 * Gracefully returns partial data if some endpoints fail.
 */
export async function syncFromAmplitude(
  creds: AmplitudeCredentials,
  start: Date,
  end: Date
): Promise<AmplitudeMetrics> {
  const [dau, retention, revenue] = await Promise.allSettled([
    fetchDAU(creds, start, end),
    fetchRetention(creds, start, end),
    fetchRevenue(creds, start, end),
  ]);

  return {
    dau:           dau.status === "fulfilled" ? dau.value : undefined,
    retentionD1:   retention.status === "fulfilled" ? retention.value.d1  : undefined,
    retentionD7:   retention.status === "fulfilled" ? retention.value.d7  : undefined,
    retentionD30:  retention.status === "fulfilled" ? retention.value.d30 : undefined,
    arpu:          revenue.status === "fulfilled" ? revenue.value.arpu    : undefined,
    conversionRate:revenue.status === "fulfilled" ? revenue.value.conversionRate : undefined,
    fetchedAt: new Date().toISOString(),
  };
}

/** Validate credentials by hitting the lightweight /dashboard endpoint */
export async function testAmplitudeConnection(
  creds: AmplitudeCredentials
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/events/list`, {
      headers: { Authorization: authHeader(creds) },
    });
    if (res.ok) return { ok: true };
    const text = await res.text();
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
