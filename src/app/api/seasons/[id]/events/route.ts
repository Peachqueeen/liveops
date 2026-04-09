import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Add an event to a season (or toggle active state)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { eventId, isActive } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const seasonEvent = await db.seasonEvent.upsert({
    where: { seasonId_eventId: { seasonId: params.id, eventId } },
    update: { isActive: isActive ?? true },
    create: { seasonId: params.id, eventId, isActive: isActive ?? true },
  });
  return NextResponse.json(seasonEvent, { status: 201 });
}

// Remove an event from a season
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { eventId } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  await db.seasonEvent.delete({
    where: { seasonId_eventId: { seasonId: params.id, eventId } },
  });
  return NextResponse.json({ ok: true });
}
