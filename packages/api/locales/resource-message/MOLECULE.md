# @molecule/api-locales-resource-message

English-baseline locale bond for `@molecule/api-resource-message`.

Other languages should be added as sibling files (`es.ts`, `de.ts`, …)
mirroring the {@link MessageTranslations} shape, then re-exported here.

## Purpose

Provides translations for the `@molecule/api-resource-message` package which has 18 translation keys.

## Languages

1 language supported: en.

## Quick Start

```typescript
import { en } from '@molecule/api-locales-resource-message'
import type { MessageTranslationKey, MessageTranslations } from '@molecule/api-locales-resource-message'
```

## Translation Keys

| Key | English |
|-----|---------|
| `message.error.deleteFailed` | Failed to delete message |
| `message.error.editFailed` | Failed to edit message |
| `message.error.listMessagesFailed` | Failed to list messages |
| `message.error.listThreadsFailed` | Failed to list threads |
| `message.error.markReadFailed` | Failed to mark thread as read |
| `message.error.messageNotFound` | Message not found or not editable |
| `message.error.missingMessageId` | Message ID is required |
| `message.error.missingThreadId` | Thread ID is required |
| `message.error.notParticipant` | You are not a participant in this thread |
| `message.error.readThreadFailed` | Failed to read thread |
| `message.error.selfThread` | Cannot start a thread with yourself |
| `message.error.sendFailed` | Failed to send message |
| `message.error.threadCreateFailed` | Failed to create thread |
| `message.error.threadNotFound` | Thread not found |
| `message.error.unreadCountFailed` | Failed to get unread count |
| `message.error.validationFailed` | Validation failed |
| `message.system.conversationStarted` | {{name}} started a conversation |
| `message.system.messageDeleted` | This message was deleted |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-resource-message`
