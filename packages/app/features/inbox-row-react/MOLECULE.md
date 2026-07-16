# @molecule/app-inbox-row-react

Inbox / email message list row.

Exports `<InboxRow>`.

## Quick Start

```tsx
import { InboxRow } from '@molecule/app-inbox-row-react'

<InboxRow
  sender="Alice Johnson"
  senderAvatarSrc="https://example.com/alice.jpg"
  subject="Q3 report is ready"
  preview="Hi, I've attached the final numbers for review..."
  timestamp="10:42 AM"
  unread={true}
  starred={false}
  hasAttachment={true}
  onClick={() => openMessage(msg.id)}
  onToggleStar={() => toggleStar(msg.id)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-inbox-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `InboxRowProps`

```typescript
interface InboxRowProps {
  /** Sender display. */
  sender: ReactNode
  /** Avatar URL fallback for sender. */
  senderAvatarSrc?: string
  /** Subject / headline. */
  subject: ReactNode
  /** Preview / first line of body. */
  preview?: ReactNode
  /** Display timestamp. */
  timestamp?: ReactNode
  /** Whether the message is unread (drives bold + dot). */
  unread?: boolean
  /** Whether the message is starred / flagged. */
  starred?: boolean
  /** Optional attachment indicator. */
  hasAttachment?: boolean
  /** Optional labels / tags chip row. */
  labels?: ReactNode
  /** Right-side selection slot (checkbox). */
  selectionSlot?: ReactNode
  /** Click handler — typically opens the message. */
  onClick?: () => void
  /** Star toggle. */
  onToggleStar?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `InboxRow(props)`

Inbox / email message list row — sender + subject + preview +
timestamp + unread/star indicators. Generalizes beyond email to any
"message list" UI (chat lists, notification archives, ticket queues).

```typescript
function InboxRow({
  sender,
  senderAvatarSrc,
  subject,
  preview,
  timestamp,
  unread,
  starred,
  hasAttachment,
  labels,
  selectionSlot,
  onClick,
  onToggleStar,
  className,
}: InboxRowProps): React.JSX.Element
```

- `props` — Component props (see {@link InboxRowProps}).

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

- Star/attachment indicators use fixed colors and emoji with hardcoded
  English aria-labels ("Star"/"Unstar"/"Has attachment") — there is no
  companion locale bond yet; wrap or fork for fully localized apps.
- When `sender` is not a plain string, the avatar's accessible name falls
  back to the literal "Sender" — pass a string `sender` (or your own
  `selectionSlot`) when screen-reader naming matters.
- `unread` bolds the row via an inline `fontWeight: 600` and renders a
  fixed blue dot — the dot color does not follow the theme.
- `getClassMap()` requires a bonded ClassMap; `<Avatar>` comes from
  `@molecule/app-ui-react`.
