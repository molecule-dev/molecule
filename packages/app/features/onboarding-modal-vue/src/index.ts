/**
 * Vue multi-step onboarding overlay.
 *
 * Exports `<OnboardingModal>` and the `OnboardingStep` type. It is the Vue
 * counterpart of `@molecule/app-onboarding-modal-react`: the same props (React
 * names), the same DOM for the same input, and the same `onClose` /
 * `onComplete` calls, so an app switches framework by changing only the
 * package name in its imports.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { OnboardingModal, type OnboardingStep } from '@molecule/app-onboarding-modal-vue'
 *
 * const steps: OnboardingStep[] = [
 *   { id: 'welcome', title: 'Welcome!', body: 'Let us show you around.' },
 *   { id: 'features', title: 'Key Features', body: 'Build apps in minutes.' },
 *   { id: 'done', title: "You're all set", body: 'Start your first project.' },
 * ]
 *
 * const App = defineComponent({
 *   setup() {
 *     const open = ref(true)
 *     return () =>
 *       h(OnboardingModal, {
 *         open: open.value,
 *         steps,
 *         onClose: () => (open.value = false),
 *         onComplete: () => (open.value = false),
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and a Vue `I18n` provider ancestor — the
 * composed `Modal` / `Button` (from `@molecule/app-ui-vue`) and
 * `useTranslation()` all depend on them. Pair with
 * `@molecule/app-locales-onboarding-modal` for the Skip / Back / Next /
 * Get-started strings in 79 languages.
 *
 * Step position is UNCONTROLLED and persists across close/reopen — a user who
 * closed on step 3 reopens on step 3. Remount the component (e.g. with a new
 * `key`) to restart from `defaultStep`. `onComplete` fires only from the
 * final-step button; closing via Skip or the chrome close button calls
 * `onClose` alone — persist "onboarding seen" in `onClose` if skipping should
 * count as done.
 *
 * @module
 */

export * from './OnboardingModal.js'
export * from './types.js'
