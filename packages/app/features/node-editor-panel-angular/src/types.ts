/**
 * Types of `@molecule/app-node-editor-panel-angular` — the Angular counterpart
 * of `@molecule/app-node-editor-panel-react`: the same props (React names) and
 * the same DOM for the same input.
 *
 * Node-valued props (`title`, `footer`, `label`, `trailing`, `valueDisplay`,
 * `subtitle`) are projected content (`[slot=<name>]`) or plain string inputs:
 * an Angular input cannot carry a node.
 *
 * @module
 */

/**
 * Props accepted by {@link NodeEditorPanel} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorPanel` accepts.
 */
export interface NodeEditorPanelProps {
  /** Panel title — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Body content — projected as the host's default content. */
  children?: unknown
  /** Footer slot — `[slot=footer]` projected content, or a string input. */
  footer?: unknown
  /**
   * Click handler for the close button (omitted if `onClose` is undefined).
   * React binds it as the button's `onClick`, so it receives the click event.
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
  /** Section label — a string input, or `[slot=label]` projected content. */
  label?: unknown
  /** Section content — projected as the host's default content. */
  children?: unknown
  /** Optional trailing node — `[slot=trailing]` projected content, or a string input. */
  trailing?: unknown
  /** Stack gap between section header and children (default 3). */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8
}

/**
 * Props accepted by {@link NodeEditorSlider} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorSlider` accepts.
 */
export interface NodeEditorSliderProps {
  /** Slider label — a string input, or `[slot=label]` projected content. */
  label?: unknown
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
  /** Rendered as the trailing value chip; `[slot=valueDisplay]` projection overrides `value`. */
  valueDisplay?: unknown
}

/**
 * Props accepted by {@link NodeEditorToggle} — the same props
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorToggle` accepts.
 */
export interface NodeEditorToggleProps {
  /** Row title — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Optional second line — a string input, or `[slot=subtitle]` projected content. */
  subtitle?: unknown
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
  /** The option's label — a string, or a projected template. */
  label: unknown
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
