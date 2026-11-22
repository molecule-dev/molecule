/**
 * Types of `@molecule/app-node-editor-panel-svelte` — the Svelte counterpart of
 * `@molecule/app-node-editor-panel-react`: the same props (React names) and
 * the same DOM for the same input. Node-valued props arrive as snippets (or
 * plain strings).
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** A node-valued prop: a snippet, or a plain string. */
type NodeValue = string | Snippet

/**
 * Props accepted by {@link NodeEditorPanel} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorPanel` accepts.
 */
export interface NodeEditorPanelProps {
  /** Panel title. */
  title?: NodeValue
  /** Body content — the children snippet. */
  children?: Snippet
  /** Footer slot — typically the save bar + status row. */
  footer?: NodeValue
  /**
   * Click handler for the close button (omitted if `onClose` is undefined).
   * React binds it as the button's `onClick`, so it receives the click event.
   */
  onClose?: (event?: MouseEvent) => void
  /** Accessible label of the close button (default: the translated `nodeEditorPanel.close` key). */
  closeAriaLabel?: string
  /** Width class fragment; defaults to `w-80` (20rem) when omitted. */
  widthClass?: string
}

/**
 * Props accepted by {@link NodeEditorSection} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorSection` accepts.
 */
export interface NodeEditorSectionProps {
  /** Section label. */
  label?: NodeValue
  /** Section content — the children snippet. */
  children?: Snippet
  /** Optional content rendered on the right side of the label row. */
  trailing?: NodeValue
  /**
   * Id of the form control this label names (`<label for>`). Set it when the
   * section holds a single labelable control, so the control gets a name.
   */
  htmlFor?: string
  /** Stack gap between section header and children (default 3). */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8
}

/**
 * Props accepted by {@link NodeEditorSlider} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorSlider` accepts.
 */
export interface NodeEditorSliderProps {
  /** Slider label. */
  label?: NodeValue
  /** Current numeric value. */
  value: number
  /** Called with the parsed value of every change. */
  onChange: (next: number) => void
  /** Lower bound (default 0). */
  min?: number
  /** Upper bound (default 1). */
  max?: number
  /** Step increment (default 0.1). */
  step?: number
  /** Rendered as the trailing value chip; defaults to `value`. */
  valueDisplay?: NodeValue
}

/**
 * Props accepted by {@link NodeEditorToggle} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorToggle` accepts.
 */
export interface NodeEditorToggleProps {
  /** Row title. */
  title?: NodeValue
  /** Optional second line. */
  subtitle?: NodeValue
  /** Material-symbols icon for the leading tile (omit for no tile). */
  icon?: string
  /** Whether the switch is on. */
  checked: boolean
  /** Called with the switch's next checked state. */
  onChange: (next: boolean) => void
  /** Accessible label for the switch (defaults to a string title). */
  ariaLabel?: string
}

/** One selectable option in a {@link NodeEditorRadioGroup}. */
export interface NodeEditorRadioOption {
  /** The option's value. */
  value: string
  /** The option's label. */
  label: NodeValue
}

/**
 * Props accepted by {@link NodeEditorRadioGroup} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorRadioGroup` accepts.
 */
export interface NodeEditorRadioGroupProps {
  /** The selectable options. */
  options: NodeEditorRadioOption[]
  /** The selected value. */
  value: string
  /** Called with the option selected by a click, keyboard or assistive technology. */
  onChange: (next: string) => void
}
