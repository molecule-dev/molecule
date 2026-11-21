// @vitest-environment jsdom
/**
 * Unit tests of `IntegrationCard` — the port of
 * `@molecule/app-integration-card-react`'s own suite. The React suite renders
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mutable translation dictionary so a test can simulate a locale override and
// prove the status labels resolve through `t()` (a hardcoded string couldn't
// change). Hoisted so the `vi.mock` factory below can reference it.
const { i18nState } = vi.hoisted(() => ({ i18nState: { dict: {} as Record<string, string> } }))

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `shrink0`), so tests can assert which cm.* class was applied without a real
// bond.
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

// `t(key, values, opts)` returns the dictionary translation when present,
// otherwise echoes the inline `defaultValue` — the canonical English fallback.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      i18nState.dict[key] ?? opts?.defaultValue ?? key,
  }),
}))

// The UI mocks render the same `<button data-button>` the React suite installs
// for `@molecule/app-ui-react`, plus React's inline-style serialization.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    styleText: (style?: Record<string, unknown>): string | null => {
      if (!style) return null
      const parts = Object.entries(style)
        .filter(([, value]) => value !== null && value !== undefined && value !== false)
        .map(
          ([key, value]) =>
            `${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}: ${String(value)}`,
        )
      return parts.length ? parts.join('; ') : null
    },
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['disabled'],
      host: {
        'data-button': '',
        '[disabled]': 'disabled',
      },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Whether the button is disabled. */
        disabled = false
      },
    ),
  }
})

const { IntegrationCard } = await import('../integration-card.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the card through a JIT host template, written the way an Angular app
 * would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @param content - Projected children for the host element's content slots.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>, content = ''): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [IntegrationCard],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div
      mol-integration-card
      [icon]="p['icon']"
      [title]="p['title']"
      [description]="p['description']"
      [status]="p['status']"
      [action]="p['action']"
      [variant]="p['variant']"
      [className]="p['className']"
      [dataMolId]="p['dataMolId']"
    >${content}</div>`,
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
  // The first tick reads the projected slots; the second applies what that
  // read decided (which optional wrappers React would render).
  appRef.tick()
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
 * Mounts one card and tracks it for teardown.
 *
 * @param props - The card's props.
 * @param content - Projected children for the host element's content slots.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown>, content = ''): Promise<Mounted> => {
  const m = await mount(props, content)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  i18nState.dict = {}
})

describe('IntegrationCard', () => {
  it('renders the title inside an <h3>', async () => {
    const m = await render({ title: 'Slack' })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Slack')
  })

  it('renders the description and icon when present', async () => {
    const m = await render(
      { title: 'Slack', description: 'Send notifications to Slack' },
      '<span slot="icon" data-icon></span>',
    )
    expect(m.host.innerHTML).toContain('Send notifications to Slack')
    expect(m.host.innerHTML).toContain('data-icon')
  })

  it('renders the English defaultValue status label for each status', async () => {
    expect((await render({ title: 'S', status: 'connected' })).host.innerHTML).toContain(
      'Connected',
    )
    expect((await render({ title: 'S', status: 'pending' })).host.innerHTML).toContain('Connecting')
    expect((await render({ title: 'S', status: 'error' })).host.innerHTML).toContain('Error')
    // `disconnected` is the default status.
    expect((await render({ title: 'S', status: 'disconnected' })).host.innerHTML).toContain(
      'Not connected',
    )
    expect((await render({ title: 'S' })).host.innerHTML).toContain('Not connected')
  })

  it('routes every status label through t() — a locale override replaces the English default', async () => {
    // If the labels were hardcoded English, none of these overrides could win.
    i18nState.dict = {
      'integrationCard.status.connected': 'Conectado',
      'integrationCard.status.pending': 'Conectando…',
      'integrationCard.status.error': 'Erro',
      'integrationCard.status.disconnected': 'Desconectado',
    }
    const connected = (await render({ title: 'S', status: 'connected' })).host.innerHTML
    expect(connected).toContain('Conectado')
    expect(connected).not.toContain('Connected')

    expect((await render({ title: 'S', status: 'pending' })).host.innerHTML).toContain(
      'Conectando…',
    )
    expect((await render({ title: 'S', status: 'error' })).host.innerHTML).toContain('Erro')

    const disconnected = (await render({ title: 'S', status: 'disconnected' })).host.innerHTML
    expect(disconnected).toContain('Desconectado')
    expect(disconnected).not.toContain('Not connected')
  })

  it('renders the action as a button (onClick) or anchor (href)', async () => {
    const onClick = (await render({ title: 'S', action: { label: 'Connect', onClick: () => {} } }))
      .host.innerHTML
    expect(onClick).toContain('data-button=""')
    expect(onClick).toContain('Connect')
    const href = (await render({ title: 'S', action: { label: 'Connect', href: '/oauth' } })).host
      .innerHTML
    expect(href).toContain('href="/oauth"')
  })

  it('shows the loading glyph when the action is loading', async () => {
    const m = await render({
      title: 'S',
      action: { label: 'Connect', onClick: () => {}, loading: true },
    })
    expect(m.host.innerHTML).toContain('…')
  })

  it('applies a gradient background for the cta variant', async () => {
    const m = await render({ title: 'S', variant: 'cta' })
    expect(m.host.innerHTML).toContain('linear-gradient')
  })

  it('sets data-mol-id and forwards className onto the Card', async () => {
    const m = await render({ title: 'S', dataMolId: 'int-x', className: 'ic-cls' })
    expect(m.host.innerHTML).toContain('data-mol-id="int-x"')
    expect(m.host.innerHTML).toContain('ic-cls')
  })
})
