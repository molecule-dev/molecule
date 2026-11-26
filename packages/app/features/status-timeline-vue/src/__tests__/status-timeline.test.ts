// @vitest-environment jsdom
/**
 * Unit tests for the Vue `StatusTimeline` — a port of
 * `@molecule/app-status-timeline-react/src/__tests__/status-timeline.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `statusTimelineList`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use.
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

import { createApp, defineComponent, h } from 'vue'

import { StatusTimeline } from '../StatusTimeline.js'
import type { StatusTimelineProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link StatusTimeline} and returns the markup it produced. */
const render = (props: StatusTimelineProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(StatusTimeline, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const steps = [
  { key: 'created', label: 'Created' },
  { key: 'review', label: 'In review' },
  { key: 'done', label: 'Done' },
]

describe('StatusTimeline', () => {
  it('renders an <ol> with one <li> per step', () => {
    const markup = render({ steps, currentKey: 'review' })
    expect(markup.startsWith('<ol')).toBe(true)
    expect(markup.match(/<li/g) ?? []).toHaveLength(3)
    expect(markup).toContain('Created')
    expect(markup).toContain('In review')
    expect(markup).toContain('Done')
  })

  it('marks steps at or before the current one as reached (filled dot)', () => {
    const markup = render({ steps, currentKey: 'review' })
    // created + review reached => 2 primary dots, done => 1 idle dot
    expect(markup.split('bgPrimary').length - 1).toBe(2)
    expect(markup.split('statusTimelineDotIdle').length - 1).toBe(1)
  })

  it('bolds the current step label', () => {
    const markup = render({ steps, currentKey: 'review' })
    expect(markup.split('fontWeight').length - 1).toBe(1)
  })

  it('sets the aria-label and data-mol-id', () => {
    const markup = render({
      steps,
      currentKey: 'created',
      ariaLabel: 'Order progress',
      dataMolId: 'st-x',
    })
    expect(markup).toContain('aria-label="Order progress"')
    expect(markup).toContain('data-mol-id="st-x"')
  })

  it('forwards className', () => {
    const markup = render({ steps, currentKey: 'done', className: 'stl-cls' })
    expect(markup).toContain('stl-cls')
  })
})
