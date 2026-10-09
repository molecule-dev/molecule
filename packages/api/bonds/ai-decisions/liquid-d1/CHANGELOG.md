# @molecule/api-ai-decisions-liquid-d1

## 1.1.1

### Patch Changes

- 3886ca8: Registers `LIQUID_BASE_URL` (the hosted-API gateway override) with the secrets registry, so the boot-time configuration report lists it like the bond's other environment variables.
- 1350e9c: A missing answer for a question whose id is `"__proto__"` now raises the usual "no answer for question" error instead of being fabricated into a zero-confidence answer.
- 4572e6e: Every request now carries a deadline (30 s by default, `timeoutMs` config), so a connection that never answers fails instead of leaving `decide()` pending forever. The caller's `signal` and the deadline both apply, whichever fires first.
- c33a2aa: Retries cancel the failed response body before backing off (no stranded sockets), and the `headers` hook is re-resolved on every attempt so short-lived tokens are re-minted. A 2xx response with a non-JSON body fails with a status-carrying error instead of a raw `SyntaxError`. Configuration is resolved on each call, so keys the secrets registry writes into the environment after startup are picked up without a restart.

## 1.1.0

### Minor Changes

- a708eb8: Adds @molecule/api-ai-decisions-liquid-d1, a Liquid d1 decision-model provider for @molecule/api-ai-decisions — typed choice/score/yes-no answers with images, hosted at api.liquid.ai or self-hosted via llama-server (REST via fetch, zero dependencies).
