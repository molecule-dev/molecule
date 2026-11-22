// @vitest-environment jsdom
/**
 * DockStrip — the strips' shared chrome — rendered for real: a port of the
 * two `DockStrip` cases in
 * `@molecule/app-ide-react/src/__tests__/WorkCard.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through Vue's own
 * `createApp`. The tray variant provides `WorkTrayContext` the way the work
 * tray does (header and detail elements in the document, nothing open).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { DockStripProps } from '../parts/DockStrip.js'
import { DockStrip, WorkTrayContext } from '../parts/DockStrip.js'

const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
})

/**
 * Renders the strip.
 *
 * @param props - The strip's props.
 * @param options.tray - Mount it inside a work tray (nothing open).
 * @returns The document root plus the recorded toggles.
 */
function renderStrip(
  props: Partial<DockStripProps>,
  { tray = false }: { tray?: boolean } = {},
): { toggles: { count: number } } {
  document.body.innerHTML = ''
  const toggles = { count: 0 }
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild =>
        h(DockStrip, {
          molId: 'info',
          toggleMolId: 'info-toggle',
          expanded: false,
          label: 'Info',
          onToggle: () => {
            toggles.count += 1
          },
          ...props,
        }),
    }),
  )
  if (tray) {
    const headerEl = document.createElement('div')
    const detailEl = document.createElement('div')
    document.body.appendChild(headerEl)
    document.body.appendChild(detailEl)
    app.provide(WorkTrayContext, {
      headerEl: ref(headerEl),
      detailEl: ref(detailEl),
      openId: ref<string | null>(null),
      toggle: () => {},
    })
  }
  mounted.app = app
  app.mount(host)
  return { toggles }
}

/**
 * Finds the strip's action button by its text.
 * @param text - The action's text.
 * @returns The button, or undefined.
 */
function actionButton(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  ) as HTMLButtonElement | undefined
}

describe('DockStrip', () => {
  it('keeps an action click from also toggling the file disclosure', () => {
    const { toggles } = renderStrip({
      molId: 'files',
      toggleMolId: 'files-toggle',
      label: 'Files',
      hideLabel: true,
      actions: [h('button', { type: 'button' }, ['Commit 2 files'])],
    })
    // The action sits in a wrapper above the overlay button, so its click is
    // its own — the row does not toggle.
    actionButton('Commit 2 files')?.click()
    expect(toggles.count).toBe(0)
    document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')?.click()
    expect(toggles.count).toBe(1)
  })

  it.each([false, true])('gives info disclosures a clickable hover recipe (tray=%s)', (tray) => {
    renderStrip({}, { tray })
    const control = document.querySelector<HTMLElement>('[data-mol-id="info-toggle"]')
    if (!control) throw new Error('missing info-toggle element')
    // A standalone row's visual chrome is the overlay button's parent; the
    // tray chip itself is the control.
    const chrome = control.tagName === 'BUTTON' ? control.parentElement! : control
    const recipe = classMap.button({ variant: 'ghost', color: 'secondary', size: 'xs' })
    for (const token of recipe.split(/\s+/).filter(Boolean)) {
      expect(chrome.classList.contains(token)).toBe(true)
    }
    // Inline backgrounds would override the design system's hover background.
    expect(chrome.style.background).toBe('')
    expect(chrome.style.backgroundColor).toBe('')
  })

  it('makes the overlay a native button, not the row', () => {
    renderStrip({ molId: 'files', toggleMolId: 'files-toggle', label: 'Files' })
    const toggle = document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')
    if (!toggle) throw new Error('missing files-toggle element')
    expect(toggle.tagName).toBe('BUTTON')
    // The row itself is a plain container now — no role, no tab stop.
    const row = toggle.parentElement as HTMLElement
    expect(row.getAttribute('role')).toBeNull()
    expect(row.hasAttribute('tabindex')).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('toggles from a click and leaves an inner action to its own click', () => {
    const { toggles } = renderStrip({
      molId: 'files',
      toggleMolId: 'files-toggle',
      label: 'Files',
      hideLabel: true,
      actions: [h('button', { type: 'button' }, ['Commit 2 files'])],
    })
    const toggle = document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')
    if (!toggle) throw new Error('missing files-toggle element')
    toggle.click()
    expect(toggles.count).toBe(1)

    // The action is the overlay's sibling, so its click never reaches it.
    actionButton('Commit 2 files')?.click()
    expect(toggles.count).toBe(1)
  })

  it('takes the label as its accessible name', () => {
    renderStrip({ molId: 'files', toggleMolId: 'files-toggle', label: 'Files' })
    const toggle = document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')
    if (!toggle) throw new Error('missing files-toggle element')
    const labelledBy = toggle.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const label = document.querySelector(`[id="${labelledBy}"]`)
    expect(label?.textContent).toBe('Files')
  })

  it('names an icon-only strip with its plain-text label', () => {
    renderStrip({
      molId: 'files',
      toggleMolId: 'files-toggle',
      label: 'Uncommitted files',
      hideLabel: true,
    })
    const toggle = document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')
    if (!toggle) throw new Error('missing files-toggle element')
    expect(toggle.getAttribute('aria-label')).toBe('Uncommitted files')
    expect(toggle.getAttribute('aria-labelledby')).toBeNull()
  })

  it('names a hidden-label strip whose label is a node by that node’s hidden text', () => {
    // A node label cannot become aria-label (only a string can), and the node
    // itself is not rendered while `hideLabel` is set — so without help the
    // toggle has no name at all. Its text now renders inside the toggle in a
    // visually hidden wrapper (axe `button-name`).
    renderStrip({
      molId: 'files',
      toggleMolId: 'files-toggle',
      label: h('span', { 'data-mol-id': 'label-node' }, ['3 ', h('em', null, 'changed'), ' files']),
      hideLabel: true,
    })
    const toggle = document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')
    if (!toggle) throw new Error('missing files-toggle element')
    expect(toggle.getAttribute('aria-label')).toBeNull()
    expect(toggle.getAttribute('aria-labelledby')).toBeNull()
    // The node renders inside the toggle, visually hidden, naming it by content.
    const hidden = toggle.querySelector(`.${classMap.srOnly}`) as HTMLElement | null
    expect(hidden).not.toBeNull()
    expect(hidden?.textContent).toBe('3 changed files')
  })
})
