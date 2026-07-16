# @molecule/app-locales-notifications-page

Companion locale bond for `@molecule/app-notifications-page-react`.

Provides 79-language translations for the notifications page UI strings
(header, filter chips, empty state, pagination, mark-all-read action).

## Purpose

Provides translations for the `@molecule/app-notifications-page-react` package which has 15 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/app-locales-notifications-page'
import type { NotificationsPageTranslationKey, NotificationsPageTranslations } from '@molecule/app-locales-notifications-page'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/app-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/app-i18n'
import * as locales from '@molecule/app-locales-notifications-page'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `notificationsPage.title` | Notifications |
| `notificationsPage.markAllRead` | Mark {{count}} as read |
| `notificationsPage.filterAll` | All |
| `notificationsPage.filterUnread` | Unread |
| `notificationsPage.filterMentions` | Mentions |
| `notificationsPage.filterAriaLabel` | Filter notifications |
| `notificationsPage.feedAriaLabel` | Notifications |
| `notificationsPage.loading` | Loading notifications… |
| `notificationsPage.error` | Could not load notifications. |
| `notificationsPage.emptyTitle` | You’re all caught up |
| `notificationsPage.emptyBody` | New notifications will appear here. |
| `notificationsPage.paginationAriaLabel` | Pagination |
| `notificationsPage.pageOf` | Page {{current}} of {{total}} |
| `notificationsPage.prev` | Previous |
| `notificationsPage.next` | Next |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-notifications-page-react`
