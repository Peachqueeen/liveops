import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const events = await db.event.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, slug, description, frequency, icon, sortOrder } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const event = await db.event.create({
    data: { name, slug, description, frequency: frequency ?? "daily", icon: icon ?? "🎡", sortOrder: sortOrder ?? 0 },
  });
  return NextResponse.json(event, { status: 201 });
}
