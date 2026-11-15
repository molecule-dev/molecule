// @vitest-environment jsdom
/**
 * Unit tests for the Solid `OnboardingModal` — a port of
 * `@molecule/app-onboarding-modal-react/src/__tests__/onboarding-modal.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { OnboardingStep } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// `t(key, values, opts)` returns the supplied `defaultValue`, as the React
// suite's mock does.
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The markers the React tests mock `@molecule/app-ui-react` with: a `<button
// data-button>` and a `<div data-modal>` that renders its content only while
// `open`.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element }) => <button data-button="">{props.children}</button>,
  Modal: (props: { open: boolean; children?: JSX.Element }) =>
    props.open ? <div data-modal="">{props.children}</div> : null,
}))

const { OnboardingModal } = await import('../OnboardingModal.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** The props a test renders the overlay with. */
interface DrawProps {
  open: boolean
  steps: OnboardingStep[]
  onClose?: (event?: unknown) => void
  onComplete?: () => void
  allowSkip?: boolean
  defaultStep?: number
}

/** Renders {@link OnboardingModal} with Solid's browser renderer and returns its markup. */
function draw(props: DrawProps): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <OnboardingModal
          open={props.open}
          steps={props.steps}
          onClose={props.onClose ?? (() => {})}
          onComplete={props.onComplete}
          allowSkip={props.allowSkip}
          defaultStep={props.defaultStep}
        />
      ),
      container,
    ),
  )
  return container.innerHTML
}

const steps = [
  { id: 's1', title: 'Welcome', body: 'Step one body' },
  { id: 's2', title: 'Connect', body: 'Step two body' },
  { id: 's3', title: 'Done', body: 'Step three body' },
]

describe('OnboardingModal', () => {
  it('renders nothing when steps is empty', () => {
    expect(draw({ open: true, steps: [] })).toBe('')
  })

  it('renders the first step by default', () => {
    const markup = draw({ open: true, steps })
    expect(markup).toContain('Welcome')
    expect(markup).toContain('Step one body')
    expect(markup).not.toContain('Step two body')
  })

  it('renders the step indicated by defaultStep', () => {
    const markup = draw({ open: true, steps, defaultStep: 1 })
    expect(markup).toContain('Connect')
  })

  it('shows Skip + Next on a non-last step', () => {
    const markup = draw({ open: true, steps })
    expect(markup).toContain('Skip')
    expect(markup).toContain('Next')
    expect(markup).not.toContain('Get started')
  })

  it('shows the Back button only past the first step', () => {
    const first = draw({ open: true, steps })
    expect(first).not.toContain('Back')
    const second = draw({ open: true, steps, defaultStep: 1 })
    expect(second).toContain('Back')
  })

  it('shows the "Get started" CTA on the last step and no Skip', () => {
    const markup = draw({ open: true, steps, defaultStep: 2 })
    expect(markup).toContain('Get started')
    expect(markup).not.toContain('Skip')
  })

  it('renders the step media slot when present', () => {
    const markup = draw({
      open: true,
      steps: [{ id: 's1', title: 'T', body: 'B', media: <img data-media="" /> }],
    })
    expect(markup).toContain('data-media=""')
  })

  it('renders nothing visible when the modal is closed', () => {
    expect(draw({ open: false, steps })).toBe('')
  })
})
