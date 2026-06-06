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
npm install @molecule/app-inbox-row-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
