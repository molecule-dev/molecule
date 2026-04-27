# @molecule/app-header-react

Top app-shell header — branded logo + appName on the left, slotted actions on the right.

Reproduces the byte-identical Header pattern that appears across 9 flagship apps
(blog, crm, helpdesk-ticketing, lms, online-store, personal-finance,
project-management, property-listing, team-chat) as a single composable primitive.

All visual styling routes through ClassMap tokens (`cm.headerBar`,
`cm.headerFixed`, `cm.logoText`) so the bonded styling layer controls the
treatment — apps don't need raw Tailwind here.

Pair with `@molecule/app-shell-layout-react`'s `<AppShellLayout header={...} />`
to assemble a full chrome, or use it standalone above any custom layout.

## Quick Start

```tsx
import { AppHeader } from '@molecule/app-header-react'
import { UserMenu } from '@molecule/app-ui-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { SettingsPanel } from './SettingsPanel.js'

export function Header() {
  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      userMenu={<UserMenu renderPanel={({ onClose }) => <SettingsPanel onClose={onClose} />} />}
    />
  )
}
```

## Type
`feature`

## Installation

```bash
npm install @molecule/app-header-react
```

## Peer dependencies

- `@molecule/app-ui` — for `getClassMap()`
- `@molecule/app-ui-react` — for `Flex` and `ThemeToggle`
- `react` ≥ 18
- `react-router-dom` ≥ 6

## API

### `<AppHeader>`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `appName` | `string` | _required_ | Brand display name shown next to the logo. |
| `logoSrc` | `string` | `'/logo.svg'` | Logo image source — the convention scaffolded by mlcl. |
| `logoSize` | `number` | `30` | Logo size in pixels (square). |
| `brandTo` | `string` | `'/'` | Path the brand link navigates to. |
| `userMenu` | `ReactNode` | _none_ | Right-side action slot — typically `<UserMenu />` from `@molecule/app-ui-react`. |
| `themeToggle` | `ReactNode` | `<ThemeToggle />` | Theme toggle slot. Pass `null` to hide, or your own component to override the default. |
| `extraActions` | `ReactNode` | _none_ | Optional extra actions rendered between the theme toggle and the user menu. |
| `fixed` | `boolean` | `true` | Apply `cm.headerFixed` for sticky positioning. Set `false` for a non-sticky header. |
| `className` | `string` | _none_ | Composed with `cm.headerBar` + optional `cm.headerFixed` on the outer `<header>`. |
| `dataMolId` | `string` | _none_ | `data-mol-id` for AI-agent selectors. |

## Notes

- The component is presentational. Consumers wire branding via the `appName` /
  `logoSrc` / `logoSize` props, typically pulled from each app's `branding.ts`.
- The `userMenu` slot is intentionally generic — apps that need a specific
  settings panel composition pass their own `<UserMenu renderPanel={...} />`.
- ThemeToggle is on by default because every flagship app uses it; pass
  `showThemeToggle={false}` to suppress.
