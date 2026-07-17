# @molecule/api-ai-moderation-pipeline

`@molecule/api-ai-moderation-pipeline` — content moderation built on
the bonded AI provider. Classify → policy-match → action → audit-log.

Extracted from ai-content-moderator flagship.

## Quick Start

```ts
import { moderate, DEFAULT_POLICY } from '@molecule/api-ai-moderation-pipeline'

const decision = await moderate({
  content: userComment,
  ownerId: userId,
  resource: { type: 'comment', id: commentId },
})
if (decision.action === 'block') return res.status(403).end()
if (decision.action === 'flag') void notifyMods(decision)
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-ai-moderation-pipeline @molecule/api-ai @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-middleware-validation express zod
npm install -D @types/express
```

## API

### Interfaces

#### `AuditLogRow`

Database row shape for a single moderation audit-log entry.

```typescript
interface AuditLogRow {
  id: string
  owner_id: string | null
  content_excerpt: string
  decision: ModerationAction
  matched_category: ModerationCategory | null
  scores: ModerationScore[]
  reasoning: string
  resource_type: string | null
  resource_id: string | null
  created_at: string | Date
}
```

#### `ClassificationResult`

Result of a single classification attempt against the bonded AI provider.

```typescript
interface ClassificationResult {
  scores: ModerationScore[]
  reasoning: string
  /**
   * Set when the classifier FAILED to produce a usable signal — a provider
   * error/timeout, an in-band `error` event, or malformed model output. When
   * present, `scores` is empty; the pipeline routes per `policy.onError`
   * instead of treating the empty scores as an allow. `moderate()` handles this
   * for you; direct `classify()` callers MUST check `error` before trusting an
   * empty-scores result.
   */
  error?: Error
}
```

#### `ModerationDecision`

Final verdict returned by the pipeline for a piece of content.

```typescript
interface ModerationDecision {
  action: ModerationAction
  scores: ModerationScore[]
  reasoning: string
  /** Most severe matched category, if any. */
  matched_category: ModerationCategory | null
  /** True if any non-safe category exceeded its policy threshold. */
  flagged: boolean
  /**
   * True when this decision came from a classifier FAILURE routed through
   * `policy.onError` (no real moderation signal), rather than a real verdict.
   * Lets callers/audits distinguish a fail-safe `'flag'`/`'block'` from a
   * genuine one. Absent (undefined) on normal decisions.
   */
  errored?: boolean
}
```

#### `ModerationPolicy`

Per-category thresholds and actions that govern moderation decisions.

```typescript
interface ModerationPolicy {
  /** Threshold per category — content above this score triggers the action. */
  thresholds: Partial<Record<ModerationCategory, number>>
  /** What action to take when any threshold is exceeded. */
  action: ModerationAction
  /** Default action when no threshold is exceeded. */
  defaultAction?: ModerationAction
  /**
   * What to do when classification FAILS (provider error/timeout or malformed
   * output) — i.e. when there is no real moderation signal. Defaults to
   * `'flag'` (route to human review) so a transient classifier blip never
   * silently ALLOWS un-moderated content. Set `'allow'` to explicitly opt into
   * fail-open, or `'block'` to fail closed. When omitted, the
   * `MODERATION_ON_ERROR` env var is consulted, then falls back to `'flag'`.
   */
  onError?: ModerationErrorAction
}
```

#### `ModerationScore`

Per-category confidence score produced by a moderation classifier.

```typescript
interface ModerationScore {
  category: ModerationCategory
  /** 0..1 confidence. */
  score: number
}
```

### Types

#### `ModerationAction`

Action the pipeline takes after evaluating content against policy.

```typescript
type ModerationAction = 'allow' | 'flag' | 'block' | 'redact'
```

#### `ModerationCategory`

Content category assigned by the moderation pipeline.

```typescript
type ModerationCategory =
  | 'hate'
  | 'harassment'
  | 'sexual'
  | 'self_harm'
  | 'violence'
  | 'illegal'
  | 'spam'
  | 'misinformation'
  | 'pii'
  | 'safe'
```

#### `ModerationErrorAction`

Action taken when the classifier itself FAILS to produce a usable signal —
a provider error/timeout, an in-band `error` event, or malformed model output.
There is no real moderation verdict in that case, so the pipeline routes per
this policy instead of silently allowing un-moderated content.

- `'flag'` — route to human review (safe default; never a silent allow).
- `'block'` — fail closed (deny the content).
- `'allow'` — explicit opt-in to fail OPEN (content passes un-moderated).

```typescript
type ModerationErrorAction = 'allow' | 'flag' | 'block'
```

### Functions

#### `applyPolicy(scores, reasoning, policy?)`

Apply a policy to classifier scores → moderation decision.

```typescript
function applyPolicy(scores: ModerationScore[], reasoning: string, policy?: ModerationPolicy): ModerationDecision
```

#### `classify(content)`

Classify content using the bonded AI provider.

On a provider error/timeout, an in-band `error` stream event, or malformed
model output, this resolves to empty `scores` with `error` set — it does NOT
throw and does NOT fabricate a benign result. `moderate()` routes that
failure per `policy.onError`; direct callers MUST check `result.error` before
trusting an empty-scores result (an empty result with no `error` means the
model genuinely scored everything at 0).

```typescript
function classify(content: string): Promise<ClassificationResult>
```

- `content` — The content to classify.

**Returns:** The classification result — scores + reasoning, or `error` on failure.

#### `moderate(opts)`

Full pipeline — classify + decide + audit. Returns the decision.

```typescript
function moderate(opts: { content: string; policy?: ModerationPolicy; ownerId?: string | null; resource?: { type: string; id: string; }; audit?: boolean; }): Promise<ModerationDecision>
```

### Constants

#### `DEFAULT_POLICY`

Default moderation policy applied when no explicit policy is provided.

```typescript
const DEFAULT_POLICY: ModerationPolicy
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0
- `@molecule/api-ai` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-middleware-validation`
- `express`
- `zod`

Tables: `src/__setup__/moderation_audit_log.sql` creates
`moderation_audit_log`. An mlcl-scaffolded API replays `__setup__/*.sql`
automatically on migrate; anywhere else run it once. Audit writes are
best-effort (a DB failure never blocks the moderation decision) but are NO
LONGER silent: a failed write is logged via `logger.warn({ error })`, so a
missing table surfaces in logs instead of vanishing.

Requires a bonded `ai` chat provider (`@molecule/api-ai`) — `classify()` /
`moderate()` throw if none is bonded (a misconfiguration, surfaced loudly).

FAILS SAFE on classifier failure. When the classifier can't produce a signal
— a provider error/timeout, an in-band `error` stream event, or malformed
model output — `classify()` returns empty `scores` WITH `error` set, and
`moderate()` routes per `policy.onError`, ALWAYS logging the failure via
`logger.error({ error })`. `onError` defaults to `'flag'` (route to human
review — never a silent allow); set `'block'` to fail closed or `'allow'` to
explicitly opt into fail-open. The env var `MODERATION_ON_ERROR` overrides
the default when a policy omits `onError`. Such decisions carry
`errored: true`. Direct `classify()` callers (bypassing `moderate()`) MUST
check `result.error` before trusting empty `scores`.
