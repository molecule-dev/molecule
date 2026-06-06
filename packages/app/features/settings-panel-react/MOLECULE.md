# @molecule/app-settings-panel-react

`@molecule/app-settings-panel-react` — composable settings panel.

`<SettingsContainer>` owns the panel layout + `onClose` context;
each section component (`<AccountSection>`, `<AuthSection>`,
`<NotificationsSection>`, `<BillingSection>`, `<DevicesSection>`,
`<ThisDeviceSection>`, `<LogOutDeleteSection>`) is independent and
reads its own state from hooks. Apps compose via JSX children —
picking which sections to include, in what order, and interleaving
their own custom sections.

## Quick Start

```tsx
import {
  SettingsContainer,
  AccountSection,
  AuthSection,
  NotificationsSection,
  BillingSection,
  DevicesSection,
  ThisDeviceSection,
  LogOutDeleteSection,
} from '@molecule/app-settings-panel-react'

import { Footer } from './Footer.js'

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <SettingsContainer onClose={onClose}>
      <AccountSection />
      <AuthSection />
      <NotificationsSection />
      <BillingSection />
      <DevicesSection />
      <ThisDeviceSection />
      <LogOutDeleteSection />
      <Footer />
    </SettingsContainer>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-settings-panel-react
```

## API

### Interfaces

#### `SettingsPanelContextValue`

Context published by `<SettingsContainer>` to its children.

The container owns the dismiss-the-panel handler; sub-components
that need to close after an action (logout, delete account, email
error) read it from context rather than threading the prop down.

```typescript
interface SettingsPanelContextValue {
  onClose: () => void
}
```

### Functions

#### `useSettingsPanelContext()`

Reads the `onClose` handler exposed by the parent `<SettingsContainer>`.
Throws if used outside the container so component misuse is loud.

```typescript
function useSettingsPanelContext(): SettingsPanelContextValue
```

### Constants

#### `SettingsPanelContext`

```typescript
const SettingsPanelContext: Context<SettingsPanelContextValue | null>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-auth` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
