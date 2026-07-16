# @molecule/api-locales-resource-message

Message resource locale bond for molecule.dev.

Provides type-safe translations for `@molecule/api-resource-message`'s
error and system-message keys. Wire by importing the resource package's
`i18n.ts` (which calls `registerLocaleModule` on this package).

## Purpose

Provides translations for the `@molecule/api-resource-message` package which has 18 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/api-locales-resource-message'
import type { MessageTranslationKey, MessageTranslations } from '@molecule/api-locales-resource-message'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/api-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-resource-message'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

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
