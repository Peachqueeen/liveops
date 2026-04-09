import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyseEconomy, type SeasonAnalysisInput, type EventSummary } from "@/lib/recommendations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");

  if (!seasonId) {
    return NextResponse.json({ error: "seasonId required" }, { status: 400 });
  }

  const season = await db.season.findUnique({
    where: { id: seasonId },
    include: {
      seasonEvents: {
        include: {
          event: true,
          rewards: { include: { assetType: true } },
        },
      },
      metrics: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  const allAssets = await db.assetType.findMany();

  // Build previous season for comparison
  let previousSeason: SeasonAnalysisInput["previousSeason"] = null;
  const prevSeason = await db.season.findFirst({
    where: { number: season.number - 1 },
    include: {
      seasonEvents: {
        include: { event: true, rewards: { include: { assetType: true } } },
      },
      metrics: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  if (prevSeason) {
    previousSeason = {
      events: prevSeason.seasonEvents.map((se) => ({
        eventId: se.eventId,
        eventName: se.event.name,
        eventSlug: se.event.slug,
        frequency: se.event.frequency,
        isActive: se.isActive,
        rewards: se.rewards.map((r) => ({
          assetTypeId: r.assetTypeId,
          assetName: r.assetType.name,
          assetSlug: r.assetType.slug,
          minAmount: r.minAmount,
          maxAmount: r.maxAmount,
          probability: r.probability,
          tier: r.tier,
        })),
      })),
      metrics: prevSeason.metrics[0] ?? null,
    };
  }

  const input: SeasonAnalysisInput = {
    season: { id: season.id, name: season.name, number: season.number },
    events: season.seasonEvents.map((se): EventSummary => ({
      eventId: se.eventId,
      eventName: se.event.name,
      eventSlug: se.event.slug,
      frequency: se.event.frequency,
      isActive: se.isActive,
      rewards: se.rewards.map((r) => ({
        assetTypeId: r.assetTypeId,
        assetName: r.assetType.name,
        assetSlug: r.assetType.slug,
        minAmount: r.minAmount,
        maxAmount: r.maxAmount,
        probability: r.probability,
        tier: r.tier,
      })),
    })),
    assets: allAssets,
    latestMetrics: season.metrics[0] ?? null,
    previousSeason,
  };

  const analysis = analyseEconomy(input);
  return NextResponse.json({ season: { id: season.id, name: season.name, number: season.number }, ...analysis });
}
