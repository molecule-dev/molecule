/**
 * Sticky Save/Cancel bar with "Saved" timestamp + loading state for settings and form pages.
 *
 * @example
 * ```tsx
 * import { SettingsActionsBar } from '@molecule/app-settings-actions-bar-react'
 *
 * <SettingsActionsBar
 *   onSave={async () => saveProfile(formData)}
 *   onCancel={() => resetForm()}
 *   loading={isSaving}
 *   savedAt={lastSavedAt}
 *   error={saveError}
 * />
 * ```
 *
 * @module
 */

export * from './SettingsActionsBar.js'
