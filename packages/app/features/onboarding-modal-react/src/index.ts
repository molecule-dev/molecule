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
 * function Onboarding() {
 *   const [open, setOpen] = useState(true)
 *   return (
 *     <OnboardingModal
 *       open={open}
 *       steps={steps}
 *       onClose={() => setOpen(false)}
 *       onComplete={() => setOpen(false)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and a React `I18nProvider` ancestor —
 * the composed `Modal` / `Button` (from `@molecule/app-ui-react`) and
 * `useTranslation()` all depend on them. Pair with
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
