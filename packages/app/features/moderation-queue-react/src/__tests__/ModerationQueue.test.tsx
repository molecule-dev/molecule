// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { ModerationQueue, severityColor, type ModerationItem } from '../ModerationQueue.js'

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
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

const baseItems: ModerationItem[] = [
  {
    id: 'r-1',
    kind: 'comment',
    preview: <p data-testid="p-r-1">Flagged comment text</p>,
    reason: 'Hate speech',
    reportedBy: '@alice',
    reportedAt: '2m ago',
    severity: 'high',
  },
  {
    id: 'r-2',
    kind: 'image',
    preview: <p data-testid="p-r-2">Flagged image alt</p>,
    reason: 'NSFW',
    reportedAt: '5m ago',
    severity: 'medium',
  },
  {
    id: 'r-3',
    kind: 'post',
    preview: <p data-testid="p-r-3">Flagged post body</p>,
    reason: 'Spam',
    reportedAt: '12m ago',
    severity: 'low',
  },
]

beforeEach(() => {
  setClassMap(buildStubClassMap())
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
    const { container } = render(
      <Wrap>
        <ModerationQueue items={[]} loading onApprove={() => {}} onReject={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="moderation-queue-loading"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="moderation-queue"]')).toBeNull()
  })

  it('renders the empty state when items is empty and loading is false', () => {
    const { container } = render(
      <Wrap>
        <ModerationQueue items={[]} onApprove={() => {}} onReject={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="moderation-queue-empty"]')).not.toBeNull()
  })

  it('renders a custom emptyState slot when provided', () => {
    const { container } = render(
      <Wrap>
        <ModerationQueue
          items={[]}
          onApprove={() => {}}
          onReject={() => {}}
          emptyState={<span data-testid="custom-empty">Inbox zero</span>}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-testid="custom-empty"]')).not.toBeNull()
  })
})

describe('<ModerationQueue> rows', () => {
  it('renders one row per item with kind + severity attributes', () => {
    const { container } = render(
      <Wrap>
        <ModerationQueue items={baseItems} onApprove={() => {}} onReject={() => {}} />
      </Wrap>,
    )
    const rows = container.querySelectorAll('[data-mol-id="moderation-queue-row"]')
    expect(rows.length).toBe(3)
    expect(rows[0].getAttribute('data-mol-row-id')).toBe('r-1')
    expect(rows[0].getAttribute('data-mol-kind')).toBe('comment')
    expect(rows[0].getAttribute('data-mol-severity')).toBe('high')
    expect(rows[1].getAttribute('data-mol-severity')).toBe('medium')
    expect(rows[2].getAttribute('data-mol-severity')).toBe('low')
  })

  it('renders preview, reason, reporter, and timestamp on a row', () => {
    const { container } = render(
      <Wrap>
        <ModerationQueue items={baseItems} onApprove={() => {}} onReject={() => {}} />
      </Wrap>,
    )
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
    const { container } = render(
      <Wrap>
        <ModerationQueue items={baseItems} onApprove={() => {}} onReject={() => {}} />
      </Wrap>,
    )
    const row2 = container.querySelector('[data-mol-row-id="r-2"]')!
    expect(row2.querySelector('[data-mol-id="moderation-queue-row-reported-by"]')).toBeNull()
  })

  it('renders escalate / mute buttons only when handlers are provided', () => {
    const { container, rerender } = render(
      <Wrap>
        <ModerationQueue items={baseItems} onApprove={() => {}} onReject={() => {}} />
      </Wrap>,
    )
    expect(container.querySelectorAll('[data-mol-id="moderation-queue-row-escalate"]').length).toBe(
      0,
    )
    expect(container.querySelectorAll('[data-mol-id="moderation-queue-row-mute"]').length).toBe(0)

    rerender(
      <Wrap>
        <ModerationQueue
          items={baseItems}
          onApprove={() => {}}
          onReject={() => {}}
          onEscalate={() => {}}
          onMute={() => {}}
        />
      </Wrap>,
    )
    expect(container.querySelectorAll('[data-mol-id="moderation-queue-row-escalate"]').length).toBe(
      3,
    )
    expect(container.querySelectorAll('[data-mol-id="moderation-queue-row-mute"]').length).toBe(3)
  })

  it('fires onApprove / onReject / onEscalate / onMute with the row id', () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()
    const onEscalate = vi.fn()
    const onMute = vi.fn()
    const { container } = render(
      <Wrap>
        <ModerationQueue
          items={baseItems}
          onApprove={onApprove}
          onReject={onReject}
          onEscalate={onEscalate}
          onMute={onMute}
        />
      </Wrap>,
    )
    const row = container.querySelector('[data-mol-row-id="r-2"]')!
    fireEvent.click(row.querySelector('[data-mol-id="moderation-queue-row-approve"]')!)
    fireEvent.click(row.querySelector('[data-mol-id="moderation-queue-row-reject"]')!)
    fireEvent.click(row.querySelector('[data-mol-id="moderation-queue-row-escalate"]')!)
    fireEvent.click(row.querySelector('[data-mol-id="moderation-queue-row-mute"]')!)
    expect(onApprove).toHaveBeenCalledWith('r-2')
    expect(onReject).toHaveBeenCalledWith('r-2')
    expect(onEscalate).toHaveBeenCalledWith('r-2')
    expect(onMute).toHaveBeenCalledWith('r-2')
  })
})

describe('<ModerationQueue> bulk selection', () => {
  it('toggles a single row via its checkbox', () => {
    const { container } = render(
      <Wrap>
        <ModerationQueue items={baseItems} onApprove={() => {}} onReject={() => {}} />
      </Wrap>,
    )
    const row = container.querySelector('[data-mol-row-id="r-1"]')!
    const cb = row.querySelector('[data-mol-id="moderation-queue-row-select"]') as HTMLInputElement
    expect(cb.checked).toBe(false)
    fireEvent.click(cb)
    expect(cb.checked).toBe(true)
    fireEvent.click(cb)
    expect(cb.checked).toBe(false)
  })

  it('select-all checkbox selects every row, second click clears selection', () => {
    const { container } = render(
      <Wrap>
        <ModerationQueue items={baseItems} onApprove={() => {}} onReject={() => {}} />
      </Wrap>,
    )
    const all = container.querySelector(
      '[data-mol-id="moderation-queue-select-all"]',
    ) as HTMLInputElement
    fireEvent.click(all)
    const rowCbs = Array.from(
      container.querySelectorAll('[data-mol-id="moderation-queue-row-select"]'),
    ) as HTMLInputElement[]
    expect(rowCbs.every((cb) => cb.checked)).toBe(true)
    expect(all.checked).toBe(true)

    fireEvent.click(all)
    const rowCbs2 = Array.from(
      container.querySelectorAll('[data-mol-id="moderation-queue-row-select"]'),
    ) as HTMLInputElement[]
    expect(rowCbs2.every((cb) => !cb.checked)).toBe(true)
    expect(all.checked).toBe(false)
  })

  it('disables bulk action buttons until at least one row is selected', () => {
    const onBulk = vi.fn()
    const { container } = render(
      <Wrap>
        <ModerationQueue
          items={baseItems}
          onApprove={() => {}}
          onReject={() => {}}
          onEscalate={() => {}}
          onMute={() => {}}
          onBulkAction={onBulk}
        />
      </Wrap>,
    )
    const approve = container.querySelector(
      '[data-mol-id="moderation-queue-bulk-approve"]',
    ) as HTMLButtonElement
    expect(approve.disabled).toBe(true)

    const firstRowCb = container.querySelector(
      '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-select"]',
    ) as HTMLInputElement
    fireEvent.click(firstRowCb)
    expect(approve.disabled).toBe(false)
  })

  it('calls onBulkAction with the selected ids and clears selection', () => {
    const onBulk = vi.fn()
    const { container } = render(
      <Wrap>
        <ModerationQueue
          items={baseItems}
          onApprove={() => {}}
          onReject={() => {}}
          onEscalate={() => {}}
          onMute={() => {}}
          onBulkAction={onBulk}
        />
      </Wrap>,
    )
    fireEvent.click(
      container.querySelector(
        '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-select"]',
      )!,
    )
    fireEvent.click(
      container.querySelector(
        '[data-mol-row-id="r-3"] [data-mol-id="moderation-queue-row-select"]',
      )!,
    )
    fireEvent.click(container.querySelector('[data-mol-id="moderation-queue-bulk-reject"]')!)
    expect(onBulk).toHaveBeenCalledTimes(1)
    expect(onBulk.mock.calls[0][0]).toBe('reject')
    expect(onBulk.mock.calls[0][1]).toEqual(['r-1', 'r-3'])
    // After firing, selection should clear (so disabled returns to true).
    const approve = container.querySelector(
      '[data-mol-id="moderation-queue-bulk-approve"]',
    ) as HTMLButtonElement
    expect(approve.disabled).toBe(true)
  })

  it('omits the bulk-action button group entirely when onBulkAction is not provided', () => {
    const { container } = render(
      <Wrap>
        <ModerationQueue items={baseItems} onApprove={() => {}} onReject={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="moderation-queue-bulk-actions"]')).toBeNull()
    // Select-all checkbox is still present.
    expect(container.querySelector('[data-mol-id="moderation-queue-select-all"]')).not.toBeNull()
  })

  it('omits escalate / mute bulk buttons when their per-row handlers are not provided', () => {
    const onBulk = vi.fn()
    const { container } = render(
      <Wrap>
        <ModerationQueue
          items={baseItems}
          onApprove={() => {}}
          onReject={() => {}}
          onBulkAction={onBulk}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="moderation-queue-bulk-approve"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="moderation-queue-bulk-reject"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="moderation-queue-bulk-escalate"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="moderation-queue-bulk-mute"]')).toBeNull()
  })
})
