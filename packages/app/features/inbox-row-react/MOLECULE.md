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

### Functions

#### `InboxRow(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .sender
- `root0` — .senderAvatarSrc
- `root0` — .subject
- `root0` — .preview
- `root0` — .timestamp
- `root0` — .unread
- `root0` — .starred
- `root0` — .hasAttachment
- `root0` — .labels
- `root0` — .selectionSlot
- `root0` — .onClick
- `root0` — .onToggleStar
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
