import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const cards = sqliteTable("cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerUserId: integer("owner_user_id").references(() => users.id),
  label: text("label").notNull(),
  lastFour: text("last_four"),
  isShared: integer("is_shared", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  group: text("group", { enum: ["FIXED", "MAINTENANCE", "DAILY", "OTHER"] }).notNull(),
  defaultSplit: text("default_split", { mode: "json" }).$type<Record<string, number>>().notNull(),
  requiresReceipt: integer("requires_receipt", { mode: "boolean" }).notNull().default(true),
  icon: text("icon"),
  color: text("color"),
});

export const merchants = sqliteTable("merchants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  namePattern: text("name_pattern").notNull(),
  defaultCategoryId: integer("default_category_id").references(() => categories.id),
  learnedFromUserId: integer("learned_from_user_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    occurredOn: text("occurred_on").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("NOK"),
    merchantName: text("merchant_name"),
    categoryId: integer("category_id").references(() => categories.id),
    cardId: integer("card_id").references(() => cards.id),
    paidByUserId: integer("paid_by_user_id").references(() => users.id),
    split: text("split", { mode: "json" }).$type<Record<string, number>>().notNull(),
    source: text("source", {
      enum: ["RECEIPT_SCAN", "BANK_IMPORT", "MANUAL", "RECURRING_BILL"],
    }).notNull(),
    receiptId: integer("receipt_id"),
    bankTransactionId: integer("bank_transaction_id"),
    notes: text("notes"),
    isReconciled: integer("is_reconciled", { mode: "boolean" }).notNull().default(false),
    excluded: integer("excluded", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => ({
    byDate: index("expenses_occurred_on_idx").on(t.occurredOn),
    byCategory: index("expenses_category_idx").on(t.categoryId),
  }),
);

export const receipts = sqliteTable("receipts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  imagePath: text("image_path").notNull(),
  uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  ocrText: text("ocr_text"),
  ocrConfidence: integer("ocr_confidence"),
  parsedTotal: integer("parsed_total"),
  parsedDate: text("parsed_date"),
  parsedCardLastFour: text("parsed_card_last_four"),
  parsedMerchant: text("parsed_merchant"),
  status: text("status", { enum: ["PENDING_REVIEW", "CONFIRMED", "REJECTED"] })
    .notNull()
    .default("PENDING_REVIEW"),
});

export const bankTransactions = sqliteTable(
  "bank_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    importedFrom: text("imported_from").notNull(),
    importedAt: integer("imported_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    transactionDate: text("transaction_date").notNull(),
    amount: integer("amount").notNull(),
    rawDescription: text("raw_description").notNull(),
    cardLastFour: text("card_last_four"),
    matchedExpenseId: integer("matched_expense_id").references(() => expenses.id),
    matchStatus: text("match_status", {
      enum: ["UNMATCHED", "AUTO_MATCHED", "MANUAL_MATCHED", "NO_RECEIPT_REQUIRED", "MISSING_RECEIPT"],
    }).notNull().default("UNMATCHED"),
    dedupeHash: text("dedupe_hash").notNull().unique(),
  },
  (t) => ({
    byStatus: index("bank_tx_status_idx").on(t.matchStatus),
    byDate: index("bank_tx_date_idx").on(t.transactionDate),
  }),
);

export const recurringBills = sqliteTable("recurring_bills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  expectedAmount: integer("expected_amount"),
  cadence: text("cadence", { enum: ["MONTHLY", "QUARTERLY", "ANNUAL"] }).notNull(),
  split: text("split", { mode: "json" }).$type<Record<string, number>>(),
  nextExpectedDate: text("next_expected_date"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const checkpoints = sqliteTable("checkpoints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  occurredOn: text("occurred_on").notNull(),
  label: text("label").notNull(),
  amount: integer("amount").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const settlements = sqliteTable("settlements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  fromUserId: integer("from_user_id").references(() => users.id).notNull(),
  toUserId: integer("to_user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["PENDING", "SETTLED"] }).notNull().default("PENDING"),
  settledAt: integer("settled_at", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type RecurringBill = typeof recurringBills.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
export type Checkpoint = typeof checkpoints.$inferSelect;
