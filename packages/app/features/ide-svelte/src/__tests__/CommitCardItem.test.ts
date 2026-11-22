// @vitest-environment jsdom
/**
 * The commit card's structure: its status dot, its one-line label (with the
 * co-author trailer stripped), the file-count line, the disclosure and the
 * file list, and the revert control that sits BESIDE the row button — never
 * inside it (axe nested-interactive).
 *
 * Port of `@molecule/app-ide-react`'s `CommitCardItem` (the React component's
 * own behaviour is the contract). The card is one timeline item; the row is a
 * real `<button>`, and the icon-only revert affordance is a sibling
 * `role="button"` span so a control is never nested in the row's button.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import CommitCardItem from '../parts/CommitCardItem.svelte'
import type { CommitCard } from '../types.js'

/** The exact trailer molecule.dev appends, after a blank line per git convention. */
const SYNTHASE_TRAILER = 'Co-authored-by: Synthase <synthase@molecule.dev>'
const SUBJECT = 'feat: add login screen'

/** The mount alive right now, if any. */
const mounted: { instance?: ReturnType<typeof mount> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (mounted.instance) unmount(mounted.instance)
  mounted.instance = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Renders one commit card.
 *
 * @param card - The commit card to render.
 * @param onRevert - The revert callback the host wires, when any.
 * @returns The container the card mounted into.
 */
function renderCard(
  card: CommitCard,
  onRevert?: (hash: string) => Promise<string | undefined>,
): HTMLElement {
  if (mounted.instance) unmount(mounted.instance)
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.instance = mount(CommitCardItem, { target: container, props: { card, onRevert } })
  flushSync()
  return container
}

/** A done commit with a hash and two files. */
const DONE_CARD: CommitCard = {
  id: 'commit-1',
  message: `${SUBJECT}\n\n${SYNTHASE_TRAILER}`,
  files: ['src/Login.tsx', 'src/Footer.tsx'],
  timestamp: 1_700_000_000_000,
  status: 'done',
  hash: 'abc1234',
}

/**
 * The row button (the header disclosure).
 *
 * @param container - The mounted card's container.
 * @returns The row button.
 */
function rowButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('button') as HTMLButtonElement
}

/**
 * The icon-only revert control.
 *
 * @param container - The mounted card's container.
 * @returns The role="button" element, or null when the card offers none.
 */
function revertControl(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[role="button"]')
}

describe('CommitCardItem', () => {
  it('renders one timeline item with the blue done dot, the label and the file count', () => {
    const container = renderCard(DONE_CARD)
    const root = container.firstElementChild as HTMLElement
    expect(container.children).toHaveLength(1)
    expect(root.style.marginBottom).toBe('16px')

    // Status dot: a filled translucent circle plus a stroked ring, both blue on done.
    const circles = root.querySelectorAll('svg circle')
    expect(circles).toHaveLength(2)
    expect(circles[0].getAttribute('fill')).toBe('#4070e0')
    expect(circles[0].getAttribute('opacity')).toBe('0.35')
    expect(circles[1].getAttribute('stroke')).toBe('#4070e0')
    expect(circles[1].getAttribute('stroke-width')).toBe('2')

    // The label shows the subject and none of the attribution trailer.
    const text = root.textContent ?? ''
    expect(text).toContain('Commit')
    expect(text).toContain(SUBJECT)
    expect(text).not.toContain('Co-authored-by')
    expect(text).not.toContain('synthase@molecule.dev')

    // Two files, collapsed, so the count line shows and names the number.
    expect(text).toContain('files')
    expect(text).toContain('2')
    // Collapsed: no file list yet, and the chevron points right.
    expect(root.textContent).not.toContain('src/Login.tsx')
    const chevron = root.querySelectorAll('svg')[1] as SVGElement
    expect(chevron.style.transform).toBe('rotate(0deg)')
    expect(chevron.style.opacity).toBe('0.35')
  })

  it('discloses the file list on click and hides the count line', () => {
    const container = renderCard(DONE_CARD)
    const button = rowButton(container)
    button.click()
    flushSync()

    expect(container.textContent).not.toContain('files')
    expect(container.textContent).toContain('src/Login.tsx')
    expect(container.textContent).toContain('src/Footer.tsx')
    const chevron = container.querySelectorAll('svg')[1] as SVGElement
    expect(chevron.style.transform).toBe('rotate(90deg)')

    button.click()
    flushSync()
    expect(container.textContent).not.toContain('src/Login.tsx')
  })

  it('makes the row non-interactive (default cursor) when the commit has no files', () => {
    const container = renderCard({ ...DONE_CARD, files: [] })
    const button = rowButton(container)
    expect(button.style.cursor).toBe('default')
    expect(revertControl(container)).toBeNull()
  })

  it('renders the running card as a committing line with the orange dot', () => {
    const container = renderCard({
      id: 'commit-2',
      message: 'wip',
      files: [],
      timestamp: 1,
      status: 'running',
    })
    expect(container.textContent).toContain('Committing...')
    expect(container.textContent).not.toContain('Commit ')
    const circle = container.querySelector('svg circle') as SVGCircleElement
    expect(circle.getAttribute('fill')).toBe('#e8a000')
  })

  it('renders an error card with the red dot', () => {
    const container = renderCard({ ...DONE_CARD, status: 'error', hash: undefined })
    const circle = container.querySelector('svg circle') as SVGCircleElement
    expect(circle.getAttribute('fill')).toBe('#f04040')
  })

  it('renders the revert control as a sibling of the row button, never inside it', () => {
    const container = renderCard(DONE_CARD, async () => undefined)
    const button = rowButton(container)
    const revert = revertControl(container) as HTMLElement

    expect(revert).not.toBeNull()
    expect(button.contains(revert)).toBe(false)
    expect(revert.parentElement).toBe(button.parentElement)
    expect(revert.getAttribute('tabindex')).toBe('0')
    expect(revert.getAttribute('title')).toBe('Revert this commit')
    // Icon-only affordance: no label text, a 20px hit box, revealed on hover.
    expect(revert.textContent).toBe('')
    expect(revert.style.width).toBe('20px')
    expect(revert.style.height).toBe('20px')
    expect(revert.style.opacity).toBe('0')
  })

  it('reverts with the card hash, then offers to re-apply the revert commit', async () => {
    const onRevert = vi.fn(async () => 'def5678')
    const container = renderCard(DONE_CARD, onRevert)
    const revert = revertControl(container) as HTMLElement

    revert.click()
    await vi.waitFor(() => expect(onRevert).toHaveBeenCalledTimes(1))
    expect(onRevert).toHaveBeenCalledWith('abc1234')
    flushSync()
    await vi.waitFor(() => expect(revert.getAttribute('title')).toBe('Re-apply this commit'))

    revert.click()
    await vi.waitFor(() => expect(onRevert).toHaveBeenCalledTimes(2))
    expect(onRevert).toHaveBeenLastCalledWith('def5678')
  })

  it('offers no revert control while the commit has no hash', () => {
    const container = renderCard({ ...DONE_CARD, hash: undefined }, async () => undefined)
    expect(revertControl(container)).toBeNull()
  })

  it('reveals the revert control on hover over the row', () => {
    const container = renderCard(DONE_CARD, async () => undefined)
    const button = rowButton(container)
    const revert = revertControl(container) as HTMLElement
    expect(revert.style.opacity).toBe('0')
    button.dispatchEvent(new MouseEvent('mouseenter'))
    flushSync()
    expect(revert.style.opacity).toBe('0.6')
    button.dispatchEvent(new MouseEvent('mouseleave'))
    flushSync()
    expect(revert.style.opacity).toBe('0')
  })

  it('keeps the revert control revealed with its own hover treatment', () => {
    const container = renderCard(DONE_CARD, async () => undefined)
    const button = rowButton(container)
    const revert = revertControl(container) as HTMLElement

    // Leaving the row hides it again, so the reveal below is the control's OWN.
    button.dispatchEvent(new MouseEvent('mouseenter'))
    button.dispatchEvent(new MouseEvent('mouseleave'))
    flushSync()
    expect(revert.style.opacity).toBe('0')

    revert.dispatchEvent(new MouseEvent('mouseenter'))
    flushSync()
    expect(revert.style.opacity).toBe('0.6')
    expect(revert.style.background).toBe('rgba(128, 128, 128, 0.2)')

    revert.dispatchEvent(new MouseEvent('mouseleave'))
    flushSync()
    expect(revert.style.opacity).toBe('0')
    expect(revert.style.background).toBe('transparent')
  })

  it('accepts Enter and Space on the revert control', async () => {
    const onRevert = vi.fn(async () => undefined)
    const container = renderCard(DONE_CARD, onRevert)
    const revert = revertControl(container) as HTMLElement

    revert.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await vi.waitFor(() => expect(onRevert).toHaveBeenCalledWith('abc1234'))
  })
})
