/**
 * Types of `@molecule/app-node-editor-panel-vue` — the Vue counterpart of
 * `@molecule/app-node-editor-panel-react`: the same props (React names) and
 * the same DOM for the same input.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * Props accepted by {@link NodeEditorPanel} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorPanel` accepts.
 * Node-valued props may arrive as a prop or as the same-named slot.
 */
export interface NodeEditorPanelProps {
  /** Panel title (a VNode, a string, or null). */
  title?: VNodeChild
  /** Body content — the DEFAULT slot (or the `children` prop). */
  children?: VNodeChild
  /** Footer slot — typically the save bar + status row. */
  footer?: VNodeChild
  /**
   * Click handler for the close button (omitted if `onClose` is null). React
   * binds it as the button's `onClick`, so it receives the click event.
   */
  onClose?: (event?: MouseEvent) => void
  /** Accessible label of the close button (default `'Close panel'`). */
  closeAriaLabel?: string
  /** Width class fragment; defaults to `w-80` (20rem) when omitted. */
  widthClass?: string
}

/**
 * Props accepted by {@link NodeEditorSection} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorSection` accepts.
 */
export interface NodeEditorSectionProps {
  /** Section label (a VNode, a string, or null). */
  label?: VNodeChild
  /** Section content — the DEFAULT slot (or the `children` prop). */
  children?: VNodeChild
  /** Optional content rendered on the right side of the label row. */
  trailing?: VNodeChild
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
  /** Slider label (a VNode, a string, or null). */
  label?: VNodeChild
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
  valueDisplay?: VNodeChild
}

/**
 * Props accepted by {@link NodeEditorToggle} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorToggle` accepts.
 */
export interface NodeEditorToggleProps {
  /** Row title (a VNode, a string, or null). */
  title?: VNodeChild
  /** Optional second line (a VNode, a string, or null). */
  subtitle?: VNodeChild
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
  /** The option's label (a VNode, a string, or null). */
  label: VNodeChild
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
