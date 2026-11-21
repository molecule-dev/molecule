// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ModerationQueue` — a port of
 * `@molecule/app-moderation-queue-react/src/__tests__/ModerationQueue.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * React's suite stubs the wired classmap and wraps the component in
 * `I18nProvider`; this port stubs the classmap the same way and bonds the real
 * simple i18n provider (empty dictionaries, whose `t` returns the
 * `defaultValue` with `{{count}}` interpolated).
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
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

// The bonded provider `useTranslation()` falls back to (React's
// `useTranslation` contract): empty dictionaries, so every `t` returns its
// English defaultValue.
setI18nProvider(
  createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ]),
)

import { createApp, defineComponent, h, nextTick, shallowReactive, type VNodeChild } from 'vue'

import { ModerationQueue, severityColor } from '../ModerationQueue.js'
import type { ModerationItem, ModerationQueueProps } from '../types.js'

/** A mounted queue: its host element, a props setter and a teardown. */
interface Mounted {
  /** The element the app is mounted into. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes the render. */
  setProps(next: Partial<ModerationQueueProps>): Promise<void>
  /** Unmounts the app and removes the host. */
  destroy(): void
}

/**
 * Mounts a {@link ModerationQueue} with the given props.
 *
 * @param props - The component props.
 * @returns The mounted queue.
 */
const render = (props: ModerationQueueProps): Mounted => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const state = shallowReactive<{ props: ModerationQueueProps }>({ props })
  const app = createApp(defineComponent({ render: () => h(ModerationQueue, state.props) }))
  app.mount(host)
  return {
    host,
    setProps: async (next: Partial<ModerationQueueProps>) => {
      state.props = { ...state.props, ...next }
      await nextTick()
    },
    destroy: () => {
      app.unmount()
      host.remove()
    },
  }
}

/** The nodes mounted by the running test, torn down after each. */
const mounted: Mounted[] = []

/**
 * Mounts a queue and tracks it for teardown.
 *
 * @param props - The component props.
 * @returns The mounted queue.
 */
const mount = (props: ModerationQueueProps): Mounted => {
  const m = render(props)
  mounted.push(m)
  return m
}

/** The props every rendering test passes (the two required handlers). */
const handlers = { onApprove: (): void => {}, onReject: (): void => {} }

/** A paragraph node holding the preview text. */
const preview = (id: string, text: string): VNodeChild => h('p', { 'data-testid': `p-${id}` }, text)

const baseItems: ModerationItem[] = [
  {
    id: 'r-1',
    kind: 'comment',
    preview: preview('r-1', 'Flagged comment text'),
    reason: 'Hate speech',
    reportedBy: '@alice',
    reportedAt: '2m ago',
    severity: 'high',
  },
  {
    id: 'r-2',
    kind: 'image',
    preview: preview('r-2', 'Flagged image alt'),
    reason: 'NSFW',
    reportedAt: '5m ago',
    severity: 'medium',
  },
  {
    id: 'r-3',
    kind: 'post',
    preview: preview('r-3', 'Flagged post body'),
    reason: 'Spam',
    reportedAt: '12m ago',
    severity: 'low',
  },
]

afterEach(() => {
  for (const m of mounted.splice(0)) m.destroy()
  document.body.innerHTML = ''
})

describe('severityColor', () => {
  it('maps low → info, medium → warning, high → error', () => {
    expect(severityColor('low')).toBe('info')
    expect(severityColor('medium')).toBe('warning')
    expect(severityColor('high')).toBe('error')
  })

  it('falls back to info when severity is undefined', () => {
    expect(severityColor(undefined)).toBe('info')
  })
})

describe('<ModerationQueue> empty + loading states', () => {
  it('renders the loading state when loading is true', () => {
    const { host } = mount({ items: [], loading: true, ...handlers })
    expect(host.querySelector('[data-mol-id="moderation-queue-loading"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="moderation-queue"]')).toBeNull()
  })

  it('renders the empty state when items is empty and loading is false', () => {
    const { host } = mount({ items: [], ...handlers })
    expect(host.querySelector('[data-mol-id="moderation-queue-empty"]')).not.toBeNull()
  })

  it('renders a custom emptyState slot when provided', () => {
    const { host } = mount({
      items: [],
      ...handlers,
      emptyState: h('span', { 'data-testid': 'custom-empty' }, 'Inbox zero'),
    })
    expect(host.querySelector('[data-testid="custom-empty"]')).not.toBeNull()
  })
})

describe('<ModerationQueue> rows', () => {
  it('renders one row per item with kind + severity attributes', () => {
    const { host } = mount({ items: baseItems, ...handlers })
    const rows = host.querySelectorAll('[data-mol-id="moderation-queue-row"]')
    expect(rows.length).toBe(3)
    expect(rows[0]!.getAttribute('data-mol-row-id')).toBe('r-1')
    expect(rows[0]!.getAttribute('data-mol-kind')).toBe('comment')
    expect(rows[0]!.getAttribute('data-mol-severity')).toBe('high')
    expect(rows[1]!.getAttribute('data-mol-severity')).toBe('medium')
    expect(rows[2]!.getAttribute('data-mol-severity')).toBe('low')
  })

  it('renders preview, reason, reporter, and timestamp on a row', () => {
    const { host } = mount({ items: baseItems, ...handlers })
    const row = host.querySelector('[data-mol-row-id="r-1"]')!
    expect(row.querySelector('[data-mol-id="moderation-queue-row-preview"]')?.textContent).toBe(
      'Flagged comment text',
    )
    expect(row.querySelector('[data-mol-id="moderation-queue-row-reason"]')?.textContent).toContain(
      'Hate speech',
    )
    expect(
      row.querySelector('[data-mol-id="moderation-queue-row-reported-by"]')?.textContent,
    ).toContain('@alice')
    expect(row.querySelector('[data-mol-id="moderation-queue-row-reported-at"]')?.textContent).toBe(
      '2m ago',
    )
  })

  it('omits reportedBy when not provided', () => {
    const { host } = mount({ items: baseItems, ...handlers })
    const row2 = host.querySelector('[data-mol-row-id="r-2"]')!
    expect(row2.querySelector('[data-mol-id="moderation-queue-row-reported-by"]')).toBeNull()
  })

  it('renders escalate / mute buttons only when handlers are provided', async () => {
    const m = mount({ items: baseItems, ...handlers })
    expect(m.host.querySelectorAll('[data-mol-id="moderation-queue-row-escalate"]').length).toBe(0)
    expect(m.host.querySelectorAll('[data-mol-id="moderation-queue-row-mute"]').length).toBe(0)

    await m.setProps({
      items: baseItems,
      onApprove: handlers.onApprove,
      onReject: handlers.onReject,
      onEscalate: () => {},
      onMute: () => {},
    })
    expect(m.host.querySelectorAll('[data-mol-id="moderation-queue-row-escalate"]').length).toBe(3)
    expect(m.host.querySelectorAll('[data-mol-id="moderation-queue-row-mute"]').length).toBe(3)
  })

  it('fires onApprove / onReject / onEscalate / onMute with the row id', () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()
    const onEscalate = vi.fn()
    const onMute = vi.fn()
    const { host } = mount({ items: baseItems, onApprove, onReject, onEscalate, onMute })
    const row = host.querySelector('[data-mol-row-id="r-2"]')!
    ;(row.querySelector('[data-mol-id="moderation-queue-row-approve"]') as HTMLElement).click()
    ;(row.querySelector('[data-mol-id="moderation-queue-row-reject"]') as HTMLElement).click()
    ;(row.querySelector('[data-mol-id="moderation-queue-row-escalate"]') as HTMLElement).click()
    ;(row.querySelector('[data-mol-id="moderation-queue-row-mute"]') as HTMLElement).click()
    expect(onApprove).toHaveBeenCalledWith('r-2')
    expect(onReject).toHaveBeenCalledWith('r-2')
    expect(onEscalate).toHaveBeenCalledWith('r-2')
    expect(onMute).toHaveBeenCalledWith('r-2')
  })
})

describe('<ModerationQueue> bulk selection', () => {
  it('toggles a single row via its checkbox', async () => {
    const { host } = mount({ items: baseItems, ...handlers })
    const row = host.querySelector('[data-mol-row-id="r-1"]')!
    const cb = row.querySelector('[data-mol-id="moderation-queue-row-select"]') as HTMLInputElement
    expect(cb.checked).toBe(false)
    cb.click()
    await nextTick()
    expect(cb.checked).toBe(true)
    cb.click()
    await nextTick()
    expect(cb.checked).toBe(false)
  })

  it('select-all checkbox selects every row, second click clears selection', async () => {
    const { host } = mount({ items: baseItems, ...handlers })
    const all = host.querySelector(
      '[data-mol-id="moderation-queue-select-all"]',
    ) as HTMLInputElement
    all.click()
    await nextTick()
    const rowCbs = Array.from(
      host.querySelectorAll('[data-mol-id="moderation-queue-row-select"]'),
    ) as HTMLInputElement[]
    expect(rowCbs.every((cb) => cb.checked)).toBe(true)
    expect(all.checked).toBe(true)

    all.click()
    await nextTick()
    const rowCbs2 = Array.from(
      host.querySelectorAll('[data-mol-id="moderation-queue-row-select"]'),
    ) as HTMLInputElement[]
    expect(rowCbs2.every((cb) => !cb.checked)).toBe(true)
    expect(all.checked).toBe(false)
  })

  it('disables bulk action buttons until at least one row is selected', async () => {
    const onBulk = vi.fn()
    const { host } = mount({
      items: baseItems,
      onApprove: handlers.onApprove,
      onReject: handlers.onReject,
      onEscalate: () => {},
      onMute: () => {},
      onBulkAction: onBulk,
    })
    const approve = host.querySelector(
      '[data-mol-id="moderation-queue-bulk-approve"]',
    ) as HTMLButtonElement
    expect(approve.disabled).toBe(true)

    const firstRowCb = host.querySelector(
      '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-select"]',
    ) as HTMLInputElement
    firstRowCb.click()
    await nextTick()
    expect(approve.disabled).toBe(false)
  })

  it('calls onBulkAction with the selected ids and clears selection', async () => {
    const onBulk = vi.fn()
    const { host } = mount({
      items: baseItems,
      onApprove: handlers.onApprove,
      onReject: handlers.onReject,
      onEscalate: () => {},
      onMute: () => {},
      onBulkAction: onBulk,
    })
    ;(
      host.querySelector(
        '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-select"]',
      ) as HTMLElement
    ).click()
    await nextTick()
    ;(
      host.querySelector(
        '[data-mol-row-id="r-3"] [data-mol-id="moderation-queue-row-select"]',
      ) as HTMLElement
    ).click()
    await nextTick()
    ;(host.querySelector('[data-mol-id="moderation-queue-bulk-reject"]') as HTMLElement).click()
    await nextTick()
    expect(onBulk).toHaveBeenCalledTimes(1)
    expect(onBulk.mock.calls[0]![0]).toBe('reject')
    expect(onBulk.mock.calls[0]![1]).toEqual(['r-1', 'r-3'])
    // After firing, selection should clear (so disabled returns to true).
    const approve = host.querySelector(
      '[data-mol-id="moderation-queue-bulk-approve"]',
    ) as HTMLButtonElement
    expect(approve.disabled).toBe(true)
  })

  it('omits the bulk-action button group entirely when onBulkAction is not provided', () => {
    const { host } = mount({ items: baseItems, ...handlers })
    expect(host.querySelector('[data-mol-id="moderation-queue-bulk-actions"]')).toBeNull()
    // Select-all checkbox is still present.
    expect(host.querySelector('[data-mol-id="moderation-queue-select-all"]')).not.toBeNull()
  })

  it('omits escalate / mute bulk buttons when their per-row handlers are not provided', () => {
    const onBulk = vi.fn()
    const { host } = mount({ items: baseItems, ...handlers, onBulkAction: onBulk })
    expect(host.querySelector('[data-mol-id="moderation-queue-bulk-approve"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="moderation-queue-bulk-reject"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="moderation-queue-bulk-escalate"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="moderation-queue-bulk-mute"]')).toBeNull()
  })
})
