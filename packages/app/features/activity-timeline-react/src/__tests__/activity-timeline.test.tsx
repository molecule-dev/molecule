// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
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

const { ActivityTimeline } = await import('../ActivityTimeline.js')
const { ActivityTimelineDot } = await import('../ActivityTimelineDot.js')

afterEach(() => cleanup())

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
  it('renders the panel from the cm.card() surface token, not a light-only literal', () => {
    const { container } = render(createElement(ActivityTimeline, { events }))
    const root = container.firstElementChild
    const cls = root?.getAttribute('class') ?? ''
    expect(cls).toContain('card')
    expect(cls).not.toContain('bg-white')
    expect(cls).not.toContain('bg-surface-container')
    expect(cls).not.toContain('rounded-3xl')
  })

  it('draws the connector rail from the cm.bgBorder theme token (no before: pseudo class)', () => {
    const { container } = render(createElement(ActivityTimeline, { events }))
    const rail = container.querySelector('[aria-hidden]')
    expect(rail).not.toBeNull()
    expect(rail?.getAttribute('class')).toContain('bgBorder')
    // Geometry is inline; only the color comes from a class — and no pseudo-element rail survives.
    expect(allClasses(container)).not.toContain('before:')
    expect(allClasses(container)).not.toContain('surface-container-high')
  })

  it('forwards a caller className onto the panel', () => {
    const { container } = render(createElement(ActivityTimeline, { events, className: 'tl-x' }))
    expect(container.querySelector('.tl-x')).not.toBeNull()
  })

  it('emits no raw Tailwind / light-only class on any element', () => {
    const { container } = render(createElement(ActivityTimeline, { events }))
    const classes = allClasses(container)
    for (const raw of RAW_TAILWIND) expect(classes).not.toContain(raw)
  })
})

describe('ActivityTimelineRow text tokens', () => {
  it('titles inherit foreground (no explicit on-surface color) and meta/description use cm.textMuted', () => {
    const { container } = render(createElement(ActivityTimeline, { events }))
    const heading = container.querySelector('h3')
    expect(heading?.getAttribute('class')).not.toContain('text-on-surface')
    // meta span + description paragraph resolve to the muted theme token.
    const classes = allClasses(container)
    expect(classes).toContain('textMuted')
    expect(classes).toContain('uppercase')
  })
})

describe('ActivityTimelineDot default tone', () => {
  it('defaults to theme tokens (bgPrimarySubtle + textPrimary), never bg-primary / text-on-primary', () => {
    const { container } = render(createElement(ActivityTimelineDot, { tone: { icon: 'event' } }))
    const dot = container.firstElementChild
    const cls = dot?.getAttribute('class') ?? ''
    expect(cls).toContain('bgPrimarySubtle')
    expect(cls).toContain('textPrimary')
    expect(cls).toContain('roundedFull')
    expect(cls).toContain('position') // cm.position('absolute')
    expect(cls).not.toContain('bg-primary')
    expect(cls).not.toContain('text-on-primary')
  })

  it('honours a consumer-supplied dotClass/iconClass override', () => {
    const { container } = render(
      createElement(ActivityTimelineDot, {
        tone: { icon: 'event', dotClass: 'custom-dot', iconClass: 'custom-icon' },
      }),
    )
    const cls = container.firstElementChild?.getAttribute('class') ?? ''
    expect(cls).toContain('custom-dot')
    expect(cls).toContain('custom-icon')
    expect(cls).not.toContain('bgPrimarySubtle')
  })
})
