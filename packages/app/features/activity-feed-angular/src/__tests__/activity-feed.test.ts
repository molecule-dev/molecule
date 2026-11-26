// @vitest-environment jsdom
/**
 * Unit tests of the Angular `ActivityFeed`, `ActivityFeedGroup` and
 * `ActivityFeedItem` — the port of
 * `@molecule/app-activity-feed-react`'s own suite. The React suite renders the
 * components with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular adapter
 * uses) and asserts the same markup.
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

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* class was applied without a real bond.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// `Avatar` is the only `@molecule/app-ui-angular` component dependency — stub it
// to an inspectable `<img>`-bearing div carrying the supplied src, the same
// marker the React suite's `@molecule/app-ui-react` stub renders.
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Avatar: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-avatar]',
      standalone: true,
      inputs: ['src', 'alt', 'name', 'size'],
      template: '',
      host: {
        '[attr.data-avatar]': 'src ?? ""',
      },
    })(
      class MockAvatar {
        /** Image source. */
        src?: string
        /** Alt text. */
        alt?: string
        /** Display name. */
        name?: string
        /** Size preset. */
        size?: unknown
      },
    ),
  }
})

const { ActivityFeed } = await import('../activity-feed.component.js')
const { ActivityFeedGroup } = await import('../activity-feed-group.component.js')
const { ActivityFeedItem } = await import('../activity-feed-item.component.js')
import type { ActivityFeedItemData } from '../types.js'

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** A counter giving every spec host a distinct selector (Angular warns on duplicates). */
let hostCounter = 0

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: `mol-spec-host-${hostCounter++}`,
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
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
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

const item = (id: string, over: Partial<ActivityFeedItemData> = {}): ActivityFeedItemData => ({
  id,
  actor: `actor-${id}`,
  verb: `verb-${id}`,
  timestamp: `ts-${id}`,
  ...over,
})

const render = async (
  component: Type<unknown>,
  template: string,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/** The `ActivityFeedItem` host template: the element plus its two inputs. */
const ITEM_TEMPLATE = `<article mol-activity-feed-item [item]="p['item']" [className]="p['className']"></article>`

/** The `ActivityFeed` host template with no projected content. */
const FEED_TEMPLATE = `<mol-activity-feed [items]="p['items']" [className]="p['className']"></mol-activity-feed>`

/** The `ActivityFeedGroup` host template. */
const GROUP_TEMPLATE = `<section mol-activity-feed-group [heading]="p['heading']" [items]="p['items']" [className]="p['className']"></section>`

describe('ActivityFeedItem', () => {
  it('renders the actor, verb, and timestamp', async () => {
    const m = await render(ActivityFeedItem, ITEM_TEMPLATE, { item: item('a') })
    expect(m.host.innerHTML).toContain('actor-a')
    expect(m.host.innerHTML).toContain('verb-a')
    expect(m.host.innerHTML).toContain('ts-a')
  })

  it('renders the target when present', async () => {
    const m = await render(ActivityFeedItem, ITEM_TEMPLATE, {
      item: item('a', { target: 'tgt-a' }),
    })
    expect(m.host.innerHTML).toContain('tgt-a')
  })

  it('omits the target span when the item has no target', async () => {
    const m = await render(ActivityFeedItem, ITEM_TEMPLATE, { item: item('a') })
    expect(m.host.innerHTML).not.toContain('tgt-')
  })

  it('renders the body when present', async () => {
    const m = await render(ActivityFeedItem, ITEM_TEMPLATE, { item: item('a', { body: 'body-a' }) })
    expect(m.host.innerHTML).toContain('body-a')
  })

  it('omits the body block when the item has no body', async () => {
    const m = await render(ActivityFeedItem, ITEM_TEMPLATE, { item: item('a') })
    expect(m.host.innerHTML).not.toContain('body-')
  })

  it('renders the Avatar from avatarSrc when no icon is given', async () => {
    const m = await render(ActivityFeedItem, ITEM_TEMPLATE, {
      item: item('a', { avatarSrc: 'pic.png' }),
    })
    expect(m.host.innerHTML).toContain('data-avatar="pic.png"')
  })

  it('renders the icon and suppresses the avatar when both are supplied', async () => {
    // An icon node reaches Angular as an embedded template, which the conformance
    // kit builds; a text icon covers the same precedence branch here.
    const m = await render(ActivityFeedItem, ITEM_TEMPLATE, {
      item: item('a', { avatarSrc: 'pic.png', icon: 'icon-text' }),
    })
    expect(m.host.innerHTML).toContain('icon-text')
    expect(m.host.innerHTML).not.toContain('data-avatar')
  })

  it('renders neither icon nor avatar when the item has neither', async () => {
    const m = await render(ActivityFeedItem, ITEM_TEMPLATE, { item: item('a') })
    expect(m.host.innerHTML).not.toContain('data-avatar')
    expect(m.host.innerHTML).not.toContain('data-icon')
  })

  it('forwards className onto the row wrapper', async () => {
    const m = await render(ActivityFeedItem, ITEM_TEMPLATE, {
      item: item('a'),
      className: 'row-cls',
    })
    expect(m.host.innerHTML).toContain('row-cls')
  })
})

describe('ActivityFeed', () => {
  it('renders one row per item', async () => {
    const m = await render(ActivityFeed, FEED_TEMPLATE, {
      items: [item('a'), item('b'), item('c')],
    })
    expect(m.host.innerHTML).toContain('actor-a')
    expect(m.host.innerHTML).toContain('actor-b')
    expect(m.host.innerHTML).toContain('actor-c')
  })

  it('renders the emptyState when items is empty and emptyState is given', async () => {
    const m = await render(
      ActivityFeed,
      `<mol-activity-feed [items]="p['items']"><p slot="emptyState" data-empty>Nothing yet</p></mol-activity-feed>`,
      { items: [] },
    )
    expect(m.host.innerHTML).toContain('data-empty')
    expect(m.host.innerHTML).toContain('Nothing yet')
  })

  it('renders an empty wrapper (not the emptyState branch) when items is empty and none supplied', async () => {
    const m = await render(ActivityFeed, FEED_TEMPLATE, { items: [] })
    expect(m.host.innerHTML).not.toContain('actor-')
  })

  it('falls through to the list (not emptyState) when items is non-empty', async () => {
    const m = await render(
      ActivityFeed,
      `<mol-activity-feed [items]="p['items']"><p slot="emptyState" data-empty></p></mol-activity-feed>`,
      { items: [item('a')] },
    )
    expect(m.host.innerHTML).toContain('actor-a')
    expect(m.host.innerHTML).not.toContain('data-empty')
  })

  it('renders the footer after the items', async () => {
    const m = await render(
      ActivityFeed,
      `<mol-activity-feed [items]="p['items']"><button slot="footer" type="button" data-footer>Load more</button></mol-activity-feed>`,
      { items: [item('a')] },
    )
    expect(m.host.innerHTML).toContain('data-footer')
    expect(m.host.innerHTML.indexOf('actor-a')).toBeLessThan(
      m.host.innerHTML.indexOf('data-footer'),
    )
  })

  it('forwards className onto the outer wrapper', async () => {
    const m = await render(ActivityFeed, FEED_TEMPLATE, {
      items: [item('a')],
      className: 'feed-cls',
    })
    expect(m.host.innerHTML).toContain('feed-cls')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of emptyState', async () => {
    const m = await render(
      ActivityFeed,
      `<mol-activity-feed [items]="p['items']"><ng-container ngProjectAs="[slot=emptyState]">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</ng-container></mol-activity-feed>`,
      { items: [], xs: ['a', 'c'] },
    )
    const labels = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    expect(labels()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(labels()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(labels()).toEqual(['a', 'c'])
  })

  it('shows and removes the empty-state wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      ActivityFeed,
      `<mol-activity-feed [items]="p['items']">@if (p['on']) {<p slot="emptyState" data-empty>Nothing yet</p>}</mol-activity-feed>`,
      { items: [], on: false },
    )
    expect(m.host.innerHTML).not.toContain('data-empty')
    expect(m.host.querySelector('div')).not.toBeNull()
    await m.setProps({ on: true })
    expect(m.host.innerHTML).toContain('data-empty')
    expect(m.host.innerHTML).toContain('Nothing yet')
    expect(m.host.querySelector('div')).toBeNull()
    await m.setProps({ on: false })
    expect(m.host.innerHTML).not.toContain('data-empty')
    expect(m.host.querySelector('div')).not.toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const tags = (m: Mounted): string[] =>
      Array.from(m.host.children).map((el) => el.tagName.toLowerCase())
    const m = await render(
      ActivityFeed,
      `<i>a</i><mol-activity-feed [items]="p['items']"><p slot="emptyState" data-empty>Nothing yet</p></mol-activity-feed><i>b</i>`,
      { items: [item('a')] },
    )
    // React's root here is the wrapper <div>, flanked by the consumer's siblings.
    expect(tags(m)).toEqual(['i', 'div', 'i'])
    expect(m.host.querySelector('mol-activity-feed')).toBeNull()
    await m.setProps({ items: [] })
    // React's root becomes the bare empty state: the projected <p>, no wrapper, no host.
    expect(tags(m)).toEqual(['i', 'p', 'i'])
    expect(m.host.querySelector('mol-activity-feed')).toBeNull()
  })
})

describe('ActivityFeedGroup', () => {
  it('renders the heading', async () => {
    const m = await render(ActivityFeedGroup, GROUP_TEMPLATE, {
      heading: 'Yesterday',
      items: [item('a')],
    })
    expect(m.host.innerHTML).toContain('Yesterday')
  })

  it('renders one row per item in the group', async () => {
    const m = await render(ActivityFeedGroup, GROUP_TEMPLATE, {
      heading: 'Today',
      items: [item('a'), item('b')],
    })
    expect(m.host.innerHTML).toContain('actor-a')
    expect(m.host.innerHTML).toContain('actor-b')
  })

  it('renders a <section> with an <h3> heading', async () => {
    const m = await render(ActivityFeedGroup, GROUP_TEMPLATE, { heading: 'Last week', items: [] })
    expect(m.host.innerHTML.startsWith('<section')).toBe(true)
    expect(m.host.innerHTML).toContain('<h3')
  })

  it('forwards className onto the section', async () => {
    const m = await render(ActivityFeedGroup, GROUP_TEMPLATE, {
      heading: 'Today',
      items: [item('a')],
      className: 'group-cls',
    })
    expect(m.host.innerHTML).toContain('group-cls')
  })
})
