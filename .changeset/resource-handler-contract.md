---
'@molecule/api-resource': patch
---

The package reference now states the handler contract up front: a handler returns `{ statusCode, headers?, body }` and never writes to `res`, so `createRequestHandler` is what applies it — with the three lines to write when a handler is called directly.
