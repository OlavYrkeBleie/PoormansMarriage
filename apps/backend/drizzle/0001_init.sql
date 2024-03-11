CREATE TABLE IF NOT EXISTS `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `display_name` text NOT NULL,
  `password_hash` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `cards` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_user_id` integer REFERENCES users(id),
  `label` text NOT NULL,
  `last_four` text,
  `is_shared` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `categories` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `group` text NOT NULL,
  `default_split` text NOT NULL,
  `requires_receipt` integer NOT NULL DEFAULT 1,
  `icon` text,
  `color` text
);

CREATE TABLE IF NOT EXISTS `merchants` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name_pattern` text NOT NULL,
  `default_category_id` integer REFERENCES categories(id),
  `learned_from_user_id` integer REFERENCES users(id),
  `created_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `occurred_on` text NOT NULL,
  `amount` integer NOT NULL,
  `currency` text NOT NULL DEFAULT 'NOK',
  `merchant_name` text,
  `category_id` integer REFERENCES categories(id),
  `card_id` integer REFERENCES cards(id),
  `paid_by_user_id` integer REFERENCES users(id),
  `split` text NOT NULL,
  `source` text NOT NULL,
  `receipt_id` integer,
  `bank_transaction_id` integer,
  `notes` text,
  `is_reconciled` integer NOT NULL DEFAULT 0,
  `excluded` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE INDEX IF NOT EXISTS `expenses_occurred_on_idx` ON `expenses` (`occurred_on`);
CREATE INDEX IF NOT EXISTS `expenses_category_idx` ON `expenses` (`category_id`);

CREATE TABLE IF NOT EXISTS `receipts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `image_path` text NOT NULL,
  `uploaded_by_user_id` integer REFERENCES users(id),
  `uploaded_at` integer NOT NULL,
  `ocr_text` text,
  `ocr_confidence` integer,
  `parsed_total` integer,
  `parsed_date` text,
  `parsed_card_last_four` text,
  `parsed_merchant` text,
  `status` text NOT NULL DEFAULT 'PENDING_REVIEW'
);

CREATE TABLE IF NOT EXISTS `bank_transactions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `imported_from` text NOT NULL,
  `imported_at` integer NOT NULL,
  `transaction_date` text NOT NULL,
  `amount` integer NOT NULL,
  `raw_description` text NOT NULL,
  `card_last_four` text,
  `matched_expense_id` integer REFERENCES expenses(id),
  `match_status` text NOT NULL DEFAULT 'UNMATCHED',
  `dedupe_hash` text NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS `bank_tx_status_idx` ON `bank_transactions` (`match_status`);
CREATE INDEX IF NOT EXISTS `bank_tx_date_idx` ON `bank_transactions` (`transaction_date`);

CREATE TABLE IF NOT EXISTS `recurring_bills` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `category_id` integer REFERENCES categories(id),
  `expected_amount` integer,
  `cadence` text NOT NULL,
  `split` text,
  `next_expected_date` text,
  `active` integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS `settlements` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `period_start` text NOT NULL,
  `period_end` text NOT NULL,
  `from_user_id` integer NOT NULL REFERENCES users(id),
  `to_user_id` integer NOT NULL REFERENCES users(id),
  `amount` integer NOT NULL,
  `status` text NOT NULL DEFAULT 'PENDING',
  `settled_at` integer,
  `notes` text,
  `created_at` integer NOT NULL
);
