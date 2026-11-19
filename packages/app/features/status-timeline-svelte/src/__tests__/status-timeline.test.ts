// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `StatusTimeline` — a port of
 * `@molecule/app-status-timeline-react/src/__tests__/status-timeline.test.tsx`:
 * the same behavioral assertions, rendered with a real Svelte 5 mount (jsdom)
 * and the mocked ClassMap.
 */
import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `statusTimelineList`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use.
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

const { default: StatusTimeline } = await import('../StatusTimeline.svelte')

afterEach(async () => {
  document.body.innerHTML = ''
})

/** Mounts a {@link StatusTimeline} into a fresh host and returns its markup. */
const render = (props: ComponentProps<typeof StatusTimeline>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(StatusTimeline, { target: host, props })
  flushSync()
  const markup = host.innerHTML
  queueMicrotask(() => {
    unmount(instance)
  })
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
