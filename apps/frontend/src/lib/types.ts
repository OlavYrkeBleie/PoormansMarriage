export interface User { id: number; displayName: string }
export interface Card {
  id: number;
  ownerUserId: number | null;
  label: string;
  lastFour: string | null;
  isShared: boolean;
}
export interface Category {
  id: number;
  name: string;
  group: "FIXED" | "MAINTENANCE" | "DAILY" | "OTHER";
  defaultSplit: Record<string, number>;
  requiresReceipt: boolean;
  icon: string | null;
  color: string | null;
}
export interface Expense {
  id: number;
  occurredOn: string;
  amount: number;
  currency: string;
  merchantName: string | null;
  categoryId: number | null;
  cardId: number | null;
  paidByUserId: number | null;
  split: Record<string, number>;
  source: "RECEIPT_SCAN" | "BANK_IMPORT" | "MANUAL" | "RECURRING_BILL";
  receiptId: number | null;
  bankTransactionId: number | null;
  notes: string | null;
  isReconciled: boolean;
  excluded: boolean;
}
export interface Receipt {
  id: number;
  imagePath: string;
  uploadedByUserId: number | null;
  uploadedAt: number;
  ocrText: string | null;
  ocrConfidence: number | null;
  parsedTotal: number | null;
  parsedDate: string | null;
  parsedCardLastFour: string | null;
  parsedMerchant: string | null;
  status: "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";
}
export interface BankTransaction {
  id: number;
  transactionDate: string;
  amount: number;
  rawDescription: string;
  cardLastFour: string | null;
  matchedExpenseId: number | null;
  matchStatus: "UNMATCHED" | "AUTO_MATCHED" | "MANUAL_MATCHED" | "NO_RECEIPT_REQUIRED" | "MISSING_RECEIPT";
}
export interface Balance {
  userId: number;
  displayName: string;
  paid: number;
  owed: number;
  net: number;
}
export interface SettlementProposal {
  periodStart: string;
  periodEnd: string;
  breakdown: Balance[];
  fromUserId: number | null;
  toUserId: number | null;
  amount: number;
}
export interface RecurringBill {
  id: number;
  name: string;
  categoryId: number | null;
  expectedAmount: number | null;
  cadence: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  split: Record<string, number> | null;
  nextExpectedDate: string | null;
  active: boolean;
}
export interface Merchant {
  id: number;
  namePattern: string;
  defaultCategoryId: number | null;
}
export interface Checkpoint {
  id: number;
  occurredOn: string;
  label: string;
  amount: number;
  categoryId: number | null;
  notes: string | null;
}
export interface TrendPoint { date: string; daily: number; cumulative: number }
export interface MonthlyPoint { month: string; total: number }
export interface TrendSeries {
  daily: TrendPoint[];
  monthly: MonthlyPoint[];
  firstDate: string | null;
  lastDate: string | null;
  totalAmount: number;
}
export interface PaybackResult {
  checkpointId: number;
  label: string;
  occurredOn: string;
  amount: number;
  categoryId: number | null;
  preSlopePerMonth: number | null;
  postSlopePerMonth: number | null;
  savingsPerMonth: number | null;
  paybackMonths: number | null;
  paybackDate: string | null;
  sampleMonthsPre: number;
  sampleMonthsPost: number;
  note: string | null;
}
