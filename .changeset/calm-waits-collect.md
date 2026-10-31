---
'@molecule/api-ai-tools': minor
---

Add an optional `waitBudgetMs` so hosts can collect long background tasks in one `wait_for_task` call without changing foreground command budgets.
