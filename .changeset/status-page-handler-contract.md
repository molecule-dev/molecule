---
'@molecule/api-resource-status-page': patch
---

The package reference now states that `handlers.*` return `{ statusCode, headers?, body }` and never write to `res`, with the three lines that apply a result when a handler is called directly.
