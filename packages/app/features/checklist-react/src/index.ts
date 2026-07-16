/**
 * Onboarding checklist with checkboxes and overall progress bar.
 *
 * Exports `<Checklist>` and `ChecklistItem` type.
 *
 * @example
 * ```tsx
 * import { Checklist } from '@molecule/app-checklist-react'
 *
 * <Checklist
 *   title="Getting started"
 *   items={[
 *     { id: 'profile', label: 'Complete your profile', completed: true },
 *     { id: 'invite', label: 'Invite a team member', completed: false },
 *     { id: 'project', label: 'Create your first project', completed: false },
 *   ]}
 *   onToggle={(id, next) => updateItem(id, next)}
 * />
 * ```
 *
 * @remarks
 * The progress line uses the i18n key `checklist.progress` with an English
 * `defaultValue`; no companion locale bond ships this key, so add it to your
 * app's locale resources for non-English UIs. `label`/`description` are
 * consumer-provided ReactNodes — pass translated strings via `t()`. The
 * component is fully controlled: it never mutates `completed`; persist the
 * toggle in `onToggle(id, next)` and re-render with updated `items`.
 *
 * @module
 */

export * from './Checklist.js'
