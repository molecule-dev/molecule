// @vitest-environment jsdom
/**
 * Every user-visible string goes through `t()` with a LITERAL key — the port
 * of `@molecule/app-moderation-queue-react/src/__tests__/ModerationQueue.i18n.test.tsx`:
 * the same test names and assertions, with Vue's `useTranslation` mocked
 * instead of React's.
 *
 * The mock `t` marks every key (`«key»`), so a rendered marker proves the exact
 * literal key was requested; a runtime-built key or a string that bypassed `t()`
 * would show up as plain English instead.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React tests use.
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

// `useTranslation` mocked to a marker `t`: the rendered text IS the key.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { ModerationQueue } from '../ModerationQueue.js'
import type { ModerationItem, ModerationQueueProps } from '../types.js'

/** A paragraph node holding the preview text. */
const preview = (text: string): VNodeChild => h('p', null, text)

/** One item per `ModerationItemKind`; the id encodes the kind (`k-<kind>`). */
const items: ModerationItem[] = [
  {
    id: 'k-post',
    kind: 'post',
    preview: preview('Body'),
    reason: 'Spam',
    reportedBy: '@alice',
    reportedAt: '2m ago',
    severity: 'low',
  },
  {
    id: 'k-comment',
    kind: 'comment',
    preview: preview('Text'),
    reason: 'Hate speech',
    reportedBy: '@bob',
    reportedAt: '5m ago',
    severity: 'medium',
  },
  {
    id: 'k-image',
    kind: 'image',
    preview: preview('Alt'),
    reason: 'NSFW',
    reportedBy: '@carol',
    reportedAt: '9m ago',
    severity: 'high',
  },
  {
    id: 'k-message',
    kind: 'message',
    preview: preview('DM'),
    reason: 'Harassment',
    reportedAt: '12m ago',
  },
  {
    id: 'k-profile',
    kind: 'profile',
    preview: preview('Bio'),
    reason: 'Impersonation',
    reportedAt: '15m ago',
  },
]

const noop = (): void => {}

/** The mounted queue of the running test, torn down after each. */
let mounted: { host: HTMLElement; destroy: () => void } | null = null

/**
 * Mounts the queue and returns its host element.
 *
 * @param props - The component props.
 * @returns The host element the app rendered into.
 */
const render = (props: ModerationQueueProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ModerationQueue, props) }))
  app.mount(host)
  mounted = {
    host,
    destroy: () => {
      app.unmount()
      host.remove()
    },
  }
  return host
}

/**
 * Renders the queue over the full kind × severity item set.
 *
 * @param extraProps - Extra props merged over the required handlers.
 * @returns The host element.
 */
function renderQueue(extraProps: Partial<ModerationQueueProps> = {}): HTMLElement {
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
  mounted?.destroy()
  mounted = null
  document.body.innerHTML = ''
})

describe('ModerationQueue i18n: kind + severity labels', () => {
  it('requests the literal kind key for every ModerationItemKind value', () => {
    const host = renderQueue()
    const kinds = ['post', 'comment', 'image', 'message', 'profile'] as const
    for (const kind of kinds) {
      const row = host.querySelector(`[data-mol-row-id="k-${kind}"]`)
      expect(row, `row for kind ${kind}`).not.toBeNull()
      const meta = row!.querySelector('[data-mol-id="moderation-queue-row-meta"]')
      expect(meta?.textContent).toContain(`«moderationQueue.kind.${kind}»`)
    }
  })

  it('requests the literal severity key for every ModerationItemSeverity value', () => {
    const host = renderQueue()
    const severityRows = [
      ['low', 'k-post'],
      ['medium', 'k-comment'],
      ['high', 'k-image'],
    ] as const
    for (const [severity, rowId] of severityRows) {
      const chip = host.querySelector(
        `[data-mol-row-id="${rowId}"] [data-mol-id="moderation-queue-row-severity"]`,
      )
      expect(chip, `severity chip ${severity}`).not.toBeNull()
      expect(chip!.textContent).toBe(`«moderationQueue.severity.${severity}»`)
    }
  })

  it('renders no severity text when severity is omitted', () => {
    const host = renderQueue()
    for (const rowId of ['k-message', 'k-profile']) {
      const row = host.querySelector(`[data-mol-row-id="${rowId}"]`)!
      expect(row.querySelector('[data-mol-id="moderation-queue-row-severity"]')).toBeNull()
    }
  })
})

describe('ModerationQueue i18n: chrome, toolbar and actions', () => {
  it('renders region, toolbar and select-all through literal keys', () => {
    const host = renderQueue()
    const region = host.querySelector('[data-mol-id="moderation-queue"]')
    expect(region?.getAttribute('aria-label')).toBe('«moderationQueue.aria.region»')
    const toolbar = host.querySelector('[data-mol-id="moderation-queue-bulk-toolbar"]')
    expect(toolbar?.getAttribute('aria-label')).toBe('«moderationQueue.aria.bulkToolbar»')
    const selectAll = host.querySelector(
      '[data-mol-id="moderation-queue-select-all"]',
    ) as HTMLInputElement
    expect(selectAll.getAttribute('aria-label')).toBe('«moderationQueue.aria.selectAll»')
    // Nothing selected yet → the plain select-all label, not the count form.
    expect(
      host.querySelector('[data-mol-id="moderation-queue-select-all-label"]')?.textContent,
    ).toBe('«moderationQueue.selectAll»')
  })

  it('renders the selected count through its literal key', async () => {
    const host = renderQueue({ onBulkAction: noop })
    for (const rowId of ['k-post', 'k-comment']) {
      ;(
        host.querySelector(
          `[data-mol-row-id="${rowId}"] [data-mol-id="moderation-queue-row-select"]`,
        ) as HTMLElement
      ).click()
      await nextTick()
    }
    expect(
      host.querySelector('[data-mol-id="moderation-queue-select-all-label"]')?.textContent,
    ).toBe('«moderationQueue.selectedCount»')
  })

  it('renders bulk and per-row action buttons through literal keys', () => {
    const host = renderQueue({ onBulkAction: noop })
    const actions = ['approve', 'reject', 'escalate', 'mute'] as const
    for (const action of actions) {
      const bulk = host.querySelector(`[data-mol-id="moderation-queue-bulk-${action}"]`)
      expect(bulk?.textContent).toBe(`«moderationQueue.bulk.${action}»`)
    }
    const row = host.querySelector('[data-mol-row-id="k-post"]')!
    expect(
      row.querySelector('[data-mol-id="moderation-queue-row-select"]')?.getAttribute('aria-label'),
    ).toBe('«moderationQueue.aria.selectRow»')
    for (const action of actions) {
      const button = row.querySelector(`[data-mol-id="moderation-queue-row-${action}"]`)
      expect(button?.getAttribute('aria-label')).toBe(`«moderationQueue.aria.${action}»`)
      expect(button?.textContent).toBe(`«moderationQueue.action.${action}»`)
    }
  })

  it('renders reportedBy and reason through literal keys', () => {
    const host = renderQueue()
    const row = host.querySelector('[data-mol-row-id="k-post"]')!
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
    mounted?.destroy()
    mounted = null

    const empty = render({ items: [], onApprove: noop, onReject: noop })
    expect(empty.querySelector('[data-mol-id="moderation-queue-empty"]')?.textContent).toBe(
      '«moderationQueue.empty»',
    )
  })
})
