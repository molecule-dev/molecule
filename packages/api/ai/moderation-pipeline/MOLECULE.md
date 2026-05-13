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
npm install @molecule/api-ai-moderation-pipeline
```

## API

### Interfaces

#### `AuditLogRow`

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

```typescript
interface ModerationScore {
  category: ModerationCategory
  /** 0..1 confidence. */
  score: number
}
```

### Types

#### `ModerationAction`

```typescript
type ModerationAction = 'allow' | 'flag' | 'block' | 'redact'
```

#### `ModerationCategory`

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
