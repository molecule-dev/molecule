# @molecule/api-analytics-axiom

## 1.0.1

### Patch Changes

- 9ce3bc3: A 200 that reports rejected events counts only the stored ones as sent, shutdown drains the queue and reports what was lost, ingest after shutdown is counted as dropped, and Retry-After on 429/503 is honoured.

## 1.0.0

### Major Changes

- Adds @molecule/api-analytics-axiom, an analytics provider that batches tracked events into an Axiom dataset without blocking the caller.
