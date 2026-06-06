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
npm install @molecule/app-settings-container-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
