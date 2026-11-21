// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ModerationQueue` — a port of
 * `@molecule/app-moderation-queue-react/src/__tests__/ModerationQueue.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom). A fresh
 * mount with new props is this port's `rerender`.
 *
 * React's suite stubs the wired classmap and wraps the component in
 * `I18nProvider`; this port stubs the classmap the same way and bonds the real
 * simple i18n provider (empty dictionaries, whose `t` returns the
 * `defaultValue` with `{{count}}` interpolated).
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
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

import { ModerationQueue } from '../components.js'
import { severityColor } from '../severity.js'
import type { ModerationItem } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The mounted component of the running test, and its container. */
let instance: ReturnType<typeof mount> | null = null
const containers: HTMLElement[] = []

/**
 * Mounts a {@link ModerationQueue} with the given props (a fresh mount, so a
 * second call is this port's `rerender`).
 *
 * @param props - The component props.
 * @returns The element the component rendered into.
 */
const render = (props: Record<string, unknown>): HTMLElement => {
  if (instance) {
    unmount(instance)
    instance = null
  }
  for (const el of containers.splice(0)) el.remove()
  const container = document.createElement('div')
  document.body.appendChild(container)
  containers.push(container)
  instance = mount(ModerationQueue, { target: container, props: props as never })
  flushSync()
  return container
}

/** The props every rendering test passes (the two required handlers). */
const handlers = { onApprove: (): void => {}, onReject: (): void => {} }

/** A paragraph snippet holding the preview text, the way a caller passes it. */
const preview = (id: string, text: string): Snippet => raw(`<p data-testid="p-${id}">${text}</p>`)

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
  if (instance) unmount(instance)
  instance = null
  for (const el of containers.splice(0)) el.remove()
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
    const container = render({ items: [], loading: true, ...handlers })
    expect(container.querySelector('[data-mol-id="moderation-queue-loading"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="moderation-queue"]')).toBeNull()
  })

  it('renders the empty state when items is empty and loading is false', () => {
    const container = render({ items: [], ...handlers })
    expect(container.querySelector('[data-mol-id="moderation-queue-empty"]')).not.toBeNull()
  })

  it('renders a custom emptyState slot when provided', () => {
    const container = render({
      items: [],
      ...handlers,
      emptyState: raw('<span data-testid="custom-empty">Inbox zero</span>'),
    })
    expect(container.querySelector('[data-testid="custom-empty"]')).not.toBeNull()
  })
})

describe('<ModerationQueue> rows', () => {
  it('renders one row per item with kind + severity attributes', () => {
    const container = render({ items: baseItems, ...handlers })
    const rows = container.querySelectorAll('[data-mol-id="moderation-queue-row"]')
    expect(rows.length).toBe(3)
    expect(rows[0]!.getAttribute('data-mol-row-id')).toBe('r-1')
    expect(rows[0]!.getAttribute('data-mol-kind')).toBe('comment')
    expect(rows[0]!.getAttribute('data-mol-severity')).toBe('high')
    expect(rows[1]!.getAttribute('data-mol-severity')).toBe('medium')
    expect(rows[2]!.getAttribute('data-mol-severity')).toBe('low')
  })

  it('renders preview, reason, reporter, and timestamp on a row', () => {
    const container = render({ items: baseItems, ...handlers })
    const row = container.querySelector('[data-mol-row-id="r-1"]')!
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
    const container = render({ items: baseItems, ...handlers })
    const row2 = container.querySelector('[data-mol-row-id="r-2"]')!
    expect(row2.querySelector('[data-mol-id="moderation-queue-row-reported-by"]')).toBeNull()
  })

  it('renders escalate / mute buttons only when handlers are provided', () => {
    const before = render({ items: baseItems, ...handlers })
    expect(before.querySelectorAll('[data-mol-id="moderation-queue-row-escalate"]').length).toBe(0)
    expect(before.querySelectorAll('[data-mol-id="moderation-queue-row-mute"]').length).toBe(0)

    const after = render({
      items: baseItems,
      onApprove: handlers.onApprove,
      onReject: handlers.onReject,
      onEscalate: () => {},
      onMute: () => {},
    })
    expect(after.querySelectorAll('[data-mol-id="moderation-queue-row-escalate"]').length).toBe(3)
    expect(after.querySelectorAll('[data-mol-id="moderation-queue-row-mute"]').length).toBe(3)
  })

  it('fires onApprove / onReject / onEscalate / onMute with the row id', () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()
    const onEscalate = vi.fn()
    const onMute = vi.fn()
    const container = render({ items: baseItems, onApprove, onReject, onEscalate, onMute })
    const row = container.querySelector('[data-mol-row-id="r-2"]')!
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
  it('toggles a single row via its checkbox', () => {
    const container = render({ items: baseItems, ...handlers })
    const row = container.querySelector('[data-mol-row-id="r-1"]')!
    const cb = row.querySelector('[data-mol-id="moderation-queue-row-select"]') as HTMLInputElement
    expect(cb.checked).toBe(false)
    cb.click()
    flushSync()
    expect(cb.checked).toBe(true)
    cb.click()
    flushSync()
    expect(cb.checked).toBe(false)
  })

  it('select-all checkbox selects every row, second click clears selection', () => {
    const container = render({ items: baseItems, ...handlers })
    const all = container.querySelector(
      '[data-mol-id="moderation-queue-select-all"]',
    ) as HTMLInputElement
    all.click()
    flushSync()
    const rowCbs = Array.from(
      container.querySelectorAll('[data-mol-id="moderation-queue-row-select"]'),
    ) as HTMLInputElement[]
    expect(rowCbs.every((cb) => cb.checked)).toBe(true)
    expect(all.checked).toBe(true)

    all.click()
    flushSync()
    const rowCbs2 = Array.from(
      container.querySelectorAll('[data-mol-id="moderation-queue-row-select"]'),
    ) as HTMLInputElement[]
    expect(rowCbs2.every((cb) => !cb.checked)).toBe(true)
    expect(all.checked).toBe(false)
  })

  it('disables bulk action buttons until at least one row is selected', () => {
    const onBulk = vi.fn()
    const container = render({
      items: baseItems,
      onApprove: handlers.onApprove,
      onReject: handlers.onReject,
      onEscalate: () => {},
      onMute: () => {},
      onBulkAction: onBulk,
    })
    const approve = container.querySelector(
      '[data-mol-id="moderation-queue-bulk-approve"]',
    ) as HTMLButtonElement
    expect(approve.disabled).toBe(true)

    const firstRowCb = container.querySelector(
      '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-select"]',
    ) as HTMLInputElement
    firstRowCb.click()
    flushSync()
    expect(approve.disabled).toBe(false)
  })

  it('calls onBulkAction with the selected ids and clears selection', () => {
    const onBulk = vi.fn()
    const container = render({
      items: baseItems,
      onApprove: handlers.onApprove,
      onReject: handlers.onReject,
      onEscalate: () => {},
      onMute: () => {},
      onBulkAction: onBulk,
    })
    ;(
      container.querySelector(
        '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-select"]',
      ) as HTMLElement
    ).click()
    flushSync()
    ;(
      container.querySelector(
        '[data-mol-row-id="r-3"] [data-mol-id="moderation-queue-row-select"]',
      ) as HTMLElement
    ).click()
    flushSync()
    ;(
      container.querySelector('[data-mol-id="moderation-queue-bulk-reject"]') as HTMLElement
    ).click()
    flushSync()
    expect(onBulk).toHaveBeenCalledTimes(1)
    expect(onBulk.mock.calls[0]![0]).toBe('reject')
    expect(onBulk.mock.calls[0]![1]).toEqual(['r-1', 'r-3'])
    // After firing, selection should clear (so disabled returns to true).
    const approve = container.querySelector(
      '[data-mol-id="moderation-queue-bulk-approve"]',
    ) as HTMLButtonElement
    expect(approve.disabled).toBe(true)
  })

  it('omits the bulk-action button group entirely when onBulkAction is not provided', () => {
    const container = render({ items: baseItems, ...handlers })
    expect(container.querySelector('[data-mol-id="moderation-queue-bulk-actions"]')).toBeNull()
    // Select-all checkbox is still present.
    expect(container.querySelector('[data-mol-id="moderation-queue-select-all"]')).not.toBeNull()
  })

  it('omits escalate / mute bulk buttons when their per-row handlers are not provided', () => {
    const onBulk = vi.fn()
    const container = render({ items: baseItems, ...handlers, onBulkAction: onBulk })
    expect(container.querySelector('[data-mol-id="moderation-queue-bulk-approve"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="moderation-queue-bulk-reject"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="moderation-queue-bulk-escalate"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="moderation-queue-bulk-mute"]')).toBeNull()
  })
})
