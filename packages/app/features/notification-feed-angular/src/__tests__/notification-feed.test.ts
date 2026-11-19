// @vitest-environment jsdom
/**
 * Unit tests of the Angular `NotificationFeed` and `fmtRelativeShort` — the
 * port of `@molecule/app-notification-feed-react`'s own suite. The React suite
 * renders the component with mocked dependencies and asserts the markup; this
 * port mounts it through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `card`),
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

// The marker the React tests mock `react-router`'s `Link` with: an anchor
// carrying `data-link` and the destination as its `href`.
vi.mock('@molecule/app-angular', async () => {
  const { Directive } = await import('@angular/core')
  const Link = Directive({
    selector: 'a[molLink]',
    standalone: true,
    inputs: ['molLink'],
    host: { '[attr.href]': 'molLink', 'data-link': '' },
  })(
    class MockLink {
      /** The link's destination. */
      molLink = ''
    },
  )
  return { Link }
})

const { NotificationFeed } = await import('../notification-feed.component.js')
const { fmtRelativeShort } = await import('../fmtRelativeShort.js')
import type { FeedItem } from '../types.js'

/** A counter giving every spec host a distinct selector (Angular warns on duplicates). */
let hostCounter = 0

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element the spec template rendered into. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the feed through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template binds.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: `mol-spec-host-${hostCounter++}`,
    standalone: true,
    imports: [NotificationFeed as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<ul
      mol-notification-feed
      [items]="p['items']"
      [ariaLabel]="p['ariaLabel']"
      [className]="p['className']"
      [dataMolId]="p['dataMolId']"
    ></ul>`,
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

/** Renders a {@link NotificationFeed} and returns the markup it produced. */
const html = async (props: Record<string, unknown>): Promise<string> => {
  const m = await mount(props)
  mounted.push(m)
  return m.host.querySelector('ul')?.outerHTML ?? ''
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/** One feed row, with optional field overrides. */
const item = (id: string, over: Partial<FeedItem> = {}): FeedItem => ({
  id,
  icon: 'check_circle',
  title: `title-${id}`,
  body: `body-${id}`,
  createdAt: new Date(0).toISOString(),
  ...over,
})

describe('fmtRelativeShort', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(10 * 86_400_000)) // 10 days past epoch
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "0m" for future timestamps', () => {
    expect(fmtRelativeShort(new Date(11 * 86_400_000).toISOString())).toBe('0m')
  })

  it('returns minutes under an hour', () => {
    expect(fmtRelativeShort(new Date(10 * 86_400_000 - 12 * 60_000).toISOString())).toBe('12m')
  })

  it('returns hours under a day', () => {
    expect(fmtRelativeShort(new Date(10 * 86_400_000 - 3 * 3_600_000).toISOString())).toBe('3h')
  })

  it('returns days otherwise', () => {
    expect(fmtRelativeShort(new Date(10 * 86_400_000 - 5 * 86_400_000).toISOString())).toBe('5d')
  })
})

describe('NotificationFeed', () => {
  it('renders each item title, body, and icon', async () => {
    const markup = await html({ items: [item('a'), item('b')] })
    expect(markup).toContain('title-a')
    expect(markup).toContain('body-a')
    expect(markup).toContain('title-b')
    expect(markup).toContain('check_circle')
  })

  it('wraps a row in a <Link> when the item has an href, plain otherwise', async () => {
    const withHref = await html({ items: [item('a', { href: '/n/a' })] })
    expect(withHref).toContain('data-link=""')
    expect(withHref).toContain('href="/n/a"')
    const without = await html({ items: [item('a')] })
    expect(without).not.toContain('data-link')
  })

  it('applies the unread accent class only on unread rows', async () => {
    const unread = await html({ items: [item('a', { unread: true })] })
    expect(unread).toContain('notificationFeedUnreadAccent')
    const read = await html({ items: [item('a')] })
    expect(read).not.toContain('notificationFeedUnreadAccent')
  })

  it('sets the aria-label on the <ul> and the data-mol-id', async () => {
    const markup = await html({
      items: [item('a')],
      ariaLabel: 'Notifications',
      dataMolId: 'feed-x',
    })
    expect(markup).toContain('aria-label="Notifications"')
    expect(markup).toContain('data-mol-id="feed-x"')
  })

  it('forwards className onto the <ul>', async () => {
    const markup = await html({ items: [item('a')], className: 'feed-cls' })
    expect(markup).toContain('feed-cls')
  })
})
