// @vitest-environment jsdom
/**
 * Every user-visible string goes through `t()` with a LITERAL key — the port
 * of `@molecule/app-moderation-queue-react/src/__tests__/ModerationQueue.i18n.test.tsx`:
 * the same test names and assertions, with Svelte's `useTranslation` mocked
 * instead of React's.
 *
 * The mock `t` marks every key (`«key»`), so a rendered marker proves the exact
 * literal key was requested; a runtime-built key or a string that bypassed `t()`
 * would show up as plain English instead. A button's `textContent` is trimmed
 * before the comparison: the shared Svelte `Button`'s template keeps whitespace
 * text nodes around its conditional blocks, which the DOM normalizer collapses
 * and which React's JSX does not emit.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// `useTranslation` mocked to a marker `t`: the rendered text IS the key.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'

import { ModerationQueue } from '../components.js'
import type { ModerationItem } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** One item per `ModerationItemKind`; the id encodes the kind (`k-<kind>`). */
const items: ModerationItem[] = [
  {
    id: 'k-post',
    kind: 'post',
    preview: raw('Body'),
    reason: 'Spam',
    reportedBy: '@alice',
    reportedAt: '2m ago',
    severity: 'low',
  },
  {
    id: 'k-comment',
    kind: 'comment',
    preview: raw('Text'),
    reason: 'Hate speech',
    reportedBy: '@bob',
    reportedAt: '5m ago',
    severity: 'medium',
  },
  {
    id: 'k-image',
    kind: 'image',
    preview: raw('Alt'),
    reason: 'NSFW',
    reportedBy: '@carol',
    reportedAt: '9m ago',
    severity: 'high',
  },
  {
    id: 'k-message',
    kind: 'message',
    preview: raw('DM'),
    reason: 'Harassment',
    reportedAt: '12m ago',
  },
  {
    id: 'k-profile',
    kind: 'profile',
    preview: raw('Bio'),
    reason: 'Impersonation',
    reportedAt: '15m ago',
  },
]

const noop = (): void => {}

/** The mounted component of the running test. */
let instance: ReturnType<typeof mount> | null = null
/** The containers the running test rendered into. */
const containers: HTMLElement[] = []

/**
 * Mounts the queue and returns its container.
 *
 * @param props - The component props.
 * @returns The container element the queue rendered into.
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

/**
 * Renders the queue over the full kind × severity item set.
 *
 * @param extraProps - Extra props merged over the required handlers.
 * @returns The container element.
 */
function renderQueue(extraProps: Record<string, unknown> = {}): HTMLElement {
  return render({
    items,
    onApprove: noop,
    onReject: noop,
    onEscalate: noop,
    onMute: noop,
    ...extraProps,
  })
}

afterEach(() => {
  if (instance) unmount(instance)
  instance = null
  for (const el of containers.splice(0)) el.remove()
  document.body.innerHTML = ''
})

describe('ModerationQueue i18n: kind + severity labels', () => {
  it('requests the literal kind key for every ModerationItemKind value', () => {
    const container = renderQueue()
    const kinds = ['post', 'comment', 'image', 'message', 'profile'] as const
    for (const kind of kinds) {
      const row = container.querySelector(`[data-mol-row-id="k-${kind}"]`)
      expect(row, `row for kind ${kind}`).not.toBeNull()
      const meta = row!.querySelector('[data-mol-id="moderation-queue-row-meta"]')
      expect(meta?.textContent).toContain(`«moderationQueue.kind.${kind}»`)
    }
  })

  it('requests the literal severity key for every ModerationItemSeverity value', () => {
    const container = renderQueue()
    const severityRows = [
      ['low', 'k-post'],
      ['medium', 'k-comment'],
      ['high', 'k-image'],
    ] as const
    for (const [severity, rowId] of severityRows) {
      const chip = container.querySelector(
        `[data-mol-row-id="${rowId}"] [data-mol-id="moderation-queue-row-severity"]`,
      )
      expect(chip, `severity chip ${severity}`).not.toBeNull()
      expect(chip!.textContent).toBe(`«moderationQueue.severity.${severity}»`)
    }
  })

  it('renders no severity text when severity is omitted', () => {
    const container = renderQueue()
    for (const rowId of ['k-message', 'k-profile']) {
      const row = container.querySelector(`[data-mol-row-id="${rowId}"]`)!
      expect(row.querySelector('[data-mol-id="moderation-queue-row-severity"]')).toBeNull()
    }
  })
})

describe('ModerationQueue i18n: chrome, toolbar and actions', () => {
  it('renders region, toolbar and select-all through literal keys', () => {
    const container = renderQueue()
    const region = container.querySelector('[data-mol-id="moderation-queue"]')
    expect(region?.getAttribute('aria-label')).toBe('«moderationQueue.aria.region»')
    const toolbar = container.querySelector('[data-mol-id="moderation-queue-bulk-toolbar"]')
    expect(toolbar?.getAttribute('aria-label')).toBe('«moderationQueue.aria.bulkToolbar»')
    const selectAll = container.querySelector(
      '[data-mol-id="moderation-queue-select-all"]',
    ) as HTMLInputElement
    expect(selectAll.getAttribute('aria-label')).toBe('«moderationQueue.aria.selectAll»')
    // Nothing selected yet → the plain select-all label, not the count form.
    expect(
      container.querySelector('[data-mol-id="moderation-queue-select-all-label"]')?.textContent,
    ).toBe('«moderationQueue.selectAll»')
  })

  it('renders the selected count through its literal key', () => {
    const container = renderQueue({ onBulkAction: noop })
    for (const rowId of ['k-post', 'k-comment']) {
      ;(
        container.querySelector(
          `[data-mol-row-id="${rowId}"] [data-mol-id="moderation-queue-row-select"]`,
        ) as HTMLElement
      ).click()
      flushSync()
    }
    expect(
      container.querySelector('[data-mol-id="moderation-queue-select-all-label"]')?.textContent,
    ).toBe('«moderationQueue.selectedCount»')
  })

  it('renders bulk and per-row action buttons through literal keys', () => {
    const container = renderQueue({ onBulkAction: noop })
    const actions = ['approve', 'reject', 'escalate', 'mute'] as const
    for (const action of actions) {
      const bulk = container.querySelector(`[data-mol-id="moderation-queue-bulk-${action}"]`)
      expect(bulk?.textContent?.trim()).toBe(`«moderationQueue.bulk.${action}»`)
    }
    const row = container.querySelector('[data-mol-row-id="k-post"]')!
    expect(
      row.querySelector('[data-mol-id="moderation-queue-row-select"]')?.getAttribute('aria-label'),
    ).toBe('«moderationQueue.aria.selectRow»')
    for (const action of actions) {
      const button = row.querySelector(`[data-mol-id="moderation-queue-row-${action}"]`)
      expect(button?.getAttribute('aria-label')).toBe(`«moderationQueue.aria.${action}»`)
      expect(button?.textContent?.trim()).toBe(`«moderationQueue.action.${action}»`)
    }
  })

  it('renders reportedBy and reason through literal keys', () => {
    const container = renderQueue()
    const row = container.querySelector('[data-mol-row-id="k-post"]')!
    expect(
      row.querySelector('[data-mol-id="moderation-queue-row-reported-by"]')?.textContent,
    ).toContain('«moderationQueue.reportedBy»')
    expect(row.querySelector('[data-mol-id="moderation-queue-row-reason"]')?.textContent).toContain(
      '«moderationQueue.reason»',
    )
  })

  it('renders the loading and empty states through literal keys', () => {
    const loading = render({ items: [], loading: true, onApprove: noop, onReject: noop })
    expect(loading.querySelector('[data-mol-id="moderation-queue-loading"]')?.textContent).toBe(
      '«moderationQueue.loading»',
    )

    const empty = render({ items: [], onApprove: noop, onReject: noop })
    expect(empty.querySelector('[data-mol-id="moderation-queue-empty"]')?.textContent).toBe(
      '«moderationQueue.empty»',
    )
  })
})
