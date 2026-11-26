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
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  type ElementRef,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap mock echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same tokens the React tests' proxy produces. Angular binds the
// results to `[class]`, so the tokens are strings (Angular's class binding
// rejects a function).
vi.mock('@molecule/app-ui', async (importOriginal) => {
  const cn = (...cls: unknown[]): string =>
    cls
      .flat(Infinity)
      .map((c) => (typeof c === 'function' ? c() : c))
      .filter((c) => typeof c === 'string' && c.length > 0)
      .join(' ')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
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
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component, ElementRef, EventEmitter, inject } = await import('@angular/core')
  // No decorators here: this package's tsconfig excludes `src/**/__tests__/**`,
  // so vitest transforms test files without `experimentalDecorators`. The
  // dialog div is found through the DOM instead of a view query.
  class MockModal {
    /** Whether the dialog shows its content. */
    open?: boolean
    /** The close output the metadata declares (Angular reads it by name). */
    readonly close = new EventEmitter<unknown>()
    /** The host element — rest attributes land here first. */
    private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

    /**
     * Moves the host's `data-*`/`aria-*` attributes onto the dialog div —
     * the real `Modal`'s rest-attribute contract (React forwards its rest
     * props onto the dialog element directly).
     */
    ngAfterViewInit(): void {
      const hostEl = this.host.nativeElement
      const dialog = hostEl.querySelector<HTMLElement>('[data-modal]')
      if (!dialog) return
      for (const attr of Array.from(hostEl.attributes)) {
        if (attr.name.startsWith('aria-') || attr.name.startsWith('data-')) {
          dialog.setAttribute(attr.name, attr.value)
          hostEl.removeAttribute(attr.name)
        }
      }
    }
  }
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
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
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-modal',
      standalone: true,
      inputs: ['open'],
      outputs: ['close'],
      template: `@if (open) {<div data-modal=""><ng-content></ng-content></div>}`,
    })(MockModal),
  }
})

// `t(key, values, opts)` returns the supplied `defaultValue`, as the React
// suite's mock does.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
    changeDetection: ChangeDetectionStrategy.Eager,
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
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
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

/**
 * Mounts the overlay between two fixed siblings, the way a consumer list
 * would, and returns a setter for its inputs.
 *
 * @param props - The initial `open` / `steps` inputs.
 * @returns The mounted host and a setter that re-renders with new props.
 */
async function renderInList(
  props: Record<string, unknown>,
): Promise<Mounted & { set(next: Record<string, unknown>): void }> {
  const Host = Component({
    selector: 'mol-spec-list-host',
    standalone: true,
    imports: [OnboardingModal],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-spec-host': String(++hostCount) },
    template: `<i>a</i><mol-onboarding-modal [open]="p['open']" [steps]="p['steps']"></mol-onboarding-modal><i>b</i>`,
  })(
    class SpecListHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { ...props }
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
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
  return {
    ...entry,
    set: (next) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
  }
}

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

  it('the dialog is named by the current step title', async () => {
    const m = await render({ open: true, onClose: () => {}, steps })
    const label = m.host.innerHTML.match(/aria-labelledby="([^"]*)"/)?.[1]
    expect(label).toBeTruthy()
    const heading = m.host.innerHTML.match(
      new RegExp(`<h2[^>]*id="${label}"[^>]*>([\\s\\S]*?)</h2>`),
    )
    expect(heading).toBeTruthy()
    expect(heading?.[1]).toContain('Welcome')

    // The name follows the step: on the second step the labelled heading
    // carries that step's title.
    const second = await render({ open: true, onClose: () => {}, steps, defaultStep: 1 })
    const secondLabel = second.host.innerHTML.match(/aria-labelledby="([^"]*)"/)?.[1]
    const secondHeading = second.host.innerHTML.match(
      new RegExp(`<h2[^>]*id="${secondLabel}"[^>]*>([\\s\\S]*?)</h2>`),
    )
    expect(secondHeading?.[1]).toContain('Connect')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await renderInList({ open: true, steps })
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    expect(children().at(0)).toBe('i')
    expect(children().at(-1)).toBe('i')
    expect(children()).not.toContain('mol-onboarding-modal')
    expect(children()).toEqual(['i', 'mol-modal', 'i'])
    m.set({ open: false, steps: [] })
    expect(children().at(0)).toBe('i')
    expect(children().at(-1)).toBe('i')
    expect(children()).not.toContain('mol-onboarding-modal')
    expect(children()).toEqual(['i', 'mol-modal', 'i'])
  })
})
