# @molecule/app-node-editor-panel-react

`@molecule/app-node-editor-panel-react` — right-side properties
panel for node-based editors (chatbot-builder bot nodes, workflow
canvases, design-tool inspector panes).

Composable sub-primitives:
- `<NodeEditorPanel>` — aside chrome with title row, scroll body, footer.
- `<NodeEditorSection>` — labeled section with optional trailing slot.
- `<NodeEditorSlider>` — range slider with mono-font value chip.
- `<NodeEditorToggle>` — iOS-style switch row with optional icon tile.
- `<NodeEditorRadioGroup>` — radio list with custom radio dots.

Consumer brings the form state; the package handles structure and
styling. Generalised from the ai-chatbot-builder
BotEditorNodePropertiesPanel.

## Quick Start

```tsx
import {
  NodeEditorPanel,
  NodeEditorSection,
  NodeEditorSlider,
  NodeEditorToggle,
  NodeEditorRadioGroup,
} from '@molecule/app-node-editor-panel-react'

<NodeEditorPanel
  title="Node Properties"
  footer={<SaveBar onSave={handleSave} saving={saving} error={saveError} />}
>
  <NodeEditorSection label="Model Engine">
    <select value={model} onChange={(e) => setModel(e.target.value)}>…</select>
  </NodeEditorSection>
  <NodeEditorSlider label="Temperature" value={temperature} onChange={setTemperature} />
  <NodeEditorToggle title="Knowledge Base" icon="database" checked={kbEnabled} onChange={setKbEnabled} />
  <NodeEditorSection label="Response Format">
    <NodeEditorRadioGroup
      value={format}
      onChange={setFormat}
      options={[
        { value: 'conversational', label: 'Conversational' },
        { value: 'structured', label: 'Structured' },
        { value: 'json', label: 'JSON' },
      ]}
    />
  </NodeEditorSection>
</NodeEditorPanel>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-node-editor-panel-react
```

## API

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
