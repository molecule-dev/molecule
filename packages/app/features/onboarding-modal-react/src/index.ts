/**
 * Multi-step onboarding overlay.
 *
 * Exports `<OnboardingModal>` and `OnboardingStep` type.
 *
 * @example
 * ```tsx
 * import { OnboardingModal, OnboardingStep } from '@molecule/app-onboarding-modal-react'
 *
 * const steps: OnboardingStep[] = [
 *   { id: 'welcome', title: 'Welcome!', body: 'Let us show you around.' },
 *   { id: 'features', title: 'Key Features', body: 'Build apps in minutes.' },
 *   { id: 'done', title: "You're all set", body: 'Start your first project.' },
 * ]
 *
 * <OnboardingModal
 *   open={showOnboarding}
 *   steps={steps}
 *   onClose={() => setShowOnboarding(false)}
 *   onComplete={() => router.push('/dashboard')}
 * />
 * ```
 *
 * @module
 */

export * from './OnboardingModal.js'
