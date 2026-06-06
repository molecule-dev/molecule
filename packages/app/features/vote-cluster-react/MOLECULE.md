# @molecule/app-vote-cluster-react

Reddit/HN-style vote cluster — stacked up/down arrows + score readout.

Used by link-aggregator and news-aggregator templates, and composable
inside `@molecule/app-forum-thread-row-react`. Toggle semantics handle
upvote, downvote, and "click again to clear" optimistic flows. All UI
text flows through `t()` with translations supplied by the companion
`@molecule/app-locales-vote-cluster` package.

## Quick Start

```tsx
import { VoteCluster } from '@molecule/app-vote-cluster-react'

function PostRow({ post }) {
  const [score, setScore] = useState(post.score)
  const [myVote, setMyVote] = useState<1 | -1 | 0>(post.myVote ?? 0)
  return (
    <VoteCluster
      score={score}
      myVote={myVote}
      onVote={(next) => {
        setScore(score - myVote + next)
        setMyVote(next)
        api.vote(post.id, next)
      }}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-vote-cluster-react
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-vote-cluster`.
