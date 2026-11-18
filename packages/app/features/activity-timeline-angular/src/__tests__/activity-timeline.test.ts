// @vitest-environment jsdom
/**
 * Unit tests of the Angular `ActivityTimeline` and `ActivityTimelineDot` — the
 * port of
 * `@molecule/app-activity-timeline-react`'s own suite. The React suite renders
 * the components with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular adapter
 * uses) and asserts the same markup strings.
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

// A Proxy ClassMap that echoes each accessed member name back as its token, so
// tests can assert *which* cm.* member a class came from (e.g. `card`,
// `bgBorder`, `textMuted`) without depending on the Tailwind bond's concrete
// strings. Any raw literal a component still hardcodes would pass straight
// through `cn` unchanged and show up verbatim — which the negative sweeps catch.
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

const { ActivityTimeline } = await import('../activity-timeline.component.js')
const { ActivityTimelineDot } = await import('../activity-timeline-dot.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

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
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
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
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/** Mounts a timeline through the JIT host and tracks it for teardown. */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-activity-timeline [events]="p['events']" [className]="p['className']"></div>`,
    ActivityTimeline as Type<unknown>,
    { events, ...props },
  )
  mounted.push(m)
  return m
}

/** Mounts a dot through the JIT host and tracks it for teardown. */
const renderDot = async (props: Record<string, unknown>): Promise<Mounted> => {
  const m = await mount(
    `<div mol-activity-timeline-dot [tone]="p['tone']" [className]="p['className']"></div>`,
    ActivityTimelineDot as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const events = [
  { id: '1', kind: 'call', title: 'Called Jane', description: 'Left a voicemail', meta: '2h ago' },
  { id: '2', kind: 'email', title: 'Emailed Bob' },
]

/** Concatenate every element's `class` attribute so raw-Tailwind sweeps ignore inline styles. */
function allClasses(container: HTMLElement): string {
  return Array.from(container.querySelectorAll<HTMLElement>('*'))
    .map((el) => el.getAttribute('class') ?? '')
    .join(' ')
}

// Raw Tailwind / light-only literals this migration removed. `material-symbols-outlined`
// is intentionally excluded — it is a required icon-font class, not a styling utility.
const RAW_TAILWIND = [
  'bg-white',
  'bg-surface-container',
  'rounded-3xl',
  'rounded-xl',
  'shadow-sm',
  'text-on-surface',
  'text-on-primary',
  'bg-primary',
  'text-[10px]',
  'before:',
  'slate',
  'text-gray',
  'whitespace-nowrap',
]

describe('ActivityTimeline (theme-aware surface)', () => {
  it('renders the panel from the cm.card() surface token, not a light-only literal', async () => {
    const m = await render()
    const root = m.host.querySelector('[mol-activity-timeline]')
    const cls = root?.getAttribute('class') ?? ''
    expect(cls).toContain('card')
    expect(cls).not.toContain('bg-white')
    expect(cls).not.toContain('bg-surface-container')
    expect(cls).not.toContain('rounded-3xl')
  })

  it('draws the connector rail from the cm.bgBorder theme token (no before: pseudo class)', async () => {
    const m = await render()
    const rail = m.host.querySelector('[aria-hidden]')
    expect(rail).not.toBeNull()
    expect(rail?.getAttribute('class')).toContain('bgBorder')
    // Geometry is inline; only the color comes from a class — and no pseudo-element rail survives.
    expect(allClasses(m.host)).not.toContain('before:')
    expect(allClasses(m.host)).not.toContain('surface-container-high')
  })

  it('forwards a caller className onto the panel', async () => {
    const m = await render({ className: 'tl-x' })
    expect(m.host.querySelector('.tl-x')).not.toBeNull()
  })

  it('emits no raw Tailwind / light-only class on any element', async () => {
    const m = await render()
    const classes = allClasses(m.host)
    for (const raw of RAW_TAILWIND) expect(classes).not.toContain(raw)
  })
})

describe('ActivityTimelineRow text tokens', () => {
  it('titles inherit foreground (no explicit on-surface color) and meta/description use cm.textMuted', async () => {
    const m = await render()
    const heading = m.host.querySelector('h3')
    expect(heading?.getAttribute('class')).not.toContain('text-on-surface')
    // meta span + description paragraph resolve to the muted theme token.
    const classes = allClasses(m.host)
    expect(classes).toContain('textMuted')
    expect(classes).toContain('uppercase')
  })
})

describe('ActivityTimelineDot default tone', () => {
  it('defaults to theme tokens (bgPrimarySubtle + textPrimary), never bg-primary / text-on-primary', async () => {
    const m = await renderDot({ tone: { icon: 'event' } })
    const dot = m.host.querySelector('[mol-activity-timeline-dot]')
    const cls = dot?.getAttribute('class') ?? ''
    expect(cls).toContain('bgPrimarySubtle')
    expect(cls).toContain('textPrimary')
    expect(cls).toContain('roundedFull')
    expect(cls).toContain('position') // cm.position('absolute')
    expect(cls).not.toContain('bg-primary')
    expect(cls).not.toContain('text-on-primary')
  })

  it('honours a consumer-supplied dotClass/iconClass override', async () => {
    const m = await renderDot({
      tone: { icon: 'event', dotClass: 'custom-dot', iconClass: 'custom-icon' },
    })
    const cls = m.host.querySelector('[mol-activity-timeline-dot]')?.getAttribute('class') ?? ''
    expect(cls).toContain('custom-dot')
    expect(cls).toContain('custom-icon')
    expect(cls).not.toContain('bgPrimarySubtle')
  })
})
