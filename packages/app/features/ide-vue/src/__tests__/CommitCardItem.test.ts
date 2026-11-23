// @vitest-environment jsdom
/**
 * The commit card's React contract: one bottom-margined root, a row button that
 * discloses the committed files, a status dot coloured by state, the commit
 * label with its co-author trailer stripped, the collapsed file count, and the
 * revert/redo control that sits BESIDE the row button (never inside it), reveals
 * itself on its own hover and offers the reverse operation after each revert.
 *
 * The card is a part of `@molecule/app-ide-react`'s ChatPanel; these assertions
 * restate the DOM and callbacks that component produces.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { TIMELINE_ITEM_GAP } from '@molecule/app-ide-panel-logic'
import type { CommitCard } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CommitCardItem } from '../parts/CommitCardItem.js'

/**
 * A style value as this DOM serializes it once React's style object writes it (jsdom 31 writes
 * `8px 8px 0 0` as `8px 8px 0px 0px`, and a bare `background: transparent` as `none`).
 *
 * @param property - The CSS property, kebab-case.
 * @param value - The value React writes.
 * @returns The serialized value.
 */
function asDom(property: string, value: string): string {
  const probe = document.createElement('div')
  probe.style.setProperty(property, value)
  return probe.style.getPropertyValue(property)
}

/** The root this file last mounted. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  // The REAL themed ClassMap, so the card resolves actual theme tokens.
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts one commit card and returns the host element.
 *
 * @param card - The commit to render.
 * @param onRevert - The host's revert handler, when wired.
 * @returns The host element the card mounted into.
 */
function mountCard(
  card: CommitCard,
  onRevert?: (hash: string) => Promise<string | undefined>,
): HTMLElement {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(CommitCardItem, { card, onRevert }),
    }),
  )
  mounted.app = app
  app.mount(host)
  return host
}

/** A finished commit with two files and a hash. */
function doneCard(): CommitCard {
  return {
    id: 'commit-1',
    message: 'feat: add login screen\n\nCo-authored-by: Synthase <synthase@molecule.dev>',
    files: ['src/Login.tsx', 'src/Footer.tsx'],
    timestamp: 1_700_000_000_000,
    status: 'done',
    hash: 'abc1234',
  }
}

/**
 * Finds the card's row button (the disclosure).
 *
 * @param host - The mounted host element.
 * @returns The row button.
 */
function rowButton(host: HTMLElement): HTMLElement {
  return host.lastElementChild?.firstElementChild?.firstElementChild as HTMLElement
}

/**
 * Finds the revert/redo control, when rendered.
 *
 * @param host - The mounted host element.
 * @returns The control, or null.
 */
function revertControl(host: HTMLElement): HTMLElement | null {
  return host.querySelector('[role="button"]')
}

describe('CommitCardItem — expandable commit card', () => {
  it('renders one bottom-margined root with the state-coloured dot', () => {
    const host = mountCard({ ...doneCard(), files: [] })
    const root = host.firstElementChild as HTMLElement
    expect(root.style.marginBottom).toBe(`${TIMELINE_ITEM_GAP}px`)

    const button = rowButton(host)
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
    // No files → no disclosure affordance, and the row reads non-interactive.
    expect(button.style.cursor).toBe('default')
    expect(button.querySelectorAll('svg')).toHaveLength(1)

    const circles = Array.from(button.querySelectorAll('circle'))
    expect(circles).toHaveLength(2)
    expect(circles[0].getAttribute('fill')).toBe('#4070e0')
    expect(circles[0].getAttribute('opacity')).toBe('0.35')
    expect(circles[1].getAttribute('stroke')).toBe('#4070e0')
    expect(circles[1].getAttribute('stroke-width')).toBe('2')
  })

  it('labels a running commit and colours its dot orange', () => {
    const host = mountCard({ ...doneCard(), files: [], status: 'running', hash: undefined })
    const button = rowButton(host)
    expect(button.textContent).toContain('Committing...')
    expect(button.textContent).not.toContain('Commit ')
    expect(button.querySelector('circle')?.getAttribute('fill')).toBe('#e8a000')
  })

  it('colours a failed commit’s dot red', () => {
    const host = mountCard({ ...doneCard(), files: [], status: 'error' })
    expect(rowButton(host).querySelector('circle')?.getAttribute('fill')).toBe('#f04040')
  })

  it('strips the co-author trailer and wraps the message in a code element', () => {
    const host = mountCard(doneCard())
    const button = rowButton(host)
    const code = button.querySelector('code') as HTMLElement
    expect(code).not.toBeNull()
    expect(code.textContent).toBe('feat: add login screen')
    expect(button.textContent).toContain('Commit')
    expect(button.textContent).not.toContain('Co-authored-by')
    expect(code.style.fontFamily).toContain('SF Mono')
  })

  it('shows the collapsed file count and discloses the file list on click', async () => {
    const host = mountCard(doneCard())
    const cm = getClassMap()
    const button = rowButton(host)
    const count = Array.from(button.querySelectorAll('span')).find(
      (el) => el.textContent === '2 files',
    ) as HTMLElement
    expect(count).not.toBeUndefined()
    for (const token of cm.cn(cm.textMuted, cm.textSize('xs')).split(/\s+/)) {
      expect(count.classList.contains(token)).toBe(true)
    }
    expect(count.style.marginTop).toBe('1px')
    expect(button.style.cursor).toBe('pointer')

    const chevron = button.lastElementChild as SVGElement
    expect(chevron.style.transform).toBe('rotate(0deg)')
    expect(chevron.style.opacity).toBe('0.35')

    button.click()
    await nextTick()

    expect(rowButton(host).textContent).not.toContain('files')
    const list = host.querySelector(`.${cm.surfaceSecondary.split(/\s+/)[0]}`) as HTMLElement
    expect(list).not.toBeNull()
    expect(list.style.marginLeft).toBe('14px')
    expect(list.style.padding).toBe('6px 10px')
    expect(list.style.overflowX).toBe('auto')
    const mono = list.firstElementChild as HTMLElement
    expect(Array.from(mono.children).map((el) => el.textContent)).toEqual([
      'src/Login.tsx',
      'src/Footer.tsx',
    ])
    expect(mono.style.fontFamily).toContain('SF Mono')
    expect(mono.style.fontSize).toBe('11px')
    expect((rowButton(host).lastElementChild as SVGElement).style.transform).toBe('rotate(90deg)')

    // Clicking again collapses it.
    rowButton(host).click()
    await nextTick()
    expect(host.querySelector(`.${cm.surfaceSecondary.split(/\s+/)[0]}`)).toBeNull()
    expect(rowButton(host).textContent).toContain('2 files')
  })

  it('brightens the chevron while the row is hovered', async () => {
    const host = mountCard(doneCard())
    const button = rowButton(host)
    button.dispatchEvent(new MouseEvent('mouseenter'))
    await nextTick()
    expect((rowButton(host).lastElementChild as SVGElement).style.opacity).toBe('0.85')
    rowButton(host).dispatchEvent(new MouseEvent('mouseleave'))
    await nextTick()
    expect((rowButton(host).lastElementChild as SVGElement).style.opacity).toBe('0.35')
  })

  it('offers no revert control without a handler, a hash or a finished commit', () => {
    expect(revertControl(mountCard(doneCard()))).toBeNull()
    expect(
      revertControl(mountCard({ ...doneCard(), hash: undefined }, async () => undefined)),
    ).toBeNull()
    expect(
      revertControl(mountCard({ ...doneCard(), status: 'running' }, async () => undefined)),
    ).toBeNull()
  })

  it('reverts the commit, then offers redo with the revert’s own hash', async () => {
    const onRevert = vi.fn(async (hash: string) => `revert-of-${hash}`)
    const host = mountCard(doneCard(), onRevert)
    const control = revertControl(host) as HTMLElement

    expect(control.tagName).toBe('SPAN')
    expect(control.getAttribute('tabindex')).toBe('0')
    expect(control.getAttribute('title')).toBe('Revert this commit')
    expect(control.style.opacity).toBe('0')
    expect(control.style.width).toBe('20px')
    expect(control.style.height).toBe('20px')
    expect(control.style.cursor).toBe('pointer')

    control.click()
    await vi.waitFor(() => expect(onRevert).toHaveBeenCalledWith('abc1234'))
    await vi.waitFor(() =>
      expect(revertControl(host)?.getAttribute('title')).toBe('Re-apply this commit'),
    )
    // The redo glyph replaces the revert arrow.
    expect(revertControl(host)?.querySelector('path')?.getAttribute('d')).toContain('M14.78')

    // Re-applying reverts the revert, so redo is offered again.
    revertControl(host)?.click()
    await vi.waitFor(() => expect(onRevert).toHaveBeenLastCalledWith('revert-of-abc1234'))
    await vi.waitFor(() =>
      expect(revertControl(host)?.getAttribute('title')).toBe('Revert this commit'),
    )
  })

  it('reverts from the keyboard like a button', async () => {
    const onRevert = vi.fn(async (hash: string) => `revert-of-${hash}`)
    const host = mountCard(doneCard(), onRevert)
    revertControl(host)?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await vi.waitFor(() => expect(onRevert).toHaveBeenCalledWith('abc1234'))
  })

  it('reveals the revert control on its own hover, not under the pointer', async () => {
    const host = mountCard(doneCard(), async (hash) => `revert-of-${hash}`)
    const control = revertControl(host) as HTMLElement
    control.dispatchEvent(new MouseEvent('mouseenter'))
    await nextTick()
    expect(control.style.opacity).toBe('0.6')
    expect(control.style.background).toBe(asDom('background', 'rgba(128, 128, 128, 0.2)'))

    control.dispatchEvent(new MouseEvent('mouseleave'))
    await nextTick()
    expect(control.style.opacity).toBe('0')
    expect(control.style.background).toBe(asDom('background', 'transparent'))
  })

  it('reveals the revert control while the row is hovered', async () => {
    const host = mountCard(doneCard(), async (hash) => `revert-of-${hash}`)
    rowButton(host).dispatchEvent(new MouseEvent('mouseenter'))
    await nextTick()
    expect((revertControl(host) as HTMLElement).style.opacity).toBe('0.6')
  })
})
