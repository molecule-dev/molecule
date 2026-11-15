/**
 * Svelte multi-step onboarding overlay.
 *
 * Exports `<OnboardingModal>` and the `OnboardingStep` type. It is the Svelte
 * counterpart of `@molecule/app-onboarding-modal-react`: the same props (React
 * names), the same DOM for the same input, and the same `onClose` /
 * `onComplete` calls, so an app switches framework by changing only the
 * package name in its imports.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { OnboardingModal, type OnboardingStep } from '@molecule/app-onboarding-modal-svelte'
 *
 *   const steps: OnboardingStep[] = [
 *     { id: 'welcome', title: 'Welcome!', body: 'Let us show you around.' },
 *     { id: 'features', title: 'Key Features', body: 'Build apps in minutes.' },
 *     { id: 'done', title: "You're all set", body: 'Start your first project.' },
 *   ]
 *
 *   let open = $state(true)
 * </script>
 *
 * <OnboardingModal {open} {steps} onClose={() => (open = false)} onComplete={() => (open = false)} />
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and a Svelte i18n provider ancestor — the
 * composed `Modal` / `Button` (from `@molecule/app-ui-svelte`) and
 * `useTranslation()` all depend on them. Pair with
 * `@molecule/app-locales-onboarding-modal` for the Skip / Back / Next /
 * Get-started strings in 79 languages.
 *
 * Step position is UNCONTROLLED and persists across close/reopen — a user who
 * closed on step 3 reopens on step 3. Remount the component to restart from
 * `defaultStep`. `onComplete` fires only from the final-step button; closing
 * via Skip or the chrome close button calls `onClose` alone — persist
 * "onboarding seen" in `onClose` if skipping should count as done.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
