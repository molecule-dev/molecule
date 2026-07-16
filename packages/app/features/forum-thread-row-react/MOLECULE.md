# @molecule/app-forum-thread-row-react

Forum / discussion-board thread row — title, optional excerpt, vote score,
reply/view counts, pin/lock badges, author, timestamp, and an optional
`voteControls` slot for inline up/down buttons.

## Quick Start

```tsx
import { ForumThreadRow } from '@molecule/app-forum-thread-row-react'

const thread = { id: 't1', title: 'How do I reset my password?' }

<ForumThreadRow
  title={thread.title}
  excerpt="I tried the forgot-password link but never received an email."
  voteScore={42}
  replyCount={7}
  viewCount={320}
  author="alice"
  createdAt="2 hours ago"
  onClick={() => console.log('open thread', thread.id)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-forum-thread-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ForumThreadRowProps`

```typescript
interface ForumThreadRowProps {
  title: ReactNode
  /** Optional snippet of the OP body. */
  excerpt?: ReactNode
  /** Aggregate vote score / upvotes. */
  voteScore?: number
  /** Reply count. */
  replyCount?: number
  /** View count. */
  viewCount?: number
  /** Optional pinned indicator. */
  pinned?: boolean
  /** Optional locked indicator. */
  locked?: boolean
  /** Author display. */
  author?: ReactNode
  /** Created-at display (relative or absolute). */
  createdAt?: ReactNode
  /** Tag chips. */
  tags?: ReactNode
  /** Right-side voting controls slot. */
  voteControls?: ReactNode
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `ForumThreadRow(props)`

Forum / discussion-board thread row. Shows the title, optional
excerpt, vote score + reply/view counts, pin/lock badges, author,
and timestamp. Pass `voteControls` to render up/down buttons inline.

```typescript
function ForumThreadRow({
  title,
  excerpt,
  voteScore,
  replyCount,
  viewCount,
  pinned,
  locked,
  author,
  createdAt,
  tags,
  voteControls,
  onClick,
  className,
}: ForumThreadRowProps): ReactNode
```

- `props` — Component props (see {@link ForumThreadRowProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

- Styling routes through `getClassMap()` — a ClassMap bond
  (e.g. `@molecule/app-ui-tailwind`) must be wired or rendering throws.
- KNOWN GAP: the counter labels ("votes", "replies", "views") and the
  pin/lock aria-labels are hardcoded English (there is no companion locale
  bond yet). For localized apps, pass pre-formatted content via `tags` /
  `voteControls` or wrap the row until the package routes text through `t()`.
- The row has no `data-mol-id` support yet; add your own wrapper attribute
  if AI-agent/e2e selectors need to target it.
