/**
 * Component exports.
 *
 * React-parity components are exported under their React names (`Button`,
 * `CardHeader`, …); the original spike components keep their `Molecule*`
 * names under `./molecule/` (deprecated).
 *
 * @module
 */

export * from './accordion.component.js'
export * from './alert.component.js'
export * from './auth-guard.component.js'
export * from './avatar.component.js'
export * from './badge.component.js'
export * from './button.component.js'
export * from './card.component.js'
export * from './checkbox.component.js'
export * from './confirm-button.component.js'
export * from './confirm-dialog.component.js'
export * from './dropdown.component.js'
export * from './empty-state.component.js'
export * from './floating-input.component.js'
export * from './form.component.js'
export * from './form-field.component.js'
export * from './icon.component.js'
export * from './input.component.js'
export * from './label.component.js'
export * from './language-picker.component.js'
export * from './layout.component.js'
export * from './load-error-banner.component.js'
export * from './modal.component.js'
export * from './optimistic-toggle-button.component.js'
export * from './page-header.component.js'
export * from './page-shell.component.js'
export * from './pagination.component.js'
export * from './panel-close.component.js'
export * from './progress.component.js'
export * from './prompt-dialog.component.js'
export * from './radio-group.component.js'
export * from './responsive-app-shell.component.js'
export * from './select.component.js'
export * from './separator.component.js'
export * from './sidebar-user-card.component.js'
export * from './skeleton.component.js'
export * from './spinner.component.js'
export * from './switch.component.js'
export * from './table.component.js'
export * from './tabs.component.js'
export * from './textarea.component.js'
export * from './theme-toggle.component.js'
export * from './toast.component.js'
export * from './tooltip.component.js'
export * from './user-menu.component.js'
export * from './user-menu-popover.component.js'

/**
 * Deprecated spike components from the first Angular UI pass.
 *
 * @deprecated Use the React-named exports above instead: `MoleculeButton` →
 * `Button`, `MoleculeBadge` → `Badge`, `MoleculeAlert` → `Alert`,
 * `MoleculeInput` → `Input`, `MoleculeSelect` → `Select`,
 * `MoleculeCheckbox` → `Checkbox`, `MoleculeRadioGroup` → `RadioGroup`,
 * `MoleculeSwitch` → `Switch`, `MoleculeSpinner` → `Spinner`,
 * `MoleculeToast` → `Toast`, `MoleculeModal` → `Modal`,
 * `MoleculeTooltip` → `Tooltip`.
 */
export * from './molecule/index.js'
