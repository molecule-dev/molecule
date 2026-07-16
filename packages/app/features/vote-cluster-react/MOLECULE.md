# @molecule/app-vote-cluster-react

Reddit/HN-style vote cluster — stacked up/down arrows + score readout.

Used by link-aggregator and news-aggregator templates, and composable
inside `@molecule/app-forum-thread-row-react`. Toggle semantics handle
upvote, downvote, and "click again to clear" optimistic flows. All UI
text flows through `t()` with translations supplied by the companion
`@molecule/app-locales-vote-cluster` package.

## Quick Start

```tsx
import { useState } from 'react'

import { VoteCluster, type VoteValue } from '@molecule/app-vote-cluster-react'

function PostRow({ post }: { post: { id: string; score: number; myVote?: VoteValue } }) {
  const [score, setScore] = useState(post.score)
  const [myVote, setMyVote] = useState<VoteValue>(post.myVote ?? 0)
  return (
    <VoteCluster
      score={score}
      myVote={myVote}
      onVote={(next) => {
        setScore(score - myVote + next)
        setMyVote(next)
        void fetch(`/api/posts/${post.id}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote: next }),
        })
      }}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-vote-cluster-react @molecule/app-i18n @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `VoteClusterProps`

Props for {@link VoteCluster}.

```typescript
interface VoteClusterProps {
  /** Current score (number to display between the arrows). */
  score: number
  /**
   * The viewer's current vote.
   *
   * Pass this prop along with `onVote` to use the cluster in **controlled**
   * mode (parent owns state). Omit to use **uncontrolled** mode (the cluster
   * tracks the active vote internally).
   */
  myVote?: VoteValue
  /**
   * Initial vote value used in uncontrolled mode.
   *
   * Ignored when `myVote` is provided.
   */
  defaultVote?: VoteValue
  /**
   * Called whenever the viewer's vote toggles.
   *
   * Toggle semantics:
   * - Clicking up while `myVote === 1` → emits `0` (clears).
   * - Clicking up while `myVote === -1 | 0` → emits `1`.
   * - Clicking down while `myVote === -1` → emits `0` (clears).
   * - Clicking down while `myVote === 1 | 0` → emits `-1`.
   *
   * Parents are expected to update the score accordingly (the component
   * itself does not mutate the `score` prop).
   */
  onVote: (next: VoteValue) => void
  /** Disables both arrow buttons. */
  disabled?: boolean
  /** Layout direction. Defaults to `'vertical'` (Reddit-style stacking). */
  direction?: VoteClusterDirection
  /** Optional accessible label for the whole cluster. */
  ariaLabel?: string
  /** Optional `data-mol-id` for AI-agent automation. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
```

### Types

#### `VoteClusterDirection`

Layout direction for the vote cluster.

```typescript
type VoteClusterDirection = 'vertical' | 'horizontal'
```

#### `VoteValue`

Allowed vote values:
- `1`  — upvoted
- `-1` — downvoted
- `0`  — no vote (cleared)

```typescript
type VoteValue = 1 | -1 | 0
```

### Functions

#### `VoteCluster(props)`

Reddit/HN-style stacked up-arrow + score + down-arrow cluster.

Renders two arrow buttons with a score readout between them. Click
semantics follow link-aggregator convention (toggling the same arrow
clears the vote; clicking the opposite arrow swaps it). The score is
**not** mutated by the cluster — parents own that calculation and pass
the new score back via `score` after handling `onVote`.

Styling is delegated entirely to `getClassMap()`. The active arrow is
painted via a CSS custom property (`--mol-color-*`) — no Tailwind /
raw class strings escape this component.

```typescript
function VoteCluster({
  score,
  myVote,
  defaultVote = 0,
  onVote,
  disabled,
  direction = 'vertical',
  ariaLabel,
  dataMolId,
  className,
}: VoteClusterProps): JSX.Element
```

- `props` — Component props.

**Returns:** The rendered cluster element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

## Translations

Translation strings are provided by `@molecule/app-locales-vote-cluster`.
