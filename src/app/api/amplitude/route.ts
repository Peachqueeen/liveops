import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testAmplitudeConnection } from "@/lib/amplitude";

export async function GET() {
  const config = await db.amplitudeConfig.findUnique({ where: { id: "singleton" } });
  if (!config) return NextResponse.json({ apiKey: "", secretKey: "", projectId: "", lastSyncAt: null });

  // Never expose the secret key in GET — just confirm it's set
  return NextResponse.json({
    apiKey: config.apiKey,
    secretKeySet: config.secretKey.length > 0,
    projectId: config.projectId,
    lastSyncAt: config.lastSyncAt,
  });
}

export async function PUT(req: NextRequest) {
  const { apiKey, secretKey, projectId } = await req.json();

  const config = await db.amplitudeConfig.upsert({
    where: { id: "singleton" },
    update: { apiKey: apiKey ?? "", secretKey: secretKey ?? "", projectId: projectId ?? "" },
    create: { id: "singleton", apiKey: apiKey ?? "", secretKey: secretKey ?? "", projectId: projectId ?? "" },
  });

  // Test connection if credentials provided
  if (apiKey && secretKey) {
    const result = await testAmplitudeConnection({ apiKey, secretKey });
    return NextResponse.json({ ok: true, connected: result.ok, error: result.error, lastSyncAt: config.lastSyncAt });
  }

  return NextResponse.json({ ok: true, connected: false, lastSyncAt: config.lastSyncAt });
}
