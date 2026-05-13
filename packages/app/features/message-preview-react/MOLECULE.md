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
npm install @molecule/app-message-preview-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
