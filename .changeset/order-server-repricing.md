---
'@molecule/api-resource-order': minor
---

`create()` now re-resolves unit prices server-side when the data store exposes a `products` table: catalog prices (honouring `product_variants` overrides) compute `subtotal`/`total` and are persisted on the order items, client-supplied `items[].price` is discarded, and items referencing products missing from the catalog are rejected with 400. When no `products` table exists the previous behavior (body prices) is unchanged; `discount`/`tax`/`shipping` remain client-supplied in both modes.
