-- Line-item order on an order: the column "order_items"."position" keeps the
-- order the items were submitted in, so a reader of this table (the read/list/
-- cancel/updateStatus handlers, an app's own query) gets them in that order
-- instead of the database's arbitrary row order. `where "orderId" = ?` hits
-- "idx_order_items_orderId", so without this column the rows come back in the
-- index's order — not the order the customer submitted.
--
-- Why this is its own file: a database that already applied orders.sql never
-- re-runs it — "_molecule_migrations" records each setup file once — so the
-- column cannot be delivered by editing that file alone. This file is new, so it
-- runs on every database that has the table, whether it was created before or
-- after the column existed.
--
-- The CREATE repeats orders.sql's "order_items" (see the test that keeps the two
-- in step). In a scaffolded app it is a no-op — orders.sql sorts first and has
-- already created the table, so the column below is what this file is for — and
-- it is what lets the scaffolding tool find the file at all: a setup file is
-- copied into a project through the table it declares.
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES "orders" ("id") ON DELETE CASCADE,
  "productId" VARCHAR(255) NOT NULL,
  "variantId" VARCHAR(255),
  "name" VARCHAR(255) NOT NULL,
  "price" NUMERIC(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "image" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0
);

-- The upgrade for a database whose "order_items" predates the column. Every
-- database bond accepts this form: Postgres and PGlite take the clause natively,
-- and the SQLite and MySQL bonds apply the statement only when the column is not
-- there yet.
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
