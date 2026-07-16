# @molecule/app-home-page-react

`<Home />` — authenticated home page with personalized greeting.

Renders a single H2 of the form `{home.greeting}{name|email|home.world}!`
using the universal common-locale bond. Used as the default
post-login landing page when the app has no app-specific dashboard.

Replaces the byte-identical `pages/Home.tsx` shipped by 19 of the 38
flagship apps that have an authenticated Home route. Apps that
override `home.greeting` per-app (e.g. note-taking's
"Hello, {{name}}.") get the override automatically — the page reads
the resolved translation, which spreads the bond default beneath
any per-app override.

## Quick Start

```tsx
import { Home } from '@molecule/app-home-page-react'

<Route path="/" element={<Home />} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-home-page-react @molecule/app-auth @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Functions

#### `Home()`

Authenticated home page — a personalized greeting headline.

Renders a single H2 of the form:
  `{home.greeting}{user.name || user.email || home.world}!`

`home.greeting` and `home.world` both come from the universal
common-locale bond (`@molecule/app-locales-common`), so the page is
fully translated out of the box. Apps can override `home.greeting`
per-app (e.g. note-taking's "Hello, {{name}}.") simply by including
the key in their own locale `ui.ts`.

```typescript
function Home(): JSX.Element
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-auth` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-auth`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

- Calls `useAuth()` and `useTranslation()` — both THROW unless the tree is
  wrapped in `@molecule/app-react`'s `AuthProvider` and `I18nProvider`
  (scaffolded apps do this in `App.tsx`).
- `home.greeting` / `home.world` have NO inline English fallback: they
  resolve from `@molecule/app-locales-common`, which
  `setupI18nDefault()` (from `@molecule/app-i18n-default-react`) merges
  automatically. A custom i18n setup must register the common bond or the
  raw keys render on screen.
