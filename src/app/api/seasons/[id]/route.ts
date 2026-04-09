import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const season = await db.season.findUnique({
    where: { id: params.id },
    include: {
      seasonEvents: {
        include: {
          event: true,
          rewards: { include: { assetType: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      metrics: { orderBy: { date: "desc" } },
    },
  });
  if (!season) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(season);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (body.isActive) {
    await db.season.updateMany({ data: { isActive: false } });
  }
  const season = await db.season.update({ where: { id: params.id }, data: body });
  return NextResponse.json(season);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.season.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
