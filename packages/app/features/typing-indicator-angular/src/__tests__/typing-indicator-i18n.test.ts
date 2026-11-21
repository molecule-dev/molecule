// @vitest-environment jsdom
/**
 * The default aria-label goes through i18n — a port of
 * `@molecule/app-typing-indicator-react/src/__tests__/typing-indicator-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer.
 * The label was an inline read-time literal
 * (`this.ariaLabel ?? 'Typing…'`), so it rendered plain English in every
 * locale; these tests mock `useTranslation` with a `t` that marks every key, so
 * a default that bypassed `t()` would show up as plain English.
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

// A Proxy ClassMap that echoes each accessed member name back as its token —
// the same mock the Angular suite uses.
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

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
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

describe('TypingIndicator i18n', () => {
  it('renders the default aria-label through t', async () => {
    const m = await mount({})
    mounted.push(m)
    const status = m.host.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('«typingIndicator.aria.label»')
  })

  it('an explicit ariaLabel overrides the translated label', async () => {
    const m = await mount({ ariaLabel: 'Alice is typing' })
    mounted.push(m)
    const status = m.host.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('Alice is typing')
  })
})
