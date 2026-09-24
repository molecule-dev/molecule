/**
 * Multi-step onboarding overlay.
 *
 * Exports `<OnboardingModal>` and `OnboardingStep` type.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { OnboardingModal, type OnboardingStep } from '@molecule/app-onboarding-modal-react'
 *
 * const steps: OnboardingStep[] = [
 *   { id: 'welcome', title: 'Welcome!', body: 'Let us show you around.' },
 *   { id: 'features', title: 'Key Features', body: 'Build apps in minutes.' },
 *   { id: 'done', title: "You're all set", body: 'Start your first project.' },
 * ]
 *
 * export function Onboarding() {
 *   const [open, setOpen] = useState(true)
 *   const [status, setStatus] = useState<'pending' | 'completed' | 'skipped'>('pending')
 *   return (
 *     <>
 *       <p>Onboarding: {status}</p>
 *       <OnboardingModal
 *         open={open}
 *         steps={steps}
 *         onComplete={() => setStatus('completed')} // final "Get started" only
 *         onClose={() => {
 *           setOpen(false) // also called after onComplete, and by Skip / X / backdrop / Escape
 *           setStatus((s) => (s === 'pending' ? 'skipped' : s))
 *         }}
 *       />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond, an icon set (`setIconSet(iconSet)` from `@molecule/app-icons`
 * — the `Modal`'s close button icon throws without it) and a React `I18nProvider` ancestor —
 * the composed `Modal` / `Button` (from `@molecule/app-ui-react`) and `useTranslation()` all
 * depend on them. The `Modal` portals into `document.body`.
 *
 * It is CONTROLLED by `open` — it never hides itself: set `open` to false in `onClose`, which
 * also runs right after `onComplete` on the last step. It stores nothing ("seen" flags are
 * yours to persist), and an empty `steps` array renders `null`. Pair with
 * `@molecule/app-locales-onboarding-modal` for the Skip / Back / Next /
 * Get-started strings in 79 languages.
 *
 * Step position is UNCONTROLLED and persists across close/reopen — a
 * user who closed on step 3 reopens on step 3. Remount the component
 * (e.g. `key={openCount}`) to restart from `defaultStep`. `onComplete`
 * fires only from the final-step button; closing via Skip or the
 * backdrop calls `onClose` alone — persist "onboarding seen" in
 * `onClose` if skipping should count as done.
 *
 * @module
 */

export * from './OnboardingModal.js'
