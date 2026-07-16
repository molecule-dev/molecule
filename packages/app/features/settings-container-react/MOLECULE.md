# @molecule/app-settings-container-react

React Settings-page scaffold (layout chrome only).

Exports:
- `<SettingsLayout>` — two-column [sidebar, content] with an optional
  `header` slot rendered above both.
- `<SettingsSidebar>` — controlled side-nav (`items`, `activeId`,
  `onSelect`, optional `footer`); `SettingsSidebarItem` is
  `{ id, label, icon? }`.
- `<SettingsContent>` — stacked wrapper for the right column.
- `<SettingsSection>` — Card-wrapped titled section (`title`,
  `description?`, `footer?` action row, `dataMolId?`).

## Quick Start

```tsx
import { useState } from 'react'

import {
  SettingsContent,
  SettingsLayout,
  SettingsSection,
  SettingsSidebar,
} from '@molecule/app-settings-container-react'

const NAV = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
]

function SettingsPage() {
  const [active, setActive] = useState('profile')
  return (
    <SettingsLayout
      sidebar={<SettingsSidebar items={NAV} activeId={active} onSelect={setActive} />}
    >
      <SettingsContent>
        <SettingsSection title="Profile" description="Update your display name and avatar.">
          <p>Form fields go here.</p>
        </SettingsSection>
      </SettingsContent>
    </SettingsLayout>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-settings-container-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `SettingsContentProps`

Props accepted by the {@link SettingsContent} component.

```typescript
interface SettingsContentProps {
  /** Active section content. */
  children: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `SettingsLayoutProps`

Props accepted by the {@link SettingsLayout} component.

```typescript
interface SettingsLayoutProps {
  /** Left-side navigation (typically `<SettingsSidebar>`). */
  sidebar: ReactNode
  /** Main content area (usually one or more `<SettingsSection>`s). */
  children: ReactNode
  /**
   * Optional header (breadcrumb, title, save button) rendered above both
   * columns. NOT sticky — apply your own sticky positioning if needed.
   */
  header?: ReactNode
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

#### `SettingsSectionProps`

Props accepted by the {@link SettingsSection} component.

```typescript
interface SettingsSectionProps {
  /** Section heading. */
  title: ReactNode
  /** Optional description under the heading. */
  description?: ReactNode
  /** Section body. */
  children: ReactNode
  /** Optional footer row (save button, last-saved indicator). */
  footer?: ReactNode
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

#### `SettingsSidebarItem`

A single navigable item in the settings sidebar.

```typescript
interface SettingsSidebarItem {
  id: string
  label: ReactNode
  icon?: ReactNode
}
```

#### `SettingsSidebarProps`

Props accepted by the {@link SettingsSidebar} component.

```typescript
interface SettingsSidebarProps {
  items: SettingsSidebarItem[]
  activeId: string
  onSelect: (id: string) => void
  /** Optional footer inside the sidebar (sign-out, plan indicator). */
  footer?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `SettingsContent(props)`

Wrapper for the right-hand column of `<SettingsLayout>`. Just a
vertically-stacked container for one or more `<SettingsSection>`s —
useful as a semantic landmark and for consistent spacing.

```typescript
function SettingsContent({ children, className }: SettingsContentProps): JSX.Element
```

- `props` — Component props (see {@link SettingsContentProps}).

#### `SettingsLayout(props)`

Two-column Settings page scaffold: sidebar on the left, content on the
right, optional (non-sticky) header above both.

```typescript
function SettingsLayout({
  sidebar,
  children,
  header,
  className,
  dataMolId,
}: SettingsLayoutProps): JSX.Element
```

- `props` — Component props (see {@link SettingsLayoutProps}).

#### `SettingsSection(props)`

One configuration section inside a Settings page — Card-wrapped, with
title / description header, body slot, and optional footer action row.

```typescript
function SettingsSection({
  title,
  description,
  children,
  footer,
  className,
  dataMolId,
}: SettingsSectionProps): JSX.Element
```

- `props` — Component props (see {@link SettingsSectionProps}).

#### `SettingsSidebar(props)`

Vertical side-nav for Settings pages. Controlled — caller owns `activeId`.

```typescript
function SettingsSidebar({
  items,
  activeId,
  onSelect,
  footer,
  className,
}: SettingsSidebarProps): JSX.Element
```

- `props` — Component props (see {@link SettingsSidebarProps}).

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

- The `header` slot is rendered above the columns but is NOT sticky —
  apply your own sticky positioning if you need it pinned.
- The two columns do not collapse responsively — swap the sidebar for a
  drawer on small screens yourself.
- Requires a bonded ClassMap. Labels are your own ReactNodes (translate
  upstream); the sidebar nav's `aria-label="Settings"` is hardcoded
  English.
- Don't confuse with `@molecule/app-settings-panel-react`: that package is
  the batteries-included panel (prebuilt Account/Auth/Billing/… sections
  wired to molecule APIs). THIS package is empty layout chrome for
  building your own settings pages.
