// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the REAL core, the REAL
 * TanStack bond and the REAL Tailwind ClassMap in happy-dom. happy-dom does no
 * layout, so the container's geometry (`offsetHeight`, `clientHeight`,
 * `scrollHeight`) is the one thing stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest'

import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import type { VirtualScrollInstance } from '@molecule/app-virtual-scroll'
import { createVirtualizer, setProvider } from '@molecule/app-virtual-scroll'

import { createTanStackProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('paints the visible window from onChange during creation and follows scrollToIndex', async () => {
    setClassMap(classMap)
    setProvider(createTanStackProvider({ isScrollingResetDelay: 150 }))

    const rows = Array.from({ length: 5_000 }, (_, i) => `Message ${i + 1}`)
    const cm = getClassMap()

    const scrollElement = document.createElement('div')
    scrollElement.style.height = '400px'
    scrollElement.style.overflowY = 'auto'
    Object.defineProperty(scrollElement, 'offsetHeight', { configurable: true, value: 400 })
    Object.defineProperty(scrollElement, 'clientHeight', { configurable: true, value: 400 })
    Object.defineProperty(scrollElement, 'scrollHeight', { configurable: true, value: 200_000 })
    const spacer = document.createElement('div')
    spacer.className = cm.position('relative')
    scrollElement.append(spacer)
    document.body.append(scrollElement)

    let renders = 0
    const render = (virtualizer: VirtualScrollInstance): void => {
      renders += 1
      spacer.style.height = `${virtualizer.getTotalSize()}px`
      spacer.replaceChildren(
        ...virtualizer.getVirtualItems().map((item) => {
          const row = document.createElement('div')
          row.className = cm.cn(cm.position('absolute'), cm.w('full'))
          row.style.transform = `translateY(${item.start}px)`
          row.textContent = rows[item.index] ?? ''
          return row
        }),
      )
    }

    // Regression: with a sized container this used to throw
    // "ReferenceError: Cannot access 'instance' before initialization".
    let virtualizer: VirtualScrollInstance | undefined
    expect(() => {
      virtualizer = createVirtualizer(scrollElement, {
        count: rows.length,
        estimateSize: () => 40,
        overscan: 3,
        onChange: render,
      })
    }).not.toThrow()
    if (!virtualizer) throw new Error('virtualizer was not created')

    const texts = (): string[] => Array.from(spacer.children).map((row) => row.textContent ?? '')
    expect(renders).toBeGreaterThanOrEqual(1)
    expect(spacer.style.height).toBe('200000px')
    expect(texts()).toEqual(Array.from({ length: 13 }, (_, i) => `Message ${i + 1}`))
    expect((spacer.children[1] as HTMLElement).style.transform).toBe('translateY(40px)')

    virtualizer.scrollToIndex(2_500, { align: 'start' })
    expect(scrollElement.scrollTop).toBe(100_000)
    scrollElement.dispatchEvent(new Event('scroll'))
    await expect.poll(() => texts()).toContain('Message 2501')
    expect(texts()).not.toContain('Message 1')

    virtualizer.destroy()
  })
})
