// @vitest-environment jsdom
/**
 * Unit tests of the Angular `OnboardingModal` — the port of
 * `@molecule/app-onboarding-modal-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer and asserts the same
 * markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap mock echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same tokens the React tests' proxy produces. Angular binds the
// results to `[class]`, so the tokens are strings (Angular's class binding
// rejects a function).
vi.mock('@molecule/app-ui', () => {
  const cn = (...cls: unknown[]): string =>
    cls
      .flat(Infinity)
      .map((c) => (typeof c === 'function' ? c() : c))
      .filter((c) => typeof c === 'string' && c.length > 0)
      .join(' ')
  return {
    getClassMap: () => ({
      cn,
      stack: () => 'stack',
      flex: () => 'flex',
      textSize: () => 'textSize',
      fontWeight: () => 'fontWeight',
    }),
  }
})

// The markers the React tests mock `@molecule/app-ui-react` with: a
// `<button data-button>` and a `<div data-modal>` that renders its content
// only while `open`.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, EventEmitter } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'color', 'size'],
      host: { 'data-button': '' },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button color. */
        color?: string
        /** Button size. */
        size?: string
      },
    ),
    Modal: Component({
      selector: 'mol-modal',
      standalone: true,
      inputs: ['open'],
      outputs: ['close'],
      template: `@if (open) {<div data-modal=""><ng-content></ng-content></div>}`,
    })(
      class MockModal {
        /** Whether the dialog shows its content. */
        open?: boolean
        /** The close output the metadata declares (Angular reads it by name). */
        readonly close = new EventEmitter<unknown>()
      },
    ),
  }
})

// `t(key, values, opts)` returns the supplied `defaultValue`, as the React
// suite's mock does.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { OnboardingModal } = await import('../onboarding-modal.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []
/** Counter making each JIT host's component id unique (Angular's NG0912). */
let hostCount = 0

/**
 * Mounts the overlay through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [OnboardingModal],
    changeDetection: ChangeDetectionStrategy.Default,
    host: { 'data-spec-host': String(++hostCount) },
    template: `<mol-onboarding-modal
      [open]="p['open']"
      [onClose]="p['onClose']"
      [steps]="p['steps']"
      [defaultStep]="p['defaultStep']"
    ></mol-onboarding-modal>`,
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
  await appRef.whenStable()
  appRef.tick()
  const entry: Mounted = {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const steps = [
  { id: 's1', title: 'Welcome', body: 'Step one body' },
  { id: 's2', title: 'Connect', body: 'Step two body' },
  { id: 's3', title: 'Done', body: 'Step three body' },
]

describe('OnboardingModal', () => {
  it('renders nothing when steps is empty', async () => {
    const m = await render({ open: true, onClose: () => {}, steps: [] })
    expect(m.host.textContent).toBe('')
  })

  it('renders the first step by default', async () => {
    const m = await render({ open: true, onClose: () => {}, steps })
    expect(m.host.innerHTML).toContain('Welcome')
    expect(m.host.innerHTML).toContain('Step one body')
    expect(m.host.innerHTML).not.toContain('Step two body')
  })

  it('renders the step indicated by defaultStep', async () => {
    const m = await render({ open: true, onClose: () => {}, steps, defaultStep: 1 })
    expect(m.host.innerHTML).toContain('Connect')
  })

  it('shows Skip + Next on a non-last step', async () => {
    const m = await render({ open: true, onClose: () => {}, steps })
    expect(m.host.innerHTML).toContain('Skip')
    expect(m.host.innerHTML).toContain('Next')
    expect(m.host.innerHTML).not.toContain('Get started')
  })

  it('shows the Back button only past the first step', async () => {
    const first = await render({ open: true, onClose: () => {}, steps })
    expect(first.host.innerHTML).not.toContain('Back')
    const second = await render({ open: true, onClose: () => {}, steps, defaultStep: 1 })
    expect(second.host.innerHTML).toContain('Back')
  })

  it('shows the "Get started" CTA on the last step and no Skip', async () => {
    const m = await render({ open: true, onClose: () => {}, steps, defaultStep: 2 })
    expect(m.host.innerHTML).toContain('Get started')
    expect(m.host.innerHTML).not.toContain('Skip')
  })

  it('renders the step media slot when present', async () => {
    // Angular's node props are templates (covered by the conformance suite);
    // the text branch is what a unit host can pass as a value.
    const m = await render({
      open: true,
      onClose: () => {},
      steps: [{ id: 's1', title: 'T', body: 'B', media: 'Illustration' }],
    })
    expect(m.host.innerHTML).toContain('Illustration')
  })

  it('renders nothing visible when the modal is closed', async () => {
    const m = await render({ open: false, onClose: () => {}, steps })
    expect(m.host.textContent).toBe('')
  })
})
