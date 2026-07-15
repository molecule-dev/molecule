# @molecule/app-settings-container-react

React Settings-page scaffold.

Exports:
- `<SettingsLayout>` — two-column [sidebar, content] with optional header.
- `<SettingsSidebar>` — controlled side-nav list with icons + active state.
- `<SettingsContent>` — right-column wrapper for multiple sections.
- `<SettingsSection>` — Card-wrapped titled section with optional footer actions.
- `SettingsSidebarItem` type for the sidebar item shape.

## Quick Start

```tsx
import {
  SettingsLayout,
  SettingsSidebar,
  SettingsContent,
  SettingsSection,
} from '@molecule/app-settings-container-react'

const NAV = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
]

export function SettingsPage() {
  const [active, setActive] = React.useState('profile')
  return (
    <SettingsLayout sidebar={<SettingsSidebar items={NAV} activeId={active} onSelect={setActive} />}>
      <SettingsContent>
        <SettingsSection title="Profile" description="Update your display name and avatar.">
          {/* form fields *\/}
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

#### `SettingsSidebarItem`

A single navigable item in the settings sidebar.

```typescript
interface SettingsSidebarItem {
  id: string
  label: ReactNode
  icon?: ReactNode
}
```

### Functions

#### `SettingsContent(root0, root0, root0)`

Wrapper for the right-hand column of `<SettingsLayout>`. Just a
vertically-stacked container for one or more `<SettingsSection>`s —
useful as a semantic landmark and for consistent spacing.

```typescript
function SettingsContent({ children, className }: SettingsContentProps): JSX.Element
```

- `root0` — *
- `root0` — .children
- `root0` — .className

#### `SettingsLayout(root0, root0, root0, root0, root0, root0)`

Two-column Settings page scaffold: sidebar on the left, content on the
right, optional sticky header above both.

```typescript
function SettingsLayout({
  sidebar,
  children,
  header,
  className,
  dataMolId,
}: SettingsLayoutProps): JSX.Element
```

- `root0` — *
- `root0` — .sidebar
- `root0` — .children
- `root0` — .header
- `root0` — .className
- `root0` — .dataMolId

#### `SettingsSection(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .title
- `root0` — .description
- `root0` — .children
- `root0` — .footer
- `root0` — .className
- `root0` — .dataMolId

#### `SettingsSidebar(root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .items
- `root0` — .activeId
- `root0` — .onSelect
- `root0` — .footer
- `root0` — .className

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
