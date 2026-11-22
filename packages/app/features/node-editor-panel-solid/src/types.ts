/**
 * Types of `@molecule/app-node-editor-panel-solid` — the Solid counterpart of
 * `@molecule/app-node-editor-panel-react`: the same props (React names) and
 * the same DOM for the same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/**
 * Props accepted by {@link NodeEditorPanel} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorPanel` accepts.
 */
export interface NodeEditorPanelProps {
  /** Panel title. */
  title?: JSX.Element
  /** Body content. */
  children?: JSX.Element
  /** Footer slot — typically the save bar + status row. */
  footer?: JSX.Element
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
  label?: JSX.Element
  /** Section content. */
  children?: JSX.Element
  /** Optional content rendered on the right side of the label row. */
  trailing?: JSX.Element
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
  label?: JSX.Element
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
  valueDisplay?: JSX.Element
}

/**
 * Props accepted by {@link NodeEditorToggle} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorToggle` accepts.
 */
export interface NodeEditorToggleProps {
  /** Row title. */
  title?: JSX.Element
  /** Optional second line. */
  subtitle?: JSX.Element
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
export interface NodeEditorRadioOption<T extends string> {
  /** The option's value. */
  value: T
  /** The option's label. */
  label: JSX.Element
}

/**
 * Props accepted by {@link NodeEditorRadioGroup} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorRadioGroup` accepts.
 */
export interface NodeEditorRadioGroupProps<T extends string> {
  /** The selectable options. */
  options: NodeEditorRadioOption<T>[]
  /** The selected value. */
  value: T
  /** Called with the option selected by a click, keyboard or assistive technology. */
  onChange: (next: T) => void
}
