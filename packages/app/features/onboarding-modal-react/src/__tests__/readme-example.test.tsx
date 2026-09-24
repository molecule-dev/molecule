// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { OnboardingModal, type OnboardingStep } from '../index.js'

const steps: OnboardingStep[] = [
  { id: 'welcome', title: 'Welcome!', body: 'Let us show you around.' },
  { id: 'features', title: 'Key Features', body: 'Build apps in minutes.' },
  { id: 'done', title: "You're all set", body: 'Start your first project.' },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered onboarding flow.
 */
function Onboarding(): React.JSX.Element {
  const [open, setOpen] = useState(true)
  const [status, setStatus] = useState<'pending' | 'completed' | 'skipped'>('pending')
  return (
    <>
      <p>Onboarding: {status}</p>
      <OnboardingModal
        open={open}
        steps={steps}
        onComplete={() => setStatus('completed')} // final "Get started" only
        onClose={() => {
          setOpen(false) // also called after onComplete, and by Skip / X / backdrop / Escape
          setStatus((s) => (s === 'pending' ? 'skipped' : s))
        }}
      />
    </>
  )
}

/**
 * Renders the example inside the i18n provider the modal requires.
 *
 * @returns The testing-library render result.
 */
function renderOnboarding(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <Onboarding />
    </I18nProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet) // the Modal's close-button icon throws without it
  })
  afterEach(() => {
    cleanup()
  })

  it('walks through every step and completes', () => {
    const view = renderOnboarding()
    expect(view.getByRole('heading', { name: 'Welcome!' })).toBeTruthy()
    expect(view.queryByRole('button', { name: 'Back' })).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Next' }))
    expect(view.getByRole('heading', { name: 'Key Features' })).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'Back' }))
    expect(view.getByRole('heading', { name: 'Welcome!' })).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'Next' }))
    fireEvent.click(view.getByRole('button', { name: 'Next' }))
    expect(view.getByRole('heading', { name: "You're all set" })).toBeTruthy()
    expect(view.queryByRole('button', { name: 'Skip' })).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Get started' }))
    expect(view.getByText('Onboarding: completed')).toBeTruthy()
    expect(view.queryByRole('heading', { name: "You're all set" })).toBeNull()
  })

  it('records a skip when the user closes early', () => {
    const view = renderOnboarding()
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    expect(view.getByText('Onboarding: skipped')).toBeTruthy()
    expect(view.queryByRole('heading', { name: 'Welcome!' })).toBeNull()
  })
})
