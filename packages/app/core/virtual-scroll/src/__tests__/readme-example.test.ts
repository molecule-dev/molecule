// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the REAL TanStack bond and
 * the REAL Tailwind ClassMap in happy-dom. happy-dom does no layout, so the
 * container's rendered height (`offsetHeight`) is the one thing stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest'

import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { provider } from '@molecule/app-virtual-scroll-tanstack'

import type { VirtualScrollInstance } from '../index.js'
import { createVirtualizer, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders only the visible window and re-renders it on scroll', async () => {
    setClassMap(classMap)
    setProvider(provider)

    const rows = Array.from({ length: 10_000 }, (_, i) => `Row ${i + 1}`)
    const cm = getClassMap()

    const scrollElement = document.createElement('div')
    scrollElement.style.height = '480px'
    scrollElement.style.overflowY = 'auto'
    Object.defineProperty(scrollElement, 'offsetHeight', { configurable: true, value: 480 })
    const spacer = document.createElement('div')
    spacer.className = cm.position('relative')
    scrollElement.append(spacer)
    document.body.append(scrollElement)

    const render = (virtualizer: VirtualScrollInstance): void => {
      spacer.style.height = `${virtualizer.getTotalSize()}px`
      const rendered = virtualizer.getVirtualItems().map((item) => {
        const row = document.createElement('div')
        row.className = cm.cn(cm.position('absolute'), cm.w('full'))
        row.style.transform = `translateY(${item.start}px)`
        row.textContent = rows[item.index] ?? ''
        return row
      })
      spacer.replaceChildren(...rendered)
    }

    const virtualizer = createVirtualizer(scrollElement, {
      count: rows.length,
      estimateSize: () => 48,
      overscan: 5,
      onChange: render,
      enabled: false,
    })
    virtualizer.setOptions({ enabled: true })
    render(virtualizer)

    const texts = (): string[] => Array.from(spacer.children).map((row) => row.textContent ?? '')
    expect(spacer.style.height).toBe('480000px')
    expect(texts()).toEqual(Array.from({ length: 15 }, (_, i) => `Row ${i + 1}`))
    expect((spacer.children[1] as HTMLElement).style.transform).toBe('translateY(48px)')
    expect(spacer.children[0]?.className).toBe(cm.cn(cm.position('absolute'), cm.w('full')))

    scrollElement.scrollTop = 4800
    scrollElement.dispatchEvent(new Event('scroll'))
    await expect.poll(() => texts()[0]).toBe('Row 96')
    expect(texts()).toContain('Row 101')
    expect(texts()).not.toContain('Row 1')

    virtualizer.destroy()
  })
})
