---
'@molecule/api-database': patch
---

`findMany`'s documentation now states the row order is unspecified unless `orderBy` is given: a `where` on an indexed column (`articleId`, `orderId`, `userId`) is answered from that index, so the rows come back in the index's order — not the order they were inserted in. Pass `orderBy` for every list whose order matters (`orderBy: [{ field: 'createdAt', direction: 'desc' }]`), and when no column encodes the intended order, store one (a `position` integer written from the array index).
