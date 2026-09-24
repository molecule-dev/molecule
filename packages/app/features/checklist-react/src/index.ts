/**
 * Onboarding checklist with checkboxes and overall progress bar.
 *
 * Exports `<Checklist>` and `ChecklistItem` type.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { Checklist } from '@molecule/app-checklist-react'
 * import { getProvider as getI18nProvider } from '@molecule/app-i18n'
 * import { I18nProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * setClassMap(classMap) // once, at startup
 *
 * export function Onboarding() {
 *   const [items, setItems] = useState([
 *     { id: 'profile', label: 'Complete your profile', completed: true },
 *     { id: 'invite', label: 'Invite a team member', completed: false },
 *     { id: 'project', label: 'Create your first project', completed: false },
 *   ])
 *   return (
 *     <I18nProvider provider={getI18nProvider()}>
 *       <Checklist
 *         title="Getting started"
 *         items={items}
 *         onToggle={(id, next) =>
 *           setItems((list) => list.map((item) => (item.id === id ? { ...item, completed: next } : item)))
 *         }
 *       />
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * The progress line uses the i18n key `checklist.progress` with an English
 * `defaultValue`; no companion locale bond ships this key, so add it to your
 * app's locale resources for non-English UIs. `label`/`description` are
 * consumer-provided ReactNodes — pass translated strings via `t()`. The
 * component is fully controlled: it never mutates `completed`; persist the
 * toggle in `onToggle(id, next)` and re-render with updated `items` (and
 * save it yourself if it must survive a reload). The percentage is
 * `completed / items.length`, rounded. It calls `useTranslation()` from
 * `@molecule/app-react` (throws without an `I18nProvider` /
 * `MoleculeProvider i18n` above it) and `getClassMap()` (throws until
 * `setClassMap(...)` ran); it renders `Checkbox` from `@molecule/app-ui-react`.
 * A non-string `label` makes the checkbox's `aria-label` fall back to the
 * item `id`.
 *
 * @module
 */

export * from './Checklist.js'
