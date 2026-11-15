/**
 * Angular multi-step onboarding overlay.
 *
 * Exports `<OnboardingModal>` and the `OnboardingStep` type. It is the Angular
 * counterpart of `@molecule/app-onboarding-modal-react`: the same props (React
 * names), the same DOM for the same input, and the same `onClose` /
 * `onComplete` calls, so an app switches framework by changing only the
 * package name in its imports.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { OnboardingModal, type OnboardingStep } from '@molecule/app-onboarding-modal-angular'
 *
 * @Component({
 *   selector: 'app-onboarding',
 *   standalone: true,
 *   imports: [OnboardingModal],
 *   template: `
 *     <mol-onboarding-modal
 *       [open]="open()"
 *       [steps]="steps"
 *       [onClose]="close"
 *       [onComplete]="close"
 *     ></mol-onboarding-modal>
 *   `,
 * })
 * export class Onboarding {
 *   readonly steps: OnboardingStep[] = [
 *     { id: 'welcome', title: 'Welcome!', body: 'Let us show you around.' },
 *     { id: 'features', title: 'Key Features', body: 'Build apps in minutes.' },
 *     { id: 'done', title: "You're all set", body: 'Start your first project.' },
 *   ]
 *   readonly open = signal(true)
 *   readonly close = (): void => this.open.set(false)
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and an Angular i18n provider — the composed
 * `Modal` / `Button` (from `@molecule/app-ui-angular`) and `useTranslation()`
 * all depend on them. Pair with `@molecule/app-onboarding-modal-locales` for
 * the Skip / Back / Next / Get-started strings in 79 languages.
 *
 * Step position is UNCONTROLLED and persists across close/reopen — a user who
 * closed on step 3 reopens on step 3. `onComplete` fires only from the
 * final-step button; closing via Skip or the chrome close button calls
 * `onClose` alone — persist "onboarding seen" in `onClose` if skipping should
 * count as done.
 *
 * @module
 */

export * from './onboarding-modal.component.js'
export * from './types.js'
