---
'@molecule/api-ai-alibaba': minor
---

Report the upstream reason with each rejected 429/503 body, read exactly once, and stop retrying the documented `BudgetLimitExceeded` budget failure under a bounded retry budget.
