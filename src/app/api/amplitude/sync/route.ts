import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncFromAmplitude } from "@/lib/amplitude";

export async function POST(req: NextRequest) {
  const { seasonId } = await req.json();

  const ampConfig = await db.amplitudeConfig.findUnique({ where: { id: "singleton" } });
  if (!ampConfig?.apiKey || !ampConfig.secretKey) {
    return NextResponse.json({ error: "Amplitude not configured" }, { status: 400 });
  }

  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  const metrics = await syncFromAmplitude(
    { apiKey: ampConfig.apiKey, secretKey: ampConfig.secretKey, projectId: ampConfig.projectId },
    season.startDate,
    new Date()
  );

  // Persist synced metrics
  const record = await db.seasonMetric.create({
    data: {
      seasonId,
      date: new Date(),
      retentionD1:    metrics.retentionD1    ?? null,
      retentionD7:    metrics.retentionD7    ?? null,
      retentionD30:   metrics.retentionD30   ?? null,
      dau:            metrics.dau            ?? null,
      avgSessionMin:  metrics.avgSessionMin  ?? null,
      arpu:           metrics.arpu           ?? null,
      conversionRate: metrics.conversionRate ?? null,
      source: "amplitude",
      notes: `Auto-synced from Amplitude at ${metrics.fetchedAt}`,
    },
  });

  // Update lastSyncAt
  await db.amplitudeConfig.update({ where: { id: "singleton" }, data: { lastSyncAt: new Date() } });

  return NextResponse.json({ ok: true, metrics: record });
}
