import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const seasons = await db.season.findMany({
    orderBy: { number: "desc" },
    include: {
      _count: { select: { seasonEvents: true } },
      metrics: { orderBy: { date: "desc" }, take: 1 },
    },
  });
  return NextResponse.json(seasons);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, number, description, startDate, endDate } = body;

  if (!name || !number || !startDate || !endDate) {
    return NextResponse.json({ error: "name, number, startDate and endDate are required" }, { status: 400 });
  }

  // Deactivate all seasons first
  await db.season.updateMany({ data: { isActive: false } });

  const season = await db.season.create({
    data: {
      name,
      number: parseInt(number),
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
    },
  });
  return NextResponse.json(season, { status: 201 });
}
