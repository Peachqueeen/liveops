import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Upsert a reward for a season event
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { seasonEventId, assetTypeId, minAmount, maxAmount, probability, tier, notes } =
    await req.json();

  if (!seasonEventId || !assetTypeId) {
    return NextResponse.json({ error: "seasonEventId and assetTypeId required" }, { status: 400 });
  }

  // Verify the seasonEvent belongs to this season
  const se = await db.seasonEvent.findFirst({
    where: { id: seasonEventId, seasonId: params.id },
  });
  if (!se) return NextResponse.json({ error: "SeasonEvent not found in this season" }, { status: 404 });

  const reward = await db.reward.upsert({
    where: { seasonEventId_assetTypeId: { seasonEventId, assetTypeId } },
    update: { minAmount, maxAmount, probability, tier, notes },
    create: { seasonEventId, assetTypeId, minAmount, maxAmount, probability: probability ?? 1.0, tier, notes },
    include: { assetType: true },
  });
  return NextResponse.json(reward);
}

// Delete a reward
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { seasonEventId, assetTypeId } = await req.json();

  const se = await db.seasonEvent.findFirst({ where: { id: seasonEventId, seasonId: params.id } });
  if (!se) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.reward.delete({
    where: { seasonEventId_assetTypeId: { seasonEventId, assetTypeId } },
  });
  return NextResponse.json({ ok: true });
}
