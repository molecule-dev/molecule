---
'@molecule/api-resource-order': patch
---

`order_items` records the order its lines were submitted in, in a new `position` column written by `create()`, and every read of that table orders by it (`ORDER_ITEMS_IN_ORDER`). `Order.items` therefore comes back in the submitted order rather than in whatever order the database's `orderId` index returns. `src/__setup__/orders_position.sql` adds the column to a database whose `order_items` predates it.
