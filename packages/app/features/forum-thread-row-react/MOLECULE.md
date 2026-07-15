# @molecule/app-forum-thread-row-react

Forum / discussion thread row.

Exports `<ForumThreadRow>`.

## Quick Start

```tsx
import { ForumThreadRow } from '@molecule/app-forum-thread-row-react'

<ForumThreadRow
  title="How do I reset my password?"
  excerpt="I tried the forgot-password link but never received an email."
  voteScore={42}
  replyCount={7}
  viewCount={320}
  author="alice"
  createdAt="2 hours ago"
  onClick={() => navigate(`/threads/${thread.id}`)}
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

### Functions

#### `ForumThreadRow(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .title
- `root0` — .excerpt
- `root0` — .voteScore
- `root0` — .replyCount
- `root0` — .viewCount
- `root0` — .pinned
- `root0` — .locked
- `root0` — .author
- `root0` — .createdAt
- `root0` — .tags
- `root0` — .voteControls
- `root0` — .onClick
- `root0` — .className

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
