import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-i18n', () => ({
  t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue: string }) =>
    opts?.defaultValue
      ? Object.entries(values ?? {}).reduce(
          (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
          opts.defaultValue,
        )
      : key,
}))

import type { Activity } from '../components/activity-utilities.js'
import {
  ACTIVITY_TYPES,
  activityFromEvent,
  activityIcon,
  activityStatusColors,
  activityStatusLabel,
  activitySummaryLine,
  activityTypeLabel,
  filterActivitiesByType,
} from '../components/activity-utilities.js'

function act(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'a1',
    type: 'email',
    status: 'captured',
    timestamp: '2026-05-24T10:00:00.000Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// activityIcon
// ---------------------------------------------------------------------------

describe('activityIcon', () => {
  it('returns a distinct glyph per type', () => {
    const icons = ACTIVITY_TYPES.map(activityIcon)
    expect(new Set(icons).size).toBe(ACTIVITY_TYPES.length)
  })

  it('uses the documented email glyph', () => {
    expect(activityIcon('email')).toBe('\u{1F4E7}')
  })

  it('uses # for channel', () => {
    expect(activityIcon('channel')).toBe('#')
  })
})

// ---------------------------------------------------------------------------
// activityTypeLabel / activityStatusLabel
// ---------------------------------------------------------------------------

describe('activityTypeLabel', () => {
  it('maps webhook to the plural tab label', () => {
    expect(activityTypeLabel('webhook')).toBe('Webhooks')
  })
  it('maps sms to SMS', () => {
    expect(activityTypeLabel('sms')).toBe('SMS')
  })
})

describe('activityStatusLabel', () => {
  it('translates each status', () => {
    expect(activityStatusLabel('captured')).toBe('Captured')
    expect(activityStatusLabel('sent')).toBe('Sent')
    expect(activityStatusLabel('delivered')).toBe('Delivered')
    expect(activityStatusLabel('failed')).toBe('Failed')
  })
})

// ---------------------------------------------------------------------------
// activityStatusColors
// ---------------------------------------------------------------------------

describe('activityStatusColors', () => {
  it('uses red for failed and green for delivered', () => {
    expect(activityStatusColors('failed').fg).toBe('#f85149')
    expect(activityStatusColors('delivered').fg).toBe('#3fb950')
  })
  it('returns both fg and bg', () => {
    const c = activityStatusColors('sent')
    expect(c.fg).toBeTruthy()
    expect(c.bg).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// activitySummaryLine
// ---------------------------------------------------------------------------

describe('activitySummaryLine', () => {
  it('appends recipient after an arrow', () => {
    expect(
      activitySummaryLine({ type: 'email', summary: 'Welcome email', recipient: 'a@b.com' }),
    ).toBe('Welcome email → a@b.com')
  })

  it('omits the arrow when no recipient', () => {
    expect(activitySummaryLine({ type: 'push', summary: 'Order shipped' })).toBe('Order shipped')
  })

  it('falls back to a type-specific default when no summary', () => {
    expect(activitySummaryLine({ type: 'sms', recipient: '+1555' })).toBe('SMS captured → +1555')
  })

  it('trims whitespace in summary and recipient', () => {
    expect(
      activitySummaryLine({ type: 'email', summary: '  Hi  ', recipient: '  x@y.com  ' }),
    ).toBe('Hi → x@y.com')
  })
})

// ---------------------------------------------------------------------------
// activityFromEvent
// ---------------------------------------------------------------------------

describe('activityFromEvent', () => {
  it('normalizes a full event payload', () => {
    const a = activityFromEvent({
      id: 'evt1',
      type: 'webhook',
      status: 'delivered',
      recipient: '/orders.created',
      summary: 'Webhook POST',
      timestamp: '2026-05-24T10:00:00.000Z',
    })
    expect(a).toEqual({
      id: 'evt1',
      type: 'webhook',
      status: 'delivered',
      recipient: '/orders.created',
      summary: 'Webhook POST',
      timestamp: '2026-05-24T10:00:00.000Z',
    })
  })

  it('supplies defaults for missing fields', () => {
    const a = activityFromEvent({ summary: 'thing' })
    expect(a.id).toBeTruthy()
    expect(a.type).toBe('webhook')
    expect(a.status).toBe('captured')
    expect(a.timestamp).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// filterActivitiesByType
// ---------------------------------------------------------------------------

describe('filterActivitiesByType', () => {
  const list: Activity[] = [
    act({ id: '1', type: 'email' }),
    act({ id: '2', type: 'sms' }),
    act({ id: '3', type: 'email' }),
    act({ id: '4', type: 'push' }),
  ]

  it('returns all when type is null', () => {
    expect(filterActivitiesByType(list, null)).toHaveLength(4)
  })

  it('keeps only the matching type', () => {
    const emails = filterActivitiesByType(list, 'email')
    expect(emails.map((a) => a.id)).toEqual(['1', '3'])
  })

  it('returns empty when no match', () => {
    expect(filterActivitiesByType(list, 'channel')).toHaveLength(0)
  })
})
