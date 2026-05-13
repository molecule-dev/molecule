CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "client_id" varchar(255) NOT NULL,
  "number" varchar(64) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'draft',
  "items" jsonb NOT NULL DEFAULT '[]',
  "subtotal" numeric(12, 2) NOT NULL DEFAULT 0,
  "tax_rate" numeric(5, 2) NOT NULL DEFAULT 0,
  "tax_amount" numeric(12, 2) NOT NULL DEFAULT 0,
  "total" numeric(12, 2) NOT NULL DEFAULT 0,
  "amount_paid" numeric(12, 2) NOT NULL DEFAULT 0,
  "currency" varchar(8) NOT NULL DEFAULT 'USD',
  "issue_date" date NOT NULL DEFAULT CURRENT_DATE,
  "due_date" date,
  "paid_at" timestamptz,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "invoices_user_id_index" ON "invoices" ("user_id");
CREATE INDEX IF NOT EXISTS "invoices_client_id_index" ON "invoices" ("client_id");
CREATE INDEX IF NOT EXISTS "invoices_status_index" ON "invoices" ("status");
CREATE INDEX IF NOT EXISTS "invoices_issue_date_index" ON "invoices" ("issue_date");
