# @molecule/api-resource-ai-models

## 1.9.0

### Minor Changes

- 1412226: Add `webSearchPricePer1k` to price web searches; enable web search on OpenAI models and remove it from Zhipu GLM models, where it never runs alongside function tools.

## 1.8.0

### Minor Changes

- b703490: Add `gpt-6-astra`.

## 1.7.0

### Minor Changes

- 79524c5: Adds `gpt-6-sol` ($2/$10) and `gpt-6-luna` ($0.10/$0.50). The GPT-5.6 models are superseded by them and stay priced but are no longer selectable.
- 9bb996f: Adds `rejectsForcedToolChoice` and `rejectsTemperature` to model definitions and sets them on the Claude, Kimi and other models whose providers reject a forced tool choice or a caller-chosen temperature. `deepseek-v4-pro` is offered again.
- 552bc23: Peak pricing can exclude dates (`peakPricing.excludedDatesUtc`), and the DeepSeek models exclude Chinese public holidays, which DeepSeek bills off-peak. `peakPricing.rule` records the provider's own peak-hours sentence and where it is published.
- 969d4e8: Adds glm-5.3-flashx ($0.37/$1.25).

### Patch Changes

- a659817: Keeps deepseek-v4-pro at its V4-Pro rates ($0.66/$1.98, cache read $0.022) after DeepSeek withdrew the planned 2026-09-14 switch to V4.1 Flash pricing.

## 1.6.3

### Patch Changes

- 04d3f3b: Docs: records why `gpt-6-astra` is not in the catalog.

## 1.6.1

### Patch Changes

- Offers a `us` region for `deepseek-flash` (DeepSeek V4.1 Flash on the DeepInfra re-host, with its rate card) beside the native default.

## 1.6.0

### Minor Changes

- Adds DeepSeek V4.1 Flash (`deepseek-flash` — multimodal, cn-native, 1M context) as the go-forward flash id and free-tier default; deprecates `deepseek-v4-pro` (routes to V4.1 Flash at Flash prices from 2026-09-14 upstream) and the retired `deepseek-v4-flash` id, whose native card now carries the V4.1 rates; removes gpt-5.6-luna's free-tier region carve-out.

## 1.5.1

### Patch Changes

- 22c43d9: Update deepseek-v4-flash US-region pricing to $0.06 / $0.18 per million tokens (cache read $0.015).

## 1.5.0

### Minor Changes

- Add gemini-3.8-flash and deprecate gemini-3.7-flash; record the DeepInfra US region for glm-5.3.

## 1.4.0

### Minor Changes

- d65d436: Adds `claude-fable-5-1` (Anthropic's current latest; same $10/$50 per MTok as `claude-fable-5`, with $0.25/MTok cache reads) and marks `claude-fable-5` as legacy. `claude-sonnet-5` is now listed at its standard $2/$10 rate. Model ids with a dash-separated minor version (e.g. `claude-fable-5-1`) now parse as a newer generation of their family instead of a sibling.
- 1491a42: Peak-hour pricing windows can be restricted to certain UTC weekdays (`peakPricing.windows[].daysOfWeekUtc`), and the DeepSeek entries now carry the Monday-through-Friday qualifier their rate card publishes, so weekend hours inside those windows no longer meter at the peak multiplier. The `/models` picker labels a weekday-only window with the days it applies on.

## 1.3.0

### Minor Changes

- 77b62e0: Add qwen3.8-flash (Alibaba's low-cost tier: 1M context, 131K output, multimodal input, hybrid thinking; native host); correct qwen3.8-max's implicit cache-read price.

## 1.2.7

### Patch Changes

- b8d9929: Correct the Anthropic `codeExecutionToolType` to the current `code_execution_20260521` (the previous value was a beta-header date, not a tool type) and remove `webSearchToolType` from OpenAI entries — the chat-completions endpoint the OpenAI provider uses has no such tool type, so advertising it surfaced a capability that could never work.

## 1.2.6

### Patch Changes

- c113381: Add GLM-5.3 Flash (zhipu): native multimodal, 1M context, 128K output, low/high/max reasoning, served in us + cn regions.

## 1.2.5

### Patch Changes

- Make gpt-5.6-luna the free-tier planner and drop minimax-m3's stale free-tier region carve-out.

## 1.2.4

### Patch Changes

- eebd6ac: Mark `gpt-5.6-luna` free-tier plan-eligible in the `us` region (`freeTierRegions: ['us']`), so it can serve as a free-tier plan-mode default and free users may select it in plan mode.

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
