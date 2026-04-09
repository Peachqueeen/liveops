import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Asset types ─────────────────────────────────────────────────────────────
  const assets = await Promise.all([
    prisma.assetType.upsert({
      where: { slug: "peachcoins" },
      update: {},
      create: {
        name: "Peachcoins",
        slug: "peachcoins",
        icon: "🍑",
        description: "Soft in-game currency earned for free",
        color: "#ff7a45",
        isPremium: false,
        valueWeight: 1.0,
        sortOrder: 0,
      },
    }),
    prisma.assetType.upsert({
      where: { slug: "tickets" },
      update: {},
      create: {
        name: "Tickets",
        slug: "tickets",
        icon: "🎟️",
        description: "Used to enter paid events and modes",
        color: "#6366f1",
        isPremium: false,
        valueWeight: 5.0,
        sortOrder: 1,
      },
    }),
    prisma.assetType.upsert({
      where: { slug: "cards" },
      update: {},
      create: {
        name: "Cards",
        slug: "cards",
        icon: "🃏",
        description: "Collectible cards used to unlock content",
        color: "#8b5cf6",
        isPremium: false,
        valueWeight: 3.0,
        sortOrder: 2,
      },
    }),
    prisma.assetType.upsert({
      where: { slug: "boosters" },
      update: {},
      create: {
        name: "Boosters",
        slug: "boosters",
        icon: "⚡",
        description: "Temporary power-ups to enhance gameplay",
        color: "#eab308",
        isPremium: false,
        valueWeight: 8.0,
        sortOrder: 3,
      },
    }),
    prisma.assetType.upsert({
      where: { slug: "speed-time" },
      update: {},
      create: {
        name: "Speed Time",
        slug: "speed-time",
        icon: "⏩",
        description: "Minutes of time acceleration applied to builds/timers",
        color: "#06b6d4",
        isPremium: false,
        valueWeight: 2.0,
        sortOrder: 4,
      },
    }),
    prisma.assetType.upsert({
      where: { slug: "gems" },
      update: {},
      create: {
        name: "Gems",
        slug: "gems",
        icon: "💎",
        description: "Hard premium currency purchased with real money",
        color: "#ec4899",
        isPremium: true,
        valueWeight: 50.0,
        sortOrder: 5,
      },
    }),
  ]);

  console.log(`Created ${assets.length} asset types`);

  // ── Events ───────────────────────────────────────────────────────────────────
  const events = await Promise.all([
    prisma.event.upsert({
      where: { slug: "daily-free-gift" },
      update: {},
      create: {
        name: "Daily Free Gift",
        slug: "daily-free-gift",
        icon: "🎁",
        description: "A free reward players claim once per day",
        frequency: "daily",
        sortOrder: 0,
      },
    }),
    prisma.event.upsert({
      where: { slug: "daily-free-wheel" },
      update: {},
      create: {
        name: "Daily Free Wheel",
        slug: "daily-free-wheel",
        icon: "🎡",
        description: "One free spin on the reward wheel every day",
        frequency: "daily",
        sortOrder: 1,
      },
    }),
    prisma.event.upsert({
      where: { slug: "peachcoins-wheel" },
      update: {},
      create: {
        name: "Peachcoins Wheel",
        slug: "peachcoins-wheel",
        icon: "🍑",
        description: "Spin the wheel using peachcoins to win bigger prizes",
        frequency: "daily",
        sortOrder: 2,
      },
    }),
    prisma.event.upsert({
      where: { slug: "memopeach" },
      update: {},
      create: {
        name: "Memopeach",
        slug: "memopeach",
        icon: "🧠",
        description: "Memory challenge mini-game with tiered rewards",
        frequency: "daily",
        sortOrder: 3,
      },
    }),
    prisma.event.upsert({
      where: { slug: "weekly-challenge" },
      update: {},
      create: {
        name: "Weekly Challenge",
        slug: "weekly-challenge",
        icon: "🏆",
        description: "Weekly missions with milestone rewards",
        frequency: "weekly",
        sortOrder: 4,
      },
    }),
    prisma.event.upsert({
      where: { slug: "season-pass" },
      update: {},
      create: {
        name: "Season Pass",
        slug: "season-pass",
        icon: "🌟",
        description: "Tiered season pass with free + premium tracks",
        frequency: "once",
        sortOrder: 5,
      },
    }),
  ]);

  console.log(`Created ${events.length} event types`);

  // ── Season 1 (active) ────────────────────────────────────────────────────────
  const season1 = await prisma.season.upsert({
    where: { number: 1 },
    update: {},
    create: {
      name: "Peach Blossom",
      number: 1,
      description: "Spring launch season",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
    },
  });

  // Attach all events to Season 1 with sample rewards
  const rewardConfig: Record<
    string,
    { assetSlug: string; min: number; max: number; prob: number; tier?: string }[]
  > = {
    "daily-free-gift": [
      { assetSlug: "peachcoins", min: 50, max: 50, prob: 1.0 },
      { assetSlug: "cards", min: 1, max: 1, prob: 0.3 },
    ],
    "daily-free-wheel": [
      { assetSlug: "peachcoins", min: 30, max: 150, prob: 0.4 },
      { assetSlug: "tickets", min: 1, max: 3, prob: 0.25 },
      { assetSlug: "boosters", min: 1, max: 2, prob: 0.2 },
      { assetSlug: "speed-time", min: 15, max: 60, prob: 0.15 },
    ],
    "peachcoins-wheel": [
      { assetSlug: "peachcoins", min: 100, max: 500, prob: 0.35 },
      { assetSlug: "cards", min: 2, max: 5, prob: 0.3 },
      { assetSlug: "tickets", min: 2, max: 5, prob: 0.2 },
      { assetSlug: "boosters", min: 2, max: 4, prob: 0.15 },
    ],
    memopeach: [
      { assetSlug: "peachcoins", min: 20, max: 80, prob: 1.0, tier: "bronze" },
      { assetSlug: "cards", min: 1, max: 3, prob: 1.0, tier: "silver" },
      { assetSlug: "boosters", min: 1, max: 2, prob: 1.0, tier: "gold" },
    ],
    "weekly-challenge": [
      { assetSlug: "tickets", min: 5, max: 10, prob: 1.0 },
      { assetSlug: "cards", min: 3, max: 6, prob: 1.0 },
      { assetSlug: "peachcoins", min: 200, max: 200, prob: 1.0 },
    ],
    "season-pass": [
      { assetSlug: "peachcoins", min: 500, max: 500, prob: 1.0, tier: "bronze" },
      { assetSlug: "cards", min: 10, max: 10, prob: 1.0, tier: "silver" },
      { assetSlug: "gems", min: 5, max: 5, prob: 1.0, tier: "gold" },
    ],
  };

  for (const event of events) {
    const seasonEvent = await prisma.seasonEvent.upsert({
      where: { seasonId_eventId: { seasonId: season1.id, eventId: event.id } },
      update: {},
      create: { seasonId: season1.id, eventId: event.id, isActive: true },
    });

    const rewards = rewardConfig[event.slug] ?? [];
    for (const r of rewards) {
      const asset = assets.find((a) => a.slug === r.assetSlug);
      if (!asset) continue;
      await prisma.reward.upsert({
        where: { seasonEventId_assetTypeId: { seasonEventId: seasonEvent.id, assetTypeId: asset.id } },
        update: {},
        create: {
          seasonEventId: seasonEvent.id,
          assetTypeId: asset.id,
          minAmount: r.min,
          maxAmount: r.max,
          probability: r.prob,
          tier: r.tier,
        },
      });
    }
  }

  // Sample metrics for Season 1
  await prisma.seasonMetric.create({
    data: {
      seasonId: season1.id,
      date: new Date("2026-04-07"),
      retentionD1: 62,
      retentionD7: 38,
      retentionD30: null,
      dau: 8400,
      avgSessionMin: 14.5,
      arpu: 0.48,
      conversionRate: 3.2,
      source: "manual",
      notes: "Week 1 snapshot",
    },
  });

  // Ensure AmplitudeConfig singleton exists
  await prisma.amplitudeConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
