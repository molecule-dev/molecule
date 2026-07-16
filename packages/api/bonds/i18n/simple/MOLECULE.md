# @molecule/api-i18n-simple

Simple i18n provider for molecule.dev.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-i18n'
import { provider } from '@molecule/api-i18n-simple'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-i18n-simple @molecule/api-i18n
```

## API

### Functions

#### `createSimpleI18nProvider(initialLocale, initialLocales)`

Creates a simple i18n provider that implements the `I18nProvider` interface
using in-memory translations, `Intl` APIs for formatting, and CLDR plural rules.

```typescript
function createSimpleI18nProvider(initialLocale?: string, initialLocales?: LocaleConfig[]): I18nProvider
```

- `initialLocale` — The starting locale code (default: `'en'`).
- `initialLocales` — Pre-loaded locale configurations with translations.

**Returns:** An `I18nProvider` with translation, formatting, and pluralization support.

### Constants

#### `provider`

Default simple provider.

```typescript
const provider: I18nProvider
```

## Core Interface
Implements `@molecule/api-i18n` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-i18n'
import { provider } from '@molecule/api-i18n-simple'

export function setupI18nSimple(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-i18n`

This bond implements the same `I18nProvider` fleet contract as
`@molecule/app-i18n`'s core simple provider and the `@molecule/app-i18n-i18next`
bond — cross-checked so swapping providers never silently changes behavior:

- `setLocale(locale)` THROWS `Error('Locale "<code>" not found')` for an
  unregistered locale — it never silently degrades.
- `t(key, values, { count })`: when `count` is given, the plural-suffixed
  key (`` `${key}_${pluralForm}` ``, falling back to `` `${key}_other` ``)
  is tried BEFORE the base `key` — matching i18next's own resolution order.
  A catalog with both `item` and `item_one`/`item_other` pluralizes.
- `addTranslations()` DEEP-merges nested translation objects; two calls
  sharing a top-level namespace key merge their subtrees instead of one
  clobbering the other.
- `exists(key)` follows the same locale-fallback chain as `t()` (active
  locale, then English) — it agrees with whether `t(key)` would render
  real text, not just whether the active locale's own catalog has it.

## E2E Tests

Integration checklist — drive the real flow (no mocks), adapt each item to
this app's actual localized responses/emails, and check every box off one by
one. A box you can't check is an integration bug to fix — not a skip:
- [ ] A user-facing server string (an API error message, an email
  subject/body, a notification) renders TRANSLATED for a non-default locale:
  set the user's locale (or send Accept-Language) and confirm the
  response/email comes back in that language, not English — passed per-request
  as `t(key, values, { locale })`, NEVER a process-global `setLocale()` per
  request (that races concurrent users and localizes the wrong one).
- [ ] A missing/untranslated key falls back to its `defaultValue` (rendered
  English), NOT the raw dot-notation key — a response or email showing
  `user.error.notFound` verbatim is exactly the bug this prevents.
- [ ] `{{variable}}` interpolation fills correctly — the appName/count/etc.
  appear in the message and no literal `{{appName}}` leaks through.
- [ ] If the app pluralizes, `{ count }` resolves the right CLDR form
  (one/other/…) — and ONLY with a real bonded provider (the auto fallback
  ignores count), so "1 item" vs "2 items" reads correctly.
- [ ] The locale is derived per-request from the authenticated user's
  preference (or Accept-Language), so two concurrent users with different
  locales each get their own language — one user's locale never leaks into
  another's email/response.
