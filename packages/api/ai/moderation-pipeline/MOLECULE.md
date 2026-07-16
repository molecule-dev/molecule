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
npm install @molecule/api-ai-moderation-pipeline @molecule/api-ai @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation express zod
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

### Functions

#### `applyPolicy(scores, reasoning, policy?)`

Apply a policy to classifier scores → moderation decision.

```typescript
function applyPolicy(scores: ModerationScore[], reasoning: string, policy?: ModerationPolicy): ModerationDecision
```

#### `classify(content)`

Classify content using the bonded AI provider.

```typescript
function classify(content: string): Promise<{ scores: ModerationScore[]; reasoning: string; }>
```

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
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0
- `@molecule/api-ai` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`
- `express`
- `zod`

Tables: `src/__setup__/moderation_audit_log.sql` creates
`moderation_audit_log`. An mlcl-scaffolded API replays `__setup__/*.sql`
automatically on migrate; anywhere else run it once. Audit writes are
best-effort BY DESIGN (a DB failure never blocks the moderation decision) —
so with the table missing, decisions still return but no audit rows are
ever written, silently.

Requires a bonded `ai` chat provider (`@molecule/api-ai`) — `classify()` /
`moderate()` throw if none is bonded.

FAILS OPEN on classifier failure: malformed model output (and provider API
errors, which arrive as in-band `error` events) resolve to empty `scores`
with `reasoning: 'classifier returned malformed JSON'`, and `applyPolicy()`
then returns the policy's `defaultAction` (`'allow'` in `DEFAULT_POLICY`)
with `flagged: false`. If your app must fail closed, treat empty `scores`
(or that reasoning string) as a manual-review case instead of an allow.
