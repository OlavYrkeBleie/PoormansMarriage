import { db, runMigrations, schema } from "./index.js";

const DEFAULT_CATEGORIES: Array<Omit<typeof schema.categories.$inferInsert, "id">> = [
  { name: "Power & Electricity", group: "FIXED", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: false, icon: null, color: "#c47a00" },
  { name: "Water", group: "FIXED", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: false, icon: null, color: "#2a7ab0" },
  { name: "Gas/Heating", group: "FIXED", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: false, icon: null, color: "#b53a3a" },
  { name: "Internet", group: "FIXED", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: false, icon: null, color: "#4a5cb8" },
  { name: "Garbage", group: "FIXED", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: false, icon: null, color: "#5a7a3a" },
  { name: "Insurance", group: "FIXED", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: false, icon: null, color: "#6c43a6" },
  { name: "Rent / Mortgage", group: "FIXED", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: false, icon: null, color: "#3f4a5c" },
  { name: "Groceries", group: "DAILY", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: true, icon: null, color: "#2b7a3e" },
  { name: "Household supplies", group: "DAILY", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: true, icon: null, color: "#148a7a" },
  { name: "Takeout / Dining", group: "DAILY", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: true, icon: null, color: "#c55a14" },
  { name: "Maintenance", group: "MAINTENANCE", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: true, icon: null, color: "#4a5366" },
  { name: "Garden", group: "MAINTENANCE", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: true, icon: null, color: "#336a2a" },
  { name: "Transport", group: "DAILY", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: true, icon: null, color: "#5a5fa8" },
  { name: "Other", group: "OTHER", defaultSplit: { "1": 50, "2": 50 }, requiresReceipt: true, icon: null, color: "#6a7280" },
];

export function seedDefaultsIfEmpty() {
  const existing = db.select().from(schema.categories).all();
  if (existing.length > 0) return;
  for (const c of DEFAULT_CATEGORIES) {
    db.insert(schema.categories).values(c).run();
  }
  console.log(`[seed] inserted ${DEFAULT_CATEGORIES.length} default categories`);
}

const invokedDirectly = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (invokedDirectly) {
  runMigrations();
  seedDefaultsIfEmpty();
  console.log("[seed] done");
}
