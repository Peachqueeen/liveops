/**
 * Recommendation engine for liveops economy balancing.
 *
 * Core idea
 * ─────────
 * Every event gives out "free value" (freeValuePerDay).
 * We compare that against a monetisation reference to compute an Economy Ratio.
 *
 *   ratio < 0.30  →  too stingy  → churn risk → boost free rewards
 *   0.30 – 0.55  →  sweet spot  → good balance
 *   ratio > 0.55  →  too generous → monetisation risk → tighten rewards
 *
 * When Amplitude data is available, the actual D1/D7 retention and ARPU scores
 * override the estimated scores.
 */

export interface AssetSummary {
  id: string;
  name: string;
  slug: string;
  icon: string;
  isPremium: boolean;
  valueWeight: number;
}

export interface RewardSummary {
  assetTypeId: string;
  assetName: string;
  assetSlug: string;
  minAmount: number;
  maxAmount: number;
  probability: number;
  tier?: string | null;
}

export interface EventSummary {
  eventId: string;
  eventName: string;
  eventSlug: string;
  frequency: string; // daily | weekly | monthly | once
  isActive: boolean;
  rewards: RewardSummary[];
}

export interface MetricsSummary {
  retentionD1?: number | null;
  retentionD7?: number | null;
  retentionD30?: number | null;
  dau?: number | null;
  arpu?: number | null;
  conversionRate?: number | null;
  avgSessionMin?: number | null;
}

export interface SeasonAnalysisInput {
  season: { id: string; name: string; number: number };
  events: EventSummary[];
  assets: AssetSummary[];
  latestMetrics?: MetricsSummary | null;
  previousSeason?: { events: EventSummary[]; metrics?: MetricsSummary | null } | null;
}

export interface Recommendation {
  id: string;
  priority: "high" | "medium" | "low";
  type: "increase" | "decrease" | "maintain" | "info";
  category: "retention" | "monetisation" | "balance" | "data";
  eventSlug?: string;
  eventName?: string;
  assetSlug?: string;
  assetName?: string;
  currentValue?: number;
  suggestedValue?: number;
  changePercent?: number;
  title: string;
  reason: string;
}

export interface AnalysisResult {
  economyRatio: number;       // 0 – 1
  retentionScore: number;     // 0 – 100
  monetisationScore: number;  // 0 – 100
  balanceScore: number;       // 0 – 100 (harmonic blend)
  freeValuePerDay: number;
  premiumValuePerDay: number;
  recommendations: Recommendation[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert event frequency to daily multiplier */
function dailyMultiplier(frequency: string): number {
  switch (frequency) {
    case "daily":   return 1;
    case "weekly":  return 1 / 7;
    case "monthly": return 1 / 30;
    case "once":    return 1 / 90; // amortised over a typical 3-month season
    default:        return 1;
  }
}

/** Expected value per trigger = avg(min,max) × probability */
function expectedValue(r: RewardSummary): number {
  return ((r.minAmount + r.maxAmount) / 2) * r.probability;
}

/** Total weighted value contributed by one event per day */
function eventValuePerDay(event: EventSummary, assets: AssetSummary[]): number {
  const mult = dailyMultiplier(event.frequency);
  return event.rewards.reduce((sum, r) => {
    const asset = assets.find((a) => a.id === r.assetTypeId);
    const weight = asset?.valueWeight ?? 1;
    return sum + expectedValue(r) * weight * mult;
  }, 0);
}

/** Score 0-100 from a ratio where target = 1 */
function ratioScore(actual: number, target: number, tolerance = 0.2): number {
  const delta = Math.abs(actual - target) / target;
  const raw = Math.max(0, 1 - delta / tolerance);
  return Math.round(raw * 100);
}

// ─── Core analyser ────────────────────────────────────────────────────────────

export function analyseEconomy(input: SeasonAnalysisInput): AnalysisResult {
  const { events, assets, latestMetrics, previousSeason } = input;

  const activeEvents = events.filter((e) => e.isActive);

  // ── 1. Economy value breakdown ─────────────────────────────────────────────
  let freeValuePerDay = 0;
  let premiumValuePerDay = 0;

  for (const event of activeEvents) {
    const val = eventValuePerDay(event, assets);
    const hasPremiumAsset = event.rewards.some((r) => {
      const asset = assets.find((a) => a.id === r.assetTypeId);
      return asset?.isPremium;
    });
    if (hasPremiumAsset) {
      premiumValuePerDay += val;
    } else {
      freeValuePerDay += val;
    }
  }

  const totalValue = freeValuePerDay + premiumValuePerDay;
  const economyRatio = totalValue > 0 ? freeValuePerDay / totalValue : 0;

  // ── 2. Retention score ────────────────────────────────────────────────────
  let retentionScore: number;
  if (latestMetrics?.retentionD7 != null) {
    // Industry benchmarks: D1 ~40%, D7 ~20%, D30 ~10% for mid-core mobile
    const d1Score  = latestMetrics.retentionD1  != null ? ratioScore(latestMetrics.retentionD1, 40, 0.5)  : 50;
    const d7Score  = ratioScore(latestMetrics.retentionD7, 20, 0.5);
    const d30Score = latestMetrics.retentionD30 != null ? ratioScore(latestMetrics.retentionD30, 10, 0.5) : 50;
    retentionScore = Math.round(d1Score * 0.3 + d7Score * 0.4 + d30Score * 0.3);
  } else {
    // Estimate: more free value → better estimated retention, up to a ceiling
    retentionScore = Math.min(80, Math.round(economyRatio * 1.4 * 100));
  }

  // ── 3. Monetisation score ─────────────────────────────────────────────────
  let monetisationScore: number;
  if (latestMetrics?.arpu != null && latestMetrics.conversionRate != null) {
    // Benchmarks: ARPU ~€0.50/day, conversion ~3 %
    const arpuScore = ratioScore(latestMetrics.arpu, 0.5, 0.6);
    const convScore = ratioScore(latestMetrics.conversionRate, 3, 0.6);
    monetisationScore = Math.round(arpuScore * 0.5 + convScore * 0.5);
  } else {
    // Inverse of economy generosity: less free → more spending pressure
    monetisationScore = Math.min(80, Math.round((1 - economyRatio) * 100));
  }

  // ── 4. Balance score (harmonic mean rewards both being high) ──────────────
  const balanceScore =
    retentionScore + monetisationScore > 0
      ? Math.round((2 * retentionScore * monetisationScore) / (retentionScore + monetisationScore))
      : 0;

  // ── 5. Generate recommendations ───────────────────────────────────────────
  const recommendations: Recommendation[] = [];
  let recId = 0;

  const uid = () => `rec-${++recId}`;

  // 5a. Missing metrics → ask for data
  if (!latestMetrics?.retentionD7) {
    recommendations.push({
      id: uid(),
      priority: "high",
      type: "info",
      category: "data",
      title: "Add retention metrics for accurate scoring",
      reason:
        "Without D7 retention data the scoring is estimated. Enter metrics manually or connect Amplitude to get real numbers.",
    });
  }
  if (!latestMetrics?.arpu) {
    recommendations.push({
      id: uid(),
      priority: "medium",
      type: "info",
      category: "data",
      title: "Add ARPU / conversion data",
      reason:
        "Monetisation score is estimated. Link Amplitude or manually enter ARPU and conversion rate to unlock precise recommendations.",
    });
  }

  // 5b. Economy ratio out of bounds
  if (economyRatio < 0.30) {
    recommendations.push({
      id: uid(),
      priority: "high",
      type: "increase",
      category: "retention",
      title: "Economy too stingy — churn risk",
      reason: `Free value represents only ${Math.round(economyRatio * 100)}% of total economy (target 30–55%). Players may feel under-rewarded and churn. Consider increasing daily free gift or wheel payouts.`,
    });
    // Suggest specific event boosts
    const dailyGift = activeEvents.find((e) => e.eventSlug === "daily-free-gift");
    if (dailyGift) {
      const peachcoinReward = dailyGift.rewards.find((r) => {
        const a = assets.find((a) => a.id === r.assetTypeId);
        return a?.slug === "peachcoins";
      });
      if (peachcoinReward) {
        const current = peachcoinReward.maxAmount;
        const suggested = Math.round(current * 1.3);
        recommendations.push({
          id: uid(),
          priority: "high",
          type: "increase",
          category: "retention",
          eventSlug: "daily-free-gift",
          eventName: dailyGift.eventName,
          assetSlug: "peachcoins",
          assetName: "Peachcoins",
          currentValue: current,
          suggestedValue: suggested,
          changePercent: 30,
          title: `Increase Daily Free Gift peachcoins`,
          reason: `Raising the daily peachcoin gift from ${current} to ${suggested} (+30%) will improve D1 retention and smooth the new-player experience without significantly impacting premium revenue.`,
        });
      }
    }
  } else if (economyRatio > 0.55) {
    recommendations.push({
      id: uid(),
      priority: "high",
      type: "decrease",
      category: "monetisation",
      title: "Economy too generous — monetisation risk",
      reason: `Free value is ${Math.round(economyRatio * 100)}% of the economy (target 30–55%). Players may not feel the need to spend. Consider tightening wheel payouts or reducing free currency.`,
    });
  } else {
    recommendations.push({
      id: uid(),
      priority: "low",
      type: "maintain",
      category: "balance",
      title: "Economy ratio is in the sweet spot",
      reason: `Free value is ${Math.round(economyRatio * 100)}% of total economy — right in the 30–55% optimal range. Maintain current reward levels and monitor retention/ARPU for shifts.`,
    });
  }

  // 5c. Retention-specific suggestions
  if (latestMetrics?.retentionD1 != null && latestMetrics.retentionD1 < 35) {
    recommendations.push({
      id: uid(),
      priority: "high",
      type: "increase",
      category: "retention",
      title: `D1 retention low (${latestMetrics.retentionD1.toFixed(1)}%)`,
      reason:
        "Industry median D1 is ~40%. Boosting the Day 1 new-player reward pack and making the Daily Free Gift more discoverable typically lifts D1 by 5–10%.",
    });
  }
  if (latestMetrics?.retentionD7 != null && latestMetrics.retentionD7 < 15) {
    recommendations.push({
      id: uid(),
      priority: "high",
      type: "increase",
      category: "retention",
      title: `D7 retention low (${latestMetrics.retentionD7.toFixed(1)}%)`,
      reason:
        "D7 below 15% indicates players aren't forming a habit. Add a 7-day login streak bonus and ensure the Weekly Challenge is enticing enough to anchor a return visit.",
    });
  }

  // 5d. Monetisation suggestions
  if (latestMetrics?.conversionRate != null && latestMetrics.conversionRate < 2) {
    recommendations.push({
      id: uid(),
      priority: "medium",
      type: "decrease",
      category: "monetisation",
      title: `Conversion rate low (${latestMetrics.conversionRate.toFixed(1)}%)`,
      reason:
        "Less than 2% of players are paying. Create tighter bottlenecks around Gems (premium currency) and surface the Peachcoins Wheel as a stepping-stone before a hard paywall.",
    });
  }
  if (latestMetrics?.arpu != null && latestMetrics.arpu > 1.0) {
    recommendations.push({
      id: uid(),
      priority: "medium",
      type: "maintain",
      category: "monetisation",
      title: `ARPU strong at €${latestMetrics.arpu.toFixed(2)}/user/day`,
      reason:
        "ARPU is above the €0.50 benchmark. Monitor carefully — if ARPU climbs further while D7 drops, the economy may be generating short-term revenue at the cost of long-term LTV.",
    });
  }

  // 5e. Season-over-season comparison
  if (previousSeason) {
    const prevFreeValue = previousSeason.events
      .filter((e) => e.isActive)
      .reduce((sum, e) => sum + eventValuePerDay(e, assets), 0);
    const currFreeValue = activeEvents.reduce((sum, e) => sum + eventValuePerDay(e, assets), 0);
    const pct = prevFreeValue > 0 ? ((currFreeValue - prevFreeValue) / prevFreeValue) * 100 : 0;

    if (Math.abs(pct) > 15) {
      const dir = pct > 0 ? "increased" : "decreased";
      recommendations.push({
        id: uid(),
        priority: "medium",
        type: pct > 0 ? "decrease" : "increase",
        category: "balance",
        title: `Free economy ${dir} ${Math.abs(pct).toFixed(0)}% vs last season`,
        reason: `Compare ${dir === "increased" ? "higher" : "lower"} retention and ARPU to previous season after 2 weeks to validate whether this change was beneficial.`,
      });
    }

    // Compare metrics if both seasons have them
    const prev = previousSeason.metrics;
    const curr = latestMetrics;
    if (prev?.retentionD7 && curr?.retentionD7) {
      const retDelta = curr.retentionD7 - prev.retentionD7;
      if (retDelta < -3) {
        recommendations.push({
          id: uid(),
          priority: "high",
          type: "increase",
          category: "retention",
          title: `D7 retention dropped ${Math.abs(retDelta).toFixed(1)}pp vs last season`,
          reason: `Last season D7 was ${prev.retentionD7.toFixed(1)}%, now ${curr.retentionD7.toFixed(1)}%. Review which reward changes drove this and consider reverting or boosting the weakest events.`,
        });
      }
    }
  }

  // Sort: high priority first, then medium, then low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    economyRatio,
    retentionScore,
    monetisationScore,
    balanceScore,
    freeValuePerDay,
    premiumValuePerDay,
    recommendations,
  };
}

export function scoreLabel(score: number): string {
  if (score >= 75) return "Excellent";
  if (score >= 55) return "Good";
  if (score >= 35) return "Fair";
  return "Needs work";
}

export function ratioLabel(ratio: number): { label: string; status: "ok" | "warn" | "danger" } {
  if (ratio < 0.30) return { label: "Too stingy", status: "danger" };
  if (ratio > 0.55) return { label: "Too generous", status: "warn" };
  return { label: "Balanced", status: "ok" };
}
