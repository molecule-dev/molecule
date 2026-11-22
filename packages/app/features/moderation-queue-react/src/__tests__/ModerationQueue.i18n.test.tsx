// @vitest-environment jsdom
/**
 * Every user-visible string goes through `t()` with a LITERAL key.
 *
 * The component used to build two keys at runtime —
 * `` t(`moderationQueue.kind.${item.kind}`) `` and
 * `` t(`moderationQueue.severity.${item.severity}`) `` — which the i18n
 * parity gate cannot see: a value whose key was missing from the locale bond
 * silently rendered English for every non-English user. These tests mock
 * `useTranslation` with a `t` that marks every key (`«key»`), so a rendered
 * marker proves the exact literal key was requested; a runtime-built key or a
 * string that bypassed `t()` would show up as plain English instead.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { type ModerationItem, ModerationQueue } from '../ModerationQueue.js'

// `useTranslation` mocked to a marker `t`: the rendered text IS the key.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key): (() => string) | undefined {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/** One item per `ModerationItemKind`; the id encodes the kind (`k-<kind>`). */
const items: ModerationItem[] = [
  {
    id: 'k-post',
    kind: 'post',
    preview: <p>Body</p>,
    reason: 'Spam',
    reportedBy: '@alice',
    reportedAt: '2m ago',
    severity: 'low',
  },
  {
    id: 'k-comment',
    kind: 'comment',
    preview: <p>Text</p>,
    reason: 'Hate speech',
    reportedBy: '@bob',
    reportedAt: '5m ago',
    severity: 'medium',
  },
  {
    id: 'k-image',
    kind: 'image',
    preview: <p>Alt</p>,
    reason: 'NSFW',
    reportedBy: '@carol',
    reportedAt: '9m ago',
    severity: 'high',
  },
  {
    id: 'k-message',
    kind: 'message',
    preview: <p>DM</p>,
    reason: 'Harassment',
    reportedAt: '12m ago',
  },
  {
    id: 'k-profile',
    kind: 'profile',
    preview: <p>Bio</p>,
    reason: 'Impersonation',
    reportedAt: '15m ago',
  },
]

const noop = (): void => {}

/** Renders the queue over the full kind × severity item set. */
function renderQueue(extraProps: Record<string, unknown> = {}): ReturnType<typeof render> {
  return render(
    <ModerationQueue
      items={items}
      onApprove={noop}
      onReject={noop}
      onEscalate={noop}
      onMute={noop}
      {...extraProps}
    />,
  )
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => cleanup())

describe('ModerationQueue i18n: kind + severity labels', () => {
  it('requests the literal kind key for every ModerationItemKind value', () => {
    const { container } = renderQueue()
    const kinds = ['post', 'comment', 'image', 'message', 'profile'] as const
    for (const kind of kinds) {
      const row = container.querySelector(`[data-mol-row-id="k-${kind}"]`)
      expect(row, `row for kind ${kind}`).not.toBeNull()
      const meta = row!.querySelector('[data-mol-id="moderation-queue-row-meta"]')
      expect(meta?.textContent).toContain(`«moderationQueue.kind.${kind}»`)
    }
  })

  it('requests the literal severity key for every ModerationItemSeverity value', () => {
    const { container } = renderQueue()
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
    const { container } = renderQueue()
    for (const rowId of ['k-message', 'k-profile']) {
      const row = container.querySelector(`[data-mol-row-id="${rowId}"]`)!
      expect(row.querySelector('[data-mol-id="moderation-queue-row-severity"]')).toBeNull()
    }
  })
})

describe('ModerationQueue i18n: chrome, toolbar and actions', () => {
  it('renders region, toolbar and select-all through literal keys', () => {
    const { container } = renderQueue()
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
    const { container } = renderQueue({ onBulkAction: noop })
    for (const rowId of ['k-post', 'k-comment']) {
      fireEvent.click(
        container.querySelector(
          `[data-mol-row-id="${rowId}"] [data-mol-id="moderation-queue-row-select"]`,
        )!,
      )
    }
    expect(
      container.querySelector('[data-mol-id="moderation-queue-select-all-label"]')?.textContent,
    ).toBe('«moderationQueue.selectedCount»')
  })

  it('renders bulk and per-row action buttons through literal keys', () => {
    const { container } = renderQueue({ onBulkAction: noop })
    const actions = ['approve', 'reject', 'escalate', 'mute'] as const
    for (const action of actions) {
      const bulk = container.querySelector(`[data-mol-id="moderation-queue-bulk-${action}"]`)
      expect(bulk?.textContent).toBe(`«moderationQueue.bulk.${action}»`)
    }
    const row = container.querySelector('[data-mol-row-id="k-post"]')!
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
    const { container } = renderQueue()
    const row = container.querySelector('[data-mol-row-id="k-post"]')!
    expect(
      row.querySelector('[data-mol-id="moderation-queue-row-reported-by"]')?.textContent,
    ).toContain('«moderationQueue.reportedBy»')
    expect(row.querySelector('[data-mol-id="moderation-queue-row-reason"]')?.textContent).toContain(
      '«moderationQueue.reason»',
    )
  })

  it('renders the loading and empty states through literal keys', () => {
    const loading = render(<ModerationQueue items={[]} loading onApprove={noop} onReject={noop} />)
    expect(
      loading.container.querySelector('[data-mol-id="moderation-queue-loading"]')?.textContent,
    ).toBe('«moderationQueue.loading»')
    loading.unmount()

    const empty = render(<ModerationQueue items={[]} onApprove={noop} onReject={noop} />)
    expect(
      empty.container.querySelector('[data-mol-id="moderation-queue-empty"]')?.textContent,
    ).toBe('«moderationQueue.empty»')
  })
})
