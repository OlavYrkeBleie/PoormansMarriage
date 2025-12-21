CREATE TABLE IF NOT EXISTS `checkpoints` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `occurred_on` text NOT NULL,
  `label` text NOT NULL,
  `amount` integer NOT NULL,
  `category_id` integer REFERENCES categories(id),
  `notes` text,
  `created_at` integer NOT NULL
);
CREATE INDEX IF NOT EXISTS `checkpoints_occurred_on_idx` ON `checkpoints` (`occurred_on`);
