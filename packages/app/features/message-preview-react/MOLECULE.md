# @molecule/app-message-preview-react

`@molecule/app-message-preview-react` — conversation / thread row
for chat / inbox sidebars. Avatar with presence dot, name + preview
+ timestamp + unread pip, active-selection treatment.

Extracted from the customer-support-chat ConversationListItem and
its near-identical siblings in ai-customer-service-bot,
ai-voice-assistant, and team-chat. Generalised so the same row works
for support tickets, chat threads, voicemail inboxes, etc.

## Quick Start

```tsx
import { MessagePreview } from '@molecule/app-message-preview-react'

<MessagePreview
  name="Maya Patel"
  preview="Thanks! That fixed it."
  timestamp="2m"
  unread={3}
  presence="online"
  channelIcon="mail"
  active={selectedId === thread.id}
  to={`/conversation/${thread.id}`}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-message-preview-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react react-router-dom
npm install -D @types/react
```

## API

### Types

#### `MessagePreviewPresence`

Presence state of the contact shown in the avatar dot.

```typescript
type MessagePreviewPresence = 'online' | 'away' | 'offline'
```

### Functions

#### `MessagePreview({
  name,
  preview,
  timestamp,
  unread = 0,
  presence,
  active = false,
  channelIcon,
  initials,
  to,
  onClick,
  unreadAriaLabel,
  className,
})`

Conversation / thread preview row.

```typescript
function MessagePreview({
  name,
  preview,
  timestamp,
  unread = 0,
  presence,
  active = false,
  channelIcon,
  initials,
  to,
  onClick,
  unreadAriaLabel,
  className,
}: MessagePreviewProps): JSX.Element
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
- `react-router-dom`
