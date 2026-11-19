// @vitest-environment jsdom
/**
 * Unit tests of `AnnouncementBar` — the port of
 * `@molecule/app-announcement-bar-react`'s own suite. The React suite renders
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

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `textSize`), so tests can assert which cm.* class was applied without a real
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { AnnouncementBar } = await import('../announcement-bar.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly innerHTML: string
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [AnnouncementBar as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
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
    get innerHTML() {
      return host.innerHTML
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts an `AnnouncementBar` with the given props and message through the
 * app-style host template and returns the host.
 *
 * @param props - The bar's props.
 * @param content - The projected message.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}, content = 'X'): Promise<Mounted> => {
  const m = await mount(
    `<div mol-announcement-bar [kind]="p['kind']" [dismissible]="p['dismissible']" [visible]="p['visible']" [icon]="p['icon']" [action]="p['action']" [className]="p['className']" [dataMolId]="p['dataMolId']">${content}</div>`,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('AnnouncementBar', () => {
  it('renders the message with role="status" and the kind data attribute', async () => {
    const m = await render({ kind: 'promo' }, 'New feature!')
    expect(m.innerHTML).toContain('role="status"')
    expect(m.innerHTML).toContain('data-kind="promo"')
    expect(m.innerHTML).toContain('New feature!')
  })

  it('defaults the kind to "info"', async () => {
    const m = await render()
    expect(m.innerHTML).toContain('data-kind="info"')
  })

  it('renders the icon slot', async () => {
    const m = await render({ icon: 'The icon' })
    expect(m.innerHTML).toContain('The icon')
  })

  it('renders an action as a link when href is given, a button otherwise', async () => {
    const asLink = await render({ action: { label: 'Learn more', href: '/more' } })
    expect(asLink.innerHTML).toContain('href="/more"')
    expect(asLink.innerHTML).toContain('Learn more')
    const asButton = await render({ action: { label: 'Do it' } })
    expect(asButton.innerHTML).toContain('Do it')
    expect(asButton.innerHTML).not.toContain('href=')
  })

  it('renders the dismiss button by default and hides it when dismissible is false', async () => {
    const withDismiss = await render()
    expect(withDismiss.innerHTML).toContain('aria-label="Dismiss"')
    const without = await render({ dismissible: false })
    expect(without.innerHTML).not.toContain('aria-label="Dismiss"')
  })

  it('renders nothing when controlled visible is false', async () => {
    const m = await render({ visible: false })
    expect(m.innerHTML).not.toContain('role="status"')
    expect(m.innerHTML).toBe('')
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await render({ dataMolId: 'ann-x', className: 'ab-cls' })
    expect(m.innerHTML).toContain('data-mol-id="ann-x"')
    expect(m.innerHTML).toContain('ab-cls')
  })
})
