import { hash } from "@node-rs/argon2";
import { db, schema, runMigrations } from "../apps/backend/src/db/index.js";
import { seedDefaultsIfEmpty } from "../apps/backend/src/db/seed.js";

async function main() {
  runMigrations();
  seedDefaultsIfEmpty();

  const existing = db.select().from(schema.users).all();
  if (existing.length > 0) {
    console.log("[demo] already has users, skipping");
    return;
  }

  const alexHash = await hash("demo");
  const samHash = await hash("demo");

  const [alex] = db.insert(schema.users).values({ displayName: "Alex", passwordHash: alexHash }).returning().all();
  const [sam] = db.insert(schema.users).values({ displayName: "Sam", passwordHash: samHash }).returning().all();

  const [joint] = db.insert(schema.cards).values({
    label: "Joint Sparebank1 Visa",
    lastFour: "1234",
    isShared: true,
    ownerUserId: null,
  }).returning().all();
  const [alexPersonal] = db.insert(schema.cards).values({
    label: "Alex personal",
    lastFour: "5678",
    isShared: false,
    ownerUserId: alex.id,
  }).returning().all();

  const cats = db.select().from(schema.categories).all();
  const pickCat = (name: string) => cats.find((c) => c.name === name)?.id ?? null;

  const rows: Array<{ date: string; amount: number; merchant: string; category: string; card: number; payer: number }> = [];

  const base = new Date();
  for (let m = 5; m >= 0; m--) {
    const month = new Date(base.getFullYear(), base.getMonth() - m, 1);
    const y = month.getFullYear(), mo = String(month.getMonth() + 1).padStart(2, "0");
    rows.push({ date: `${y}-${mo}-01`, amount: 123450, merchant: "Haugaland Kraft", category: "Power & Electricity", card: joint.id, payer: alex.id });
    rows.push({ date: `${y}-${mo}-04`, amount: 89900, merchant: "Rema 1000", category: "Groceries", card: joint.id, payer: alex.id });
    rows.push({ date: `${y}-${mo}-11`, amount: 54900, merchant: "Kiwi", category: "Groceries", card: joint.id, payer: sam.id });
    rows.push({ date: `${y}-${mo}-18`, amount: 74900, merchant: "IKEA", category: "Maintenance", card: joint.id, payer: alex.id });
    rows.push({ date: `${y}-${mo}-22`, amount: 21000, merchant: "Circle K", category: "Other", card: alexPersonal.id, payer: alex.id });
    rows.push({ date: `${y}-${mo}-28`, amount: 199900, merchant: "Telia", category: "Internet", card: joint.id, payer: alex.id });
  }

  for (const r of rows) {
    db.insert(schema.expenses).values({
      occurredOn: r.date,
      amount: r.amount,
      merchantName: r.merchant,
      categoryId: pickCat(r.category),
      cardId: r.card,
      paidByUserId: r.payer,
      split: { [alex.id]: 50, [sam.id]: 50 },
      source: "MANUAL",
    }).run();
  }

  console.log(`[demo] seeded Alex/Sam (password: "demo"), 2 cards, ${rows.length} expenses`);
}

main().catch((err) => { console.error(err); process.exit(1); });
