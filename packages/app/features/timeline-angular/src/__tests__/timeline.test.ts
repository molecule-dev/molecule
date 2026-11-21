// @vitest-environment jsdom
/**
 * Unit tests for the Angular timeline — a port of
 * `@molecule/app-timeline-react/src/__tests__/timeline.test.tsx`: the same test
 * names and behavioral assertions, rendered through Angular's real renderer
 * (the same `createApplication` + JIT host approach the conformance kit's
 * Angular adapter uses) with the mocked ClassMap.
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

const { Timeline } = await import('../timeline.component.js')
const { TimelineDate } = await import('../timeline-date.component.js')
const { TimelineEvent } = await import('../timeline-event.component.js')
const { TimelineRail } = await import('../timeline-rail.component.js')
import type { TimelineEventData } from '../types.js'

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts a JIT host template that renders the component under test, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element plus any `ng-template` refs).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [Timeline, TimelineDate, TimelineEvent, TimelineRail],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props

      /**
       * Records one separator render call, once per event id, and returns the id
       * for the snapshot (Angular re-evaluates the binding on every pass).
       *
       * @param event - The event the separator precedes.
       * @param prev - Its predecessor.
       * @returns The event id.
       */
      record(event: TimelineEventData, prev?: TimelineEventData): string {
        const seen = this.p['seen'] as Array<[string, string | undefined]> | undefined
        const ids = this.p['seenIds'] as Set<string> | undefined
        if (seen && ids && !ids.has(event.id)) {
          ids.add(event.id)
          seen.push([event.id, prev?.id])
        }
        return event.id
      }
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
  // A second pass settles projected content and template-ref bindings.
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

const render = async (template: string, props: Record<string, unknown> = {}): Promise<string> => {
  const m = await mount(template, props)
  mounted.push(m)
  return m.host.innerHTML
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const ev = (id: string, over: Partial<TimelineEventData> = {}): TimelineEventData => ({
  id,
  timestamp: `ts-${id}`,
  title: `title-${id}`,
  ...over,
})

const RAIL = `<div mol-timeline-rail [marker]="p['marker']" [connector]="p['connector']" [className]="p['className']"></div>`

const EVENT = `<div mol-timeline-event [event]="p['event']" [isLast]="p['isLast']" [className]="p['className']"></div>`

describe('TimelineRail', () => {
  it('renders a default "•" marker when none is given', async () => {
    expect(await render(RAIL)).toContain('•')
  })

  it('marks the default marker aria-hidden', async () => {
    expect(await render(RAIL)).toContain('aria-hidden="true"')
  })

  it('renders a supplied marker instead of the default dot', async () => {
    const markup = await render(
      `<div mol-timeline-rail [marker]="m"></div><ng-template #m><i data-marker=""></i></ng-template>`,
    )
    expect(markup).toContain('data-marker=""')
    expect(markup).not.toContain('•')
  })

  it('renders the vertical connector by default', async () => {
    expect(await render(RAIL)).toContain('border-left: 1px solid')
  })

  it('omits the connector when connector={false}', async () => {
    expect(await render(RAIL, { connector: false })).not.toContain('border-left: 1px solid')
  })

  it('forwards className', async () => {
    expect(await render(RAIL, { className: 'rail-cls' })).toContain('rail-cls')
  })
})

describe('TimelineEvent', () => {
  it('renders the event timestamp, title, and body', async () => {
    const markup = await render(EVENT, { event: ev('a', { body: 'body-a' }) })
    expect(markup).toContain('ts-a')
    expect(markup).toContain('title-a')
    expect(markup).toContain('body-a')
  })

  it('omits the body block when the event has no body', async () => {
    const markup = await render(EVENT, { event: ev('a') })
    expect(markup).toContain('title-a')
    // no body text present
    expect(markup).not.toContain('body-')
  })

  it('renders the rail connector when not the last event', async () => {
    const markup = await render(EVENT, { event: ev('a'), isLast: false })
    expect(markup).toContain('border-left: 1px solid')
  })

  it('suppresses the rail connector when isLast', async () => {
    const markup = await render(EVENT, { event: ev('a'), isLast: true })
    expect(markup).not.toContain('border-left: 1px solid')
  })

  it('passes a custom marker through to the rail', async () => {
    const markup = await render(
      `<div mol-timeline-event [event]="{ id: 'a', timestamp: 'ts-a', title: 'title-a', marker: m }"></div><ng-template #m><span data-m=""></span></ng-template>`,
    )
    expect(markup).toContain('data-m=""')
  })

  it('forwards className', async () => {
    expect(await render(EVENT, { event: ev('a'), className: 'evt-cls' })).toContain('evt-cls')
  })
})

describe('TimelineDate', () => {
  it('renders its children', async () => {
    const markup = await render(`<div mol-timeline-date>Yesterday</div>`)
    expect(markup).toContain('Yesterday')
  })

  it('forwards className', async () => {
    const markup = await render(`<div mol-timeline-date [className]="p['className']">Today</div>`, {
      className: 'date-cls',
    })
    expect(markup).toContain('date-cls')
  })
})

describe('Timeline', () => {
  const TIMELINE = `<mol-timeline [events]="p['events']" [className]="p['className']"></mol-timeline>`

  it('renders one row per event', async () => {
    const markup = await render(TIMELINE, { events: [ev('a'), ev('b'), ev('c')] })
    expect(markup).toContain('title-a')
    expect(markup).toContain('title-b')
    expect(markup).toContain('title-c')
  })

  it('renders the emptyState when there are no events and emptyState is given', async () => {
    const markup = await render(
      `<mol-timeline [events]="p['events']"><p slot="emptyState" data-empty="">Nothing yet</p></mol-timeline>`,
      { events: [] },
    )
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('Nothing yet')
  })

  it('renders an empty wrapper (no emptyState) when events is empty and none supplied', async () => {
    // no emptyState → falls through to the mapping branch over an empty array
    const markup = await render(TIMELINE, { events: [] })
    expect(markup).not.toContain('title-')
  })

  it('suppresses the connector on the final event only', async () => {
    const markup = await render(TIMELINE, { events: [ev('a'), ev('b')] })
    // two events → exactly one connector (on the first, not the last)
    const connectors = markup.split('border-left: 1px solid').length - 1
    expect(connectors).toBe(1)
  })

  it('invokes renderDateSeparator with each event and its predecessor', async () => {
    const seen: Array<[string, string | undefined]> = []
    const markup = await render(
      `<mol-timeline [events]="p['events']" [renderDateSeparator]="sep"></mol-timeline><ng-template #sep let-event let-prev="a1"><hr [attr.data-sep]="record(event, prev)" /></ng-template>`,
      { events: [ev('a'), ev('b')], seen, seenIds: new Set<string>() },
    )
    expect(seen).toEqual([
      ['a', undefined],
      ['b', 'a'],
    ])
    expect(markup).toContain('data-sep="a"')
    expect(markup).toContain('data-sep="b"')
  })

  it('forwards className onto the outer wrapper', async () => {
    expect(await render(TIMELINE, { events: [ev('a')], className: 'tl-cls' })).toContain('tl-cls')
  })
})
