import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const metrics = await db.seasonMetric.findMany({
    where: { seasonId: params.id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(metrics);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const {
    date,
    retentionD1,
    retentionD7,
    retentionD30,
    dau,
    avgSessionMin,
    arpu,
    conversionRate,
    source,
    notes,
  } = body;

  const metric = await db.seasonMetric.create({
    data: {
      seasonId: params.id,
      date: date ? new Date(date) : new Date(),
      retentionD1:   retentionD1   != null ? parseFloat(retentionD1)   : null,
      retentionD7:   retentionD7   != null ? parseFloat(retentionD7)   : null,
      retentionD30:  retentionD30  != null ? parseFloat(retentionD30)  : null,
      dau:           dau           != null ? parseInt(dau)             : null,
      avgSessionMin: avgSessionMin != null ? parseFloat(avgSessionMin) : null,
      arpu:          arpu          != null ? parseFloat(arpu)          : null,
      conversionRate:conversionRate!= null ? parseFloat(conversionRate): null,
      source: source ?? "manual",
      notes,
    },
  });
  return NextResponse.json(metric, { status: 201 });
}
