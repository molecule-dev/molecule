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

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React tests use.
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
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<mol-typing-indicator [visible]="p['visible']" [dotSize]="p['dotSize']" [durationMs]="p['durationMs']" [ariaLabel]="p['ariaLabel']" [className]="p['className']" />`,
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

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

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
})
