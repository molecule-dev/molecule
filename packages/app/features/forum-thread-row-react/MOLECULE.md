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
npm install @molecule/app-forum-thread-row-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
