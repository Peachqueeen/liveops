import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const assets = await db.assetType.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, slug, icon, description, color, isPremium, valueWeight, sortOrder } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const asset = await db.assetType.create({
    data: { name, slug, icon: icon ?? "🎁", description, color: color ?? "#6366f1", isPremium: isPremium ?? false, valueWeight: valueWeight ?? 1.0, sortOrder: sortOrder ?? 0 },
  });
  return NextResponse.json(asset, { status: 201 });
}
