# @molecule/api-resource-ai-models

## 1.2.3

### Patch Changes

- DeepSeek pro and flash now carry their August 2026 rates, with peak pricing live in place of the staged schedule.

## 1.2.2

### Patch Changes

- 97b3423: Record the 2026-08-15 re-verification of the Qwen3.8 Max US re-host rates, and why DeepInfra's open-weight `Qwen3.8-2.4T-A95B` is deliberately not carried alongside it.

## 1.2.1

### Patch Changes

- 5105f6b: Catalog refresh: corrected US re-host rates (minimax-m3, qwen max models), deepseek-v4-flash defaults to its US re-host, peak surcharges only bill on the native provider, and notes for DeepInfra's -0813 snapshot pricing.

## 1.2.0

### Minor Changes

- 8dcc4f3: Model definitions can stage an announced price change with `scheduledPricing`: a dated rate card that replaces the base rates from its `effectiveFrom` instant. Pricing resolves per request, so the catalog is correct on both sides of a switch without an edit landed at the moment it takes effect. `GET /ai/models` serves whichever rates are billing now. DeepSeek V4 Pro and Flash carry the provider's 2026-08-16 rise, including its peak-hour windows. New exports: `effectiveBaseRates`, `effectivePeakPricing`, `withEffectivePricing`; `modelRegionRates` takes an optional instant.

## 1.1.0

### Minor Changes

- cda70ae: Model definitions accept `supersededBy`, naming the newer-generation model that replaces an older one. Superseded models are excluded from `MODEL_IDS`, `getAvailableModels()`, `GET /ai/models` and the client picker helpers — so only the newest generation of a family is offered — while `getModel()` still returns them so saved selections and past usage stay priceable. New helpers: `isSelectableModel()` and `resolveSelectableModelId()` (server), `isSelectableModel()` (client). The Alibaba AI bond now defaults to `qwen3.8-max`.

### Patch Changes

- a8b91df: Kimi K3 is now available in the US processing region and defaults to it, priced at $2.85/$14.25 per MTok with cache reads at $0.285 — cheaper than the native host on every axis, with the full 1M context. Kimi K2.7 Code's US rates were re-verified and corrected to $0.68/$3.40 (cache reads $0.136). Every multi-region model's default region is now the cheapest one for real agentic traffic, enforced by a test.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-resource@1.0.1
