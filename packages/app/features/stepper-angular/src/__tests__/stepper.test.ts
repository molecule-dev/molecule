// @vitest-environment jsdom
/**
 * Unit tests of `Stepper` — the port of
 * `@molecule/app-stepper-react/src/__tests__/stepper.test.tsx`: the same test
 * names and the same behavioral assertions. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `w`), so tests can assert which cm.* class was applied without a real
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

const { Stepper } = await import('../stepper.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the `Stepper` through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [Stepper],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-stepper [steps]="p['steps']" [currentStep]="p['currentStep']" [variant]="p['variant']" [orientation]="p['orientation']" [onStepClick]="p['onStepClick']" [className]="p['className']"></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts a `Stepper` with the given props and tracks it for teardown.
 *
 * @param props - The stepper props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const m = await mount(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const steps = [
  { id: 'a', label: 'Cart' },
  { id: 'b', label: 'Shipping' },
  { id: 'c', label: 'Payment' },
]

describe('Stepper', () => {
  it('renders every step label in the default dots variant', async () => {
    const m = await render({ steps, currentStep: 1 })
    expect(m.host.innerHTML).toContain('Cart')
    expect(m.host.innerHTML).toContain('Shipping')
    expect(m.host.innerHTML).toContain('Payment')
  })

  it('shows a check for completed steps and a number for the rest (dots)', async () => {
    const m = await render({ steps, currentStep: 1 })
    // step 0 completed => ✓, steps 1 & 2 => numbers 2 and 3
    expect(m.host.innerHTML).toContain('✓')
    expect(m.host.innerHTML).toContain('>2<')
    expect(m.host.innerHTML).toContain('>3<')
  })

  it('marks the current step with aria-current="step"', async () => {
    const m = await render({ steps, currentStep: 1 })
    expect(m.host.innerHTML.match(/aria-current="step"/g) ?? []).toHaveLength(1)
  })

  it('renders a progress bar fill for the bar variant', async () => {
    const m = await render({ steps, currentStep: 1, variant: 'bar' })
    // currentStep 1 of 3 => 50%
    expect(m.host.innerHTML).toMatch(/width:\s*50%/)
  })

  it('renders numbered card buttons for the cards variant', async () => {
    const m = await render({ steps, currentStep: 0, variant: 'cards' })
    expect(m.host.innerHTML).toContain('1. Cart')
    expect(m.host.innerHTML).toContain('2. Shipping')
  })

  it('forwards className', async () => {
    const m = await render({ steps, currentStep: 0, className: 'stp-cls' })
    expect(m.host.innerHTML).toContain('stp-cls')
  })

  it('tags every dots step with a data-mol-id', async () => {
    const m = await render({ steps, currentStep: 1, onStepClick: () => {} })
    expect(m.host.innerHTML).toContain('data-mol-id="stepper-step-a"')
    expect(m.host.innerHTML).toContain('data-mol-id="stepper-step-b"')
    expect(m.host.innerHTML).toContain('data-mol-id="stepper-step-c"')
  })

  it('dots: clicking ANY step invokes onStepClick with that step id and index (per doc)', async () => {
    const onStepClick = vi.fn()
    const m = await render({ steps, currentStep: 1, variant: 'dots', onStepClick })
    // completed (0), current (1) and pending (2) all fire in the dots variant
    for (const [id, index] of [
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ] as const) {
      const btn = m.host.querySelector(`[data-mol-id="stepper-step-${id}"]`) as HTMLButtonElement
      expect(btn).not.toBeNull()
      btn.click()
      expect(onStepClick).toHaveBeenCalledWith(id, index)
    }
    expect(onStepClick).toHaveBeenCalledTimes(3)
  })

  it('dots: with no onStepClick the dots are non-interactive (disabled, no handler)', async () => {
    const m = await render({ steps, currentStep: 1, variant: 'dots' })
    const btn = m.host.querySelector('[data-mol-id="stepper-step-b"]') as HTMLButtonElement
    expect(btn.hasAttribute('disabled')).toBe(true)
    expect(btn.getAttribute('onclick')).toBeNull()
  })

  it('cards: only completed steps are clickable; others render disabled (per doc)', async () => {
    const onStepClick = vi.fn()
    // currentStep 2 => steps 0,1 completed, step 2 current
    const m = await render({ steps, currentStep: 2, variant: 'cards', onStepClick })

    const completed = m.host.querySelector('[data-mol-id="stepper-step-a"]') as HTMLButtonElement
    expect(completed.hasAttribute('disabled')).toBe(false)
    completed.click()
    expect(onStepClick).toHaveBeenCalledWith('a', 0)

    const current = m.host.querySelector('[data-mol-id="stepper-step-c"]') as HTMLButtonElement
    expect(current.hasAttribute('disabled')).toBe(true)
    expect(onStepClick).toHaveBeenCalledTimes(1)
  })
})
