// @vitest-environment jsdom
/**
 * Unit tests for the Vue `Stepper` — a port of
 * `@molecule/app-stepper-react/src/__tests__/stepper.test.tsx`: the same test
 * names and the same behavioral assertions, rendered with Vue in jsdom and
 * asserted on the markup and DOM the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `w`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { createApp, defineComponent, h } from 'vue'

import type { StepperProps } from '../types.js'

const { Stepper } = await import('../Stepper.js')

interface Mounted {
  /** The mounted app's host element. */
  host: HTMLElement
  /** Unmounts the app. */
  destroy(): void
}

const apps: Mounted[] = []

/**
 * Renders a `Stepper` with the given props and returns its host.
 *
 * @param props - The stepper props.
 * @returns The mounted host and a teardown.
 */
function render(props: StepperProps): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(Stepper, props) }))
  app.mount(host)
  const mounted: Mounted = {
    host,
    destroy: () => {
      app.unmount()
      host.remove()
    },
  }
  apps.push(mounted)
  return mounted
}

/** The markup one render produced. */
const html = (props: StepperProps): string => render(props).host.innerHTML

afterEach(() => {
  for (const mounted of apps.splice(0)) mounted.destroy()
})

const steps = [
  { id: 'a', label: 'Cart' },
  { id: 'b', label: 'Shipping' },
  { id: 'c', label: 'Payment' },
]

describe('Stepper', () => {
  it('renders every step label in the default dots variant', () => {
    const markup = html({ steps, currentStep: 1 })
    expect(markup).toContain('Cart')
    expect(markup).toContain('Shipping')
    expect(markup).toContain('Payment')
  })

  it('shows a check for completed steps and a number for the rest (dots)', () => {
    const markup = html({ steps, currentStep: 1 })
    // step 0 completed => ✓, steps 1 & 2 => numbers 2 and 3
    expect(markup).toContain('✓')
    expect(markup).toContain('>2<')
    expect(markup).toContain('>3<')
  })

  it('marks the current step with aria-current="step"', () => {
    const markup = html({ steps, currentStep: 1 })
    expect(markup.match(/aria-current="step"/g) ?? []).toHaveLength(1)
  })

  it('renders a progress bar fill for the bar variant', () => {
    const markup = html({ steps, currentStep: 1, variant: 'bar' })
    // currentStep 1 of 3 => 50%
    expect(markup).toMatch(/width:\s*50%/)
  })

  it('renders numbered card buttons for the cards variant', () => {
    const markup = html({ steps, currentStep: 0, variant: 'cards' })
    expect(markup).toContain('1. Cart')
    expect(markup).toContain('2. Shipping')
  })

  it('forwards className', () => {
    const markup = html({ steps, currentStep: 0, className: 'stp-cls' })
    expect(markup).toContain('stp-cls')
  })

  it('tags every dots step with a data-mol-id', () => {
    const markup = html({ steps, currentStep: 1, onStepClick: () => {} })
    expect(markup).toContain('data-mol-id="stepper-step-a"')
    expect(markup).toContain('data-mol-id="stepper-step-b"')
    expect(markup).toContain('data-mol-id="stepper-step-c"')
  })

  it('dots: clicking ANY step invokes onStepClick with that step id and index (per doc)', () => {
    const onStepClick = vi.fn()
    const { host } = render({ steps, currentStep: 1, variant: 'dots', onStepClick })
    // completed (0), current (1) and pending (2) all fire in the dots variant
    for (const [id, index] of [
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ] as const) {
      const btn = host.querySelector(`[data-mol-id="stepper-step-${id}"]`) as HTMLButtonElement
      expect(btn).not.toBeNull()
      btn.click()
      expect(onStepClick).toHaveBeenCalledWith(id, index)
    }
    expect(onStepClick).toHaveBeenCalledTimes(3)
  })

  it('dots: with no onStepClick the dots are non-interactive (disabled, no handler)', () => {
    const { host } = render({ steps, currentStep: 1, variant: 'dots' })
    const btn = host.querySelector('[data-mol-id="stepper-step-b"]') as HTMLButtonElement
    expect(btn.hasAttribute('disabled')).toBe(true)
    expect(btn.getAttribute('onclick')).toBeNull()
  })

  it('cards: only completed steps are clickable; others render disabled (per doc)', () => {
    const onStepClick = vi.fn()
    // currentStep 2 => steps 0,1 completed, step 2 current
    const { host } = render({ steps, currentStep: 2, variant: 'cards', onStepClick })

    const completed = host.querySelector('[data-mol-id="stepper-step-a"]') as HTMLButtonElement
    expect(completed.hasAttribute('disabled')).toBe(false)
    completed.click()
    expect(onStepClick).toHaveBeenCalledWith('a', 0)

    const current = host.querySelector('[data-mol-id="stepper-step-c"]') as HTMLButtonElement
    expect(current.hasAttribute('disabled')).toBe(true)
    expect(onStepClick).toHaveBeenCalledTimes(1)
  })
})
