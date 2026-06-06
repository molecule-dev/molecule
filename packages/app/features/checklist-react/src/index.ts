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
 * @module
 */

export * from './Checklist.js'
