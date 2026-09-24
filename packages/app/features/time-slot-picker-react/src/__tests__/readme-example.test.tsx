// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type TimeSlot, TimeSlotPicker } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered delivery-window picker.
 */
function DeliveryWindowStep(): React.JSX.Element {
  const windows = [
    { start: '2026-10-02T13:00:00Z', end: '2026-10-02T16:00:00Z', remaining: 3 },
    { start: '2026-10-02T18:00:00Z', end: '2026-10-02T21:00:00Z', remaining: 8 },
    { start: '2026-10-02T22:00:00Z', end: '2026-10-03T00:00:00Z', remaining: 0 },
  ]
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
  const slots: TimeSlot[] = windows.map((w) => ({
    id: w.start,
    label: `${time.format(new Date(w.start))} – ${time.format(new Date(w.end))}`,
    meta: w.remaining > 0 ? `${w.remaining} spots left` : 'Full',
    disabled: w.remaining === 0,
  }))
  const [selectedId, setSelectedId] = useState<string>()
  return (
    <TimeSlotPicker
      title="Pick a delivery window"
      slots={slots}
      selectedId={selectedId}
      onSelect={(slot) => setSelectedId(slot.id)}
      layout="grid"
      columns={3}
    />
  )
}

let root: Root | undefined
let container: HTMLElement

/**
 * Lists the slot radio buttons.
 *
 * @returns The rendered slot buttons.
 */
function radios(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]'))
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })
  afterEach(() => {
    act(() => root?.unmount())
    container.remove()
  })

  it('shows local-time windows, disables the full one, and selects on click', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() =>
      root?.render(
        <I18nProvider provider={createSimpleI18nProvider('en')}>
          <DeliveryWindowStep />
        </I18nProvider>,
      ),
    )
    expect(container.querySelector('h3')?.textContent).toBe('Pick a delivery window')
    expect(container.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe(
      'Pick a delivery window',
    )
    const [am, pm, eve] = radios()
    expect(am?.textContent).toMatch(/^9:00\sAM – 12:00\sPM3 spots left$/)
    expect(pm?.textContent).toMatch(/^2:00\sPM – 5:00\sPM8 spots left$/)
    expect(eve?.textContent).toContain('Full')
    expect(eve?.disabled).toBe(true)
    expect(radios().every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true)

    act(() => pm?.click())
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
    act(() => eve?.click())
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
  })
})
