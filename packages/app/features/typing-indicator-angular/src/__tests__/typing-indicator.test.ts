// @vitest-environment jsdom
/**
 * Unit tests of `TypingIndicator` — the port of
 * `@molecule/app-typing-indicator-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
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
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import type { DotPulseMotion } from '@molecule/app-ui'

// The ClassMap's typing pulse recipe; `undefined` leaves the component on `DEFAULT_TYPING_PULSE`.
let recipe: DotPulseMotion | undefined

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React tests use. The real module is spread in, so
// `DEFAULT_TYPING_PULSE` is the real value.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'typingPulse') return recipe
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

const { TypingIndicator } = await import('../typing-indicator.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param props - The props object the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [TypingIndicator as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<mol-typing-indicator [visible]="p['visible']" [dotSize]="p['dotSize']" [durationMs]="p['durationMs']" [ariaLabel]="p['ariaLabel']" [className]="p['className']" />`,
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
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts the indicator between two fixed siblings, the way a consumer list
 * would, and returns a setter for its visibility.
 *
 * @param visible - Whether the indicator starts out visible.
 * @returns The mounted host and a setter that toggles visibility.
 */
async function renderInList(visible: boolean): Promise<Mounted & { set(next: boolean): void }> {
  const Host = Component({
    selector: 'mol-spec-list-host',
    standalone: true,
    imports: [TypingIndicator as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<i>a</i><mol-typing-indicator [visible]="visible" /><i>b</i>`,
  })(
    class SpecListHost {
      /** Whether the indicator renders. */
      visible = visible
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const entry = {
    host,
    set: (next: boolean): void => {
      ref.instance.visible = next
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

/**
 * A host with two indicators: the first is mounted from the start and takes
 * its duration from `durationMs`; the second mounts only while `second` is set.
 */
const PairHost = Component({
  selector: 'mol-spec-pair-host',
  standalone: true,
  imports: [TypingIndicator as Type<unknown>],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<mol-typing-indicator [durationMs]="durationMs" />@if (second) { <mol-typing-indicator /> }`,
})(
  class SpecPairHost {
    /** The first indicator's animation duration in ms. */
    durationMs = 800
    /** Whether the second indicator is mounted. */
    second = false
  },
)

/**
 * Mounts {@link PairHost}, so a test can change the ClassMap's pulse recipe
 * between the two indicators' first renders and re-render the first one by
 * changing its duration.
 *
 * @returns The mounted host, the setter that adds the second indicator and the setter that changes the first one's duration.
 */
async function renderPair(): Promise<
  Mounted & { addSecond(): void; setDuration(next: number): void }
> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(PairHost, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const entry = {
    host,
    addSecond: (): void => {
      ref.instance.second = true
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    setDuration: (next: number): void => {
      ref.instance.durationMs = next
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

describe('TypingIndicator', () => {
  it('renders nothing when visible is false', async () => {
    const m = await mount({ visible: false })
    mounted.push(m)
    expect(m.host.querySelector('span[role="status"]')).toBeNull()
    expect(m.host.innerHTML).not.toContain('border-radius')
  })

  it('renders role="status" with a default aria-label', async () => {
    const m = await mount({})
    mounted.push(m)
    const status = m.host.querySelector('span[role="status"]')
    expect(status).not.toBeNull()
    expect(status?.getAttribute('aria-label')).toBe('Typing…')
  })

  it('honours a custom aria-label', async () => {
    const m = await mount({ ariaLabel: 'Alice is typing' })
    mounted.push(m)
    expect(m.host.innerHTML).toContain('aria-label="Alice is typing"')
  })

  it('renders three animated dots', async () => {
    const m = await mount({})
    mounted.push(m)
    expect(m.host.innerHTML.match(/border-radius:\s*50%/g) ?? []).toHaveLength(3)
  })

  it('sizes the dots from the dotSize prop', async () => {
    const m = await mount({ dotSize: 10 })
    mounted.push(m)
    expect(m.host.innerHTML).toContain('width: 10px')
  })

  it('injects a keyframes <style> tag', async () => {
    const m = await mount({})
    mounted.push(m)
    expect(m.host.querySelector('style')).not.toBeNull()
    expect(m.host.innerHTML).toContain('@keyframes molecule-typing-pulse')
  })

  it('stops the pulse when motion is reduced', async () => {
    const m = await mount({})
    mounted.push(m)
    expect(m.host.innerHTML).toContain('@media (prefers-reduced-motion: reduce)')
    expect(m.host.innerHTML).toContain('[data-typing-dot] { animation: none !important; }')
    expect(m.host.innerHTML.match(/data-typing-dot=""/g) ?? []).toHaveLength(3)
  })

  it('forwards className', async () => {
    const m = await mount({ className: 'ti-cls' })
    mounted.push(m)
    expect(m.host.innerHTML).toContain('ti-cls')
  })

  it('uses the ClassMap pulse recipe through the UI element', async () => {
    recipe = { peakAt: 0.25, restAt: 0.75, stagger: 0.125, dimOpacity: 0.2, dimScale: 0.5 }
    try {
      const m = await mount({ durationMs: 800 })
      mounted.push(m)
      expect(m.host.innerHTML).toContain('75%, 100% { opacity: 0.2; transform: scale(0.5); } 25%')
      expect(m.host.innerHTML).toContain('800ms ease-in-out 200ms infinite')
    } finally {
      recipe = undefined
    }
  })

  it('carries a rule for each recipe when two indicators use different pulses', async () => {
    recipe = { peakAt: 0.25, restAt: 0.75, stagger: 0.125, dimOpacity: 0.2, dimScale: 0.5 }
    try {
      const pair = await renderPair()
      recipe = undefined
      pair.addSecond()
      const indicators = pair.host.querySelectorAll('span[role="status"]')
      expect(indicators).toHaveLength(2)
      const [custom, standard] = indicators
      // Each indicator carries the rule it rendered with, as React emits one
      // `<style>` per indicator; keyframes are document-wide, so a custom curve
      // must not overwrite the standard one.
      expect(custom.querySelector('style')?.textContent).toContain(
        '@keyframes molecule-typing-pulse-0_25-0_75-0_2-0_5 {',
      )
      expect(standard.querySelector('style')?.textContent).toContain(
        '@keyframes molecule-typing-pulse {',
      )
      const customDots = custom.querySelectorAll('[data-typing-dot]')
      const standardDots = standard.querySelectorAll('[data-typing-dot]')
      expect(customDots).toHaveLength(3)
      expect(standardDots).toHaveLength(3)
      for (const dot of customDots) {
        expect(dot.getAttribute('style')).toContain('molecule-typing-pulse-0_25-0_75-0_2-0_5')
      }
      for (const dot of standardDots) {
        expect(dot.getAttribute('style')).toContain('molecule-typing-pulse')
        expect(dot.getAttribute('style')).not.toContain('molecule-typing-pulse-')
      }
    } finally {
      recipe = undefined
    }
  })

  it('follows a new pulse recipe when it next renders', async () => {
    recipe = { peakAt: 0.25, restAt: 0.75, stagger: 0.125, dimOpacity: 0.2, dimScale: 0.5 }
    try {
      const pair = await renderPair()
      const style = pair.host.querySelector('style')
      expect(style?.textContent).toContain('@keyframes molecule-typing-pulse-0_25-0_75-0_2-0_5 {')
      recipe = undefined
      // One re-render (an input changes): the same element carries the standard
      // rule and the dots name it, as a React re-render rewrites both.
      pair.setDuration(1600)
      expect(pair.host.querySelectorAll('style')).toHaveLength(1)
      expect(pair.host.querySelector('style')).toBe(style)
      expect(style?.textContent).toContain('@keyframes molecule-typing-pulse {')
      const dots = pair.host.querySelectorAll('[data-typing-dot]')
      expect(dots).toHaveLength(3)
      for (const dot of dots) {
        expect(dot.getAttribute('style')).toContain('1600ms ease-in-out')
        expect(dot.getAttribute('style')).toContain('molecule-typing-pulse')
        expect(dot.getAttribute('style')).not.toContain('molecule-typing-pulse-')
      }
    } finally {
      recipe = undefined
    }
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await renderInList(true)
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    // React's root is the `<span>`; it renders bare between the two consumer
    // siblings, with no `mol-typing-indicator` element of its own.
    expect(children()).toEqual(['i', 'span', 'i'])
    // Hidden, React renders nothing at all.
    m.set(false)
    expect(children()).toEqual(['i', 'i'])
  })
})
