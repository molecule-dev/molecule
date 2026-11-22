// @vitest-environment jsdom
/**
 * Unit tests of `NotificationCenter` — the port of
 * `@molecule/app-notification-center-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same behavioral facts.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t` resolves
// to the inline English default.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-button` / `data-alert` markers the React tests mock the UI package
// with. Both are standalone attribute components, so the host element carries
// the marker and the caller's `(click)` stays a native DOM listener.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'size', 'className', 'disabled', 'type'],
      host: { 'data-button': '' },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button size. */
        size?: string
      },
    ),
    Alert: Component({
      selector: 'div[mol-alert]',
      standalone: true,
      inputs: ['status'],
      host: { '[attr.data-alert]': 'status ?? ""' },
      template: `<ng-content></ng-content>`,
    })(
      class MockAlert {
        /** Alert status. */
        status?: string
      },
    ),
  }
})

const { NotificationCenter } = await import('../notification-center.component.js')

const items = [
  { id: '1', title: 'New comment', body: 'on your post', timestamp: '2m', read: false },
  { id: '2', title: 'Build passed', read: true },
]

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly innerHTML: string
  /** The mounted component's host element (the notification center root). */
  readonly element: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the component through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @param content - Projected content (a node-valued prop slot).
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>, content = ''): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [NotificationCenter as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div mol-notification-center [items]="p['items']" [onMarkAllRead]="p['onMarkAllRead']" [onViewAll]="p['onViewAll']" [emptyState]="p['emptyState']" [title]="p['title']" [className]="p['className']" [lastError]="p['lastError']" [onRetry]="p['onRetry']">${content}</div>`,
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
  const element = host.querySelector('[mol-notification-center]') as HTMLElement
  return {
    get innerHTML() {
      return host.innerHTML
    },
    element,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts a `NotificationCenter` with the given props and projected content.
 *
 * @param props - The center's props.
 * @param content - Projected content (a node-valued prop slot).
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown>, content = ''): Promise<Mounted> => {
  const m = await mount(props, content)
  mounted.push(m)
  return m
}

/** Renders and returns the host markup. */
const markup = async (props: Record<string, unknown>, content = ''): Promise<string> =>
  (await render(props, content)).innerHTML

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('NotificationCenter', () => {
  it('renders the default title and a custom title', async () => {
    expect(await markup({ items })).toContain('Notifications')
    expect(await markup({ items, title: 'Alerts' })).toContain('Alerts')
  })

  it('renders an item per notification with title and body', async () => {
    const html = await markup({ items })
    expect(html).toContain('New comment')
    expect(html).toContain('on your post')
    expect(html).toContain('Build passed')
  })

  it('renders the unread dot + tint only on unread items', async () => {
    const html = await markup({ items })
    // one unread item → one tinted row and one dot
    expect(html.split('bgPrimarySubtle').length - 1).toBe(1)
    expect(html.split('roundedFull').length - 1).toBe(1)
    expect(html).not.toContain('rgba(96')
  })

  it("an unread row is tinted with the theme's primary, not a fixed colour", async () => {
    const html = await markup({ items })
    // the theme token, not an inline background
    expect(html).toContain('bgPrimarySubtle')
    expect(html).not.toContain('background:')
    // a read row is unchanged: no tint
    const read = await markup({ items: [{ id: '2', title: 'Build passed', read: true }] })
    expect(read).not.toContain('bgPrimarySubtle')
  })

  it('an unread row announces Unread to screen readers', async () => {
    const html = await markup({ items })
    // the sr-only label through t(), announced before the title
    expect(html).toContain('srOnly')
    expect(html).toContain('Unread')
    // absent on a read row
    const read = await markup({ items: [{ id: '2', title: 'Build passed', read: true }] })
    expect(read).not.toContain('srOnly')
    expect(read).not.toContain('Unread')
  })

  it('renders the default empty message when there are no items', async () => {
    expect(await markup({ items: [] })).toContain('No notifications')
  })

  it('renders a custom emptyState when supplied', async () => {
    const html = await markup({ items: [] }, '<p slot="emptyState" data-empty></p>All caught up')
    expect(html).toContain('data-empty')
  })

  it('renders mark-all-read and view-all only when their handlers + items exist', async () => {
    const full = await markup({ items, onMarkAllRead: () => {}, onViewAll: () => {} })
    expect(full).toContain('Mark all as read')
    expect(full).toContain('View all')
    const empty = await markup({ items: [], onMarkAllRead: () => {}, onViewAll: () => {} })
    expect(empty).not.toContain('Mark all as read')
    expect(empty).not.toContain('View all')
  })

  it('forwards className', async () => {
    const m = await render({ items, className: 'ncn-cls' })
    expect(m.element.getAttribute('class') ?? '').toContain('ncn-cls')
  })

  describe('error banner (lastError)', () => {
    it('renders no banner when lastError is unset', async () => {
      expect(await markup({ items })).not.toContain('data-alert')
    })

    it('renders an error banner with retry text when lastError is set, even though items are already loaded', async () => {
      const html = await markup({ items, lastError: new Error('Network error') })
      expect(html).toContain('data-alert="error"')
      expect(html).toContain('Could not load notifications.')
      expect(html).toContain('Retry')
      // The banner must not replace the (stale-but-populated) list.
      expect(html).toContain('New comment')
      expect(html).toContain('Build passed')
    })

    it('renders the banner alongside the empty state when there are no items yet', async () => {
      const html = await markup({ items: [], lastError: new Error('boom') })
      expect(html).toContain('data-alert="error"')
      expect(html).toContain('No notifications')
    })

    it('clicking the retry button invokes onRetry (wired to refresh())', async () => {
      const onRetry = vi.fn()
      const m = await render({ items, lastError: new Error('x'), onRetry })
      const retryButton = m.element.querySelector('[data-mol-id="notification-center-retry"]')
      expect(retryButton).not.toBeNull()
      ;(retryButton as HTMLElement).click()
      expect(onRetry).toHaveBeenCalledOnce()
    })
  })
})
