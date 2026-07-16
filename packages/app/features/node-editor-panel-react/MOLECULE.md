# @molecule/app-node-editor-panel-react

`@molecule/app-node-editor-panel-react` — right-side properties
panel for node-based editors (chatbot-builder bot nodes, workflow
canvases, design-tool inspector panes).

Composable sub-primitives:
- `<NodeEditorPanel>` — aside chrome with title row, scroll body, footer.
- `<NodeEditorSection>` — labeled section with optional trailing slot.
- `<NodeEditorSlider>` — range slider with mono-font value chip.
- `<NodeEditorToggle>` — switch row with optional icon tile.
- `<NodeEditorRadioGroup>` — radio list with custom radio dots.

Consumer brings the form state; the package handles structure and
styling.

## Quick Start

```tsx
import { useState } from 'react'

import {
  NodeEditorPanel,
  NodeEditorRadioGroup,
  NodeEditorSection,
  NodeEditorSlider,
  NodeEditorToggle,
} from '@molecule/app-node-editor-panel-react'

function Inspector() {
  const [temperature, setTemperature] = useState(0.7)
  const [kbEnabled, setKbEnabled] = useState(false)
  const [format, setFormat] = useState('conversational')
  return (
    <NodeEditorPanel title="Node Properties" onClose={() => {}}>
      <NodeEditorSlider label="Temperature" value={temperature} onChange={setTemperature} />
      <NodeEditorToggle title="Knowledge Base" icon="database" checked={kbEnabled} onChange={setKbEnabled} />
      <NodeEditorSection label="Response Format">
        <NodeEditorRadioGroup
          value={format}
          onChange={setFormat}
          options={[
            { value: 'conversational', label: 'Conversational' },
            { value: 'structured', label: 'Structured' },
          ]}
        />
      </NodeEditorSection>
    </NodeEditorPanel>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-node-editor-panel-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `NodeEditorPanelProps`

```typescript
interface NodeEditorPanelProps {
  title: ReactNode
  children?: ReactNode
  /** Footer slot — typically the save bar + status row. */
  footer?: ReactNode
  /** Click handler for the close button (omitted if `onClose` is null). */
  onClose?: () => void
  closeAriaLabel?: string
  /** Tailwind width class fragment; defaults to `w-80` (20rem). */
  widthClass?: string
}
```

#### `NodeEditorRadioGroupProps`

```typescript
interface NodeEditorRadioGroupProps<T extends string> {
  options: NodeEditorRadioOption<T>[]
  value: T
  onChange: (next: T) => void
}
```

#### `NodeEditorRadioOption`

```typescript
interface NodeEditorRadioOption<T extends string> {
  value: T
  label: ReactNode
}
```

#### `NodeEditorSectionProps`

```typescript
interface NodeEditorSectionProps {
  label: ReactNode
  children?: ReactNode
  /** Optional content rendered on the right side of the label row (value chip, numeric input). */
  trailing?: ReactNode
  /** Stack gap between section header and children (default 3). */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8
}
```

#### `NodeEditorSliderProps`

```typescript
interface NodeEditorSliderProps {
  label: ReactNode
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  step?: number
  /** Rendered as the trailing value chip; defaults to `value`. */
  valueDisplay?: ReactNode
}
```

#### `NodeEditorToggleProps`

```typescript
interface NodeEditorToggleProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Material-symbols icon for the leading tile (omit for no tile). */
  icon?: string
  checked: boolean
  onChange: (next: boolean) => void
  ariaLabel?: string
}
```

### Functions

#### `NodeEditorPanel({
  title,
  children,
  footer,
  onClose,
  closeAriaLabel = 'Close panel',
  widthClass,
})`

Properties panel chrome.

```typescript
function NodeEditorPanel({
  title,
  children,
  footer,
  onClose,
  closeAriaLabel = 'Close panel',
  widthClass,
}: NodeEditorPanelProps): JSX.Element
```

#### `NodeEditorRadioGroup({
  options,
  value,
  onChange,
})`

Radio list.

```typescript
function NodeEditorRadioGroup({
  options,
  value,
  onChange,
}: NodeEditorRadioGroupProps<T>): JSX.Element
```

#### `NodeEditorSection({
  label,
  children,
  trailing,
  gap = 3,
})`

Labeled section.

```typescript
function NodeEditorSection({
  label,
  children,
  trailing,
  gap = 3,
}: NodeEditorSectionProps): JSX.Element
```

#### `NodeEditorSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  valueDisplay,
})`

Range slider section.

```typescript
function NodeEditorSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  valueDisplay,
}: NodeEditorSliderProps): JSX.Element
```

#### `NodeEditorToggle({
  title,
  subtitle,
  icon,
  checked,
  onChange,
  ariaLabel,
})`

Toggle row.

```typescript
function NodeEditorToggle({
  title,
  subtitle,
  icon,
  checked,
  onChange,
  ariaLabel,
}: NodeEditorToggleProps): JSX.Element
```

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

KNOWN LIMITATION — this package currently styles itself with raw
Tailwind classes and Material-3 color tokens (`bg-surface-container-low`,
`text-on-surface-variant`, `border-outline-variant`, `accent-primary`,
`w-80`, ...) instead of ClassMap resolvers. Out of the box in a
standard molecule app the panel renders UNSTYLED because (a) the app's
Tailwind build does not scan this package's dist for class literals,
and (b) the M3 color tokens are not defined by standard themes. To
adopt it today you must add an `@source "<path-to>/app-node-editor-panel-react/dist"`
line to the app's Tailwind CSS AND define the referenced
`surface-container-*` / `on-surface*` / `outline-variant` theme colors.

The close button and `NodeEditorToggle.icon` render Material Symbols
LIGATURES — without the "Material Symbols Outlined" font loaded and a
`material-symbols-outlined` CSS class defined, icon names render as
plain text (e.g. the word "close").

A wired ClassMap bond is still required for the layout helpers —
`getClassMap()` throws before wiring. The close button's default
aria-label is English-only; pass `closeAriaLabel` with a translated
string in localized apps.
