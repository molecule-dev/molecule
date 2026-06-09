# @molecule/app-feature-thread-tree-react

Nested comment tree with collapse / collapse-deep / parent-line indicator.

Exports the `<ThreadTree>` recursive renderer plus the `Comment` type
and `defaultCollapsedDepth` prop. Used by link-aggregator, blog comments,
podcast, video-streaming, ai-customer-service-bot, and rag-knowledge-base
apps.

## Quick Start

```tsx
import { ThreadTree } from '@molecule/app-feature-thread-tree-react'

<ThreadTree
  comments={comments}
  onReply={(id) => openReplyForm(id)}
  onUpvote={(id) => upvote(id)}
  defaultCollapsedDepth={4}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-thread-tree-react
```

## API

### Interfaces

#### `Comment`

A single comment node in the tree. Apps own the data shape — the
component reads `id`, `children`, and renders the rest via slots.

```typescript
interface Comment {
  /** Stable, unique identifier used as React key + collapse-state key. */
  id: string
  /** Author display name / handle. */
  author: ReactNode
  /** Body content. Plain string, or pre-rendered ReactNode for rich-text. */
  body: ReactNode
  /** ISO-8601 created-at timestamp. Optional — omit to hide the relative-time chip. */
  createdAt?: string
  /** Score / upvote count. Optional — omit to hide the count display. */
  score?: number
  /** Whether the current viewer has upvoted this comment. */
  upvoted?: boolean
  /** Direct child comments (the recursive payload). */
  children?: Comment[]
}
```

#### `ThreadTreeProps`

Props for `<ThreadTree>`.

```typescript
interface ThreadTreeProps {
  /** Top-level comments. Each may carry nested `children`. */
  comments: Comment[]
  /** Reply-button handler — receives the comment id. */
  onReply?: (commentId: string) => void
  /** Upvote-button handler — receives the comment id and the next state. */
  onUpvote?: (commentId: string, next: boolean) => void
  /** Optional handler called when a node is collapsed or expanded. */
  onCollapse?: (commentId: string, collapsed: boolean) => void
  /**
   * Comments at this depth (0-indexed) start collapsed by default.
   * Defaults to `4`. Pass `Infinity` to start fully expanded.
   */
  defaultCollapsedDepth?: number
  /** Extra classes appended to the outer wrapper. */
  className?: string
  /** `data-mol-id` selector for AI-agent interaction. */
  dataMolId?: string
}
```

### Functions

#### `ThreadTree(props, props, props, props, props, props, props, props)`

Recursive nested-comment tree with per-node collapse / expand,
depth-based indentation, and reply / upvote slots. Apps own the data;
the component handles rendering, collapse state, and event dispatch.

Intended for link-aggregator threads (HN-style), blog comments,
podcast / video comment sections, and AI-conversation transcripts
with branching replies.

All UI text resolves through `t()` so apps localise via the companion
`@molecule/app-locales-feature-thread-tree` package. All styling
resolves through `getClassMap()` — no Tailwind utilities live here.

```typescript
function ThreadTree({
  comments,
  onReply,
  onUpvote,
  onCollapse,
  defaultCollapsedDepth = DEFAULT_COLLAPSED_DEPTH,
  className,
  dataMolId,
}: ThreadTreeProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `props` — Component props.
- `props` — .comments - Top-level comments (each may carry `children`).
- `props` — .onReply - Reply-button handler.
- `props` — .onUpvote - Upvote-button handler.
- `props` — .onCollapse - Optional handler called on collapse / expand.
- `props` — .defaultCollapsedDepth - Depth at which nodes auto-collapse (default 4).
- `props` — .className - Extra classes appended to the outer wrapper.
- `props` — .dataMolId - `data-mol-id` selector for AI-agent interaction.

**Returns:** The rendered tree element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

All UI text resolves through `t()` — install
`@molecule/app-locales-feature-thread-tree` for non-English
locales. All styling resolves through `getClassMap()` — no Tailwind
utilities live in this package.

## Translations

Translation strings are provided by `@molecule/app-locales-feature-thread-tree`.
