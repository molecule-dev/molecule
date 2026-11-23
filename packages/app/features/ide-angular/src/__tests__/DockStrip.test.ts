// @vitest-environment jsdom
/**
 * DockStrip — the strips' shared chrome — rendered for real: a port of the
 * two `DockStrip` cases in
 * `@molecule/app-ide-react/src/__tests__/WorkCard.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through Angular's
 * own `createApplication` with zoneless change detection. The tray variant
 * provides `WorkTrayContext` the way the work tray does (header and detail
 * elements in the document, nothing open).
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provideDomPlacement, provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { DockStrip, WorkTrayContext, type WorkTrayValue } from '../parts/dock-strip.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input the strip takes, and holds the action button and the node
 * label the React reference tests pass.
 */
const DockStripHost = Component({
  selector: 'mol-dock-strip-host',
  standalone: true,
  imports: [DockStrip],
  changeDetection: ChangeDetectionStrategy.Eager,
  // prettier-ignore
  template: `<ng-template #commitAction><button type="button">Commit 2 files</button></ng-template><ng-template #labelNode><span data-mol-id="label-node">3 <em>changed</em> files</span></ng-template><div mol-dock-strip
      [molId]="p['molId']"
      [toggleMolId]="p['toggleMolId']"
      [expanded]="p['expanded']"
      [onToggle]="p['onToggle']"
      [label]="p['labelIsNode'] ? labelNode : p['label']"
      [hideLabel]="p['hideLabel']"
      [actions]="p['withAction'] ? commitAction : null">@if (p['on']) {@for (x of p['xs']; track x) {<b>{{ x }}</b>}}</div>`,
})(
  class DockStripHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}

    /** The action button's template. */
    commitAction!: HTMLTemplateElement

    /** The node label's template (a label that is a node, not a string). */
    labelNode!: HTMLTemplateElement
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof DockStripHost>>
  container: HTMLElement
  toggles: { count: number }
} | null = null

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

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Renders the strip.
 *
 * @param props - The strip's props.
 * @param options.tray - Mount it inside a work tray (nothing open).
 * @param options.withAction - Give the strip the action button the React
 *   reference test uses.
 */
async function renderStrip(
  props: Record<string, unknown>,
  { tray = false, withAction = false }: { tray?: boolean; withAction?: boolean } = {},
): Promise<{ set: (next: Record<string, unknown>) => void }> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const providers: (EnvironmentProviders | Provider)[] = [
    provideZonelessChangeDetection(),
    provideDomPlacement(),
    provideTheme(buildThemeProvider()),
  ]
  if (tray) {
    const detailEl = document.createElement('div')
    document.body.appendChild(detailEl)
    const value: WorkTrayValue = {
      detailEl: signal(detailEl),
      openId: signal(null),
      toggle: () => {},
    }
    providers.push({ provide: WorkTrayContext, useValue: value })
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({ providers })
  const ref: ComponentRef<InstanceType<typeof DockStripHost>> = createComponent(DockStripHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  const toggles = { count: 0 }
  ref.instance.p = {
    molId: 'info',
    toggleMolId: 'info-toggle',
    expanded: false,
    label: 'Info',
    // The projected detail's content; on by default so the existing cases keep
    // rendering their list.
    on: true,
    onToggle: () => {
      toggles.count += 1
    },
    ...props,
    withAction,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container, toggles }
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
  return {
    set: (next) => {
      const live = current
      if (!live) return
      live.ref.instance.p = { ...live.ref.instance.p, ...next }
      live.ref.changeDetectorRef.markForCheck()
      live.appRef.tick()
    },
  }
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('DockStrip', () => {
  it('keeps an action click from also toggling the file disclosure', async () => {
    await renderStrip(
      {
        molId: 'files',
        toggleMolId: 'files-toggle',
        label: 'Files',
        hideLabel: true,
      },
      { withAction: true },
    )
    // The action sits in a wrapper above the overlay button, so its click is
    // its own — the row does not toggle.
    actionButton('Commit 2 files')?.click()
    await flush()
    expect(current?.toggles.count).toBe(0)
    document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')?.click()
    await flush()
    expect(current?.toggles.count).toBe(1)
  })

  it.each([false, true])(
    'gives info disclosures a clickable hover recipe (tray=%s)',
    async (tray) => {
      await renderStrip({}, { tray })
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
    },
  )

  it('keeps a consumer list in order when an item is inserted in the middle of detail', async () => {
    const m = await renderStrip({ molId: 'files', label: 'Files', expanded: true, xs: [1, 3] })
    const items = (): string[] =>
      Array.from(document.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(items()).toEqual(['1', '3'])
    m.set({ xs: [1, 2, 3] })
    expect(items()).toEqual(['1', '2', '3'])
    m.set({ xs: [1, 2] })
    expect(items()).toEqual(['1', '2'])
  })

  it('shows and removes the detail wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await renderStrip({ molId: 'files', label: 'Files', expanded: true, xs: [1] })
    const items = (): string[] =>
      Array.from(document.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(items()).toEqual(['1'])
    m.set({ on: false })
    expect(items()).toEqual([])
    m.set({ on: true })
    expect(items()).toEqual(['1'])
  })

  it('makes the overlay a native button, not the row', async () => {
    await renderStrip({ molId: 'files', toggleMolId: 'files-toggle', label: 'Files' })
    const toggle = document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')
    if (!toggle) throw new Error('missing files-toggle element')
    expect(toggle.tagName).toBe('BUTTON')
    // The row itself is a plain container now — no role, no tab stop.
    const row = toggle.parentElement as HTMLElement
    expect(row.getAttribute('role')).toBeNull()
    expect(row.hasAttribute('tabindex')).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('toggles from a click and leaves an inner action to its own click', async () => {
    await renderStrip(
      {
        molId: 'files',
        toggleMolId: 'files-toggle',
        label: 'Files',
        hideLabel: true,
      },
      { withAction: true },
    )
    const toggle = document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')
    if (!toggle) throw new Error('missing files-toggle element')
    toggle.click()
    await flush()
    expect(current?.toggles.count).toBe(1)

    // The action is the overlay's sibling, so its click never reaches it.
    actionButton('Commit 2 files')?.click()
    await flush()
    expect(current?.toggles.count).toBe(1)
  })

  it('takes the label as its accessible name', async () => {
    await renderStrip({ molId: 'files', toggleMolId: 'files-toggle', label: 'Files' })
    const toggle = document.querySelector<HTMLElement>('[data-mol-id="files-toggle"]')
    if (!toggle) throw new Error('missing files-toggle element')
    const labelledBy = toggle.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const label = document.querySelector(`[id="${labelledBy}"]`)
    expect(label?.textContent).toBe('Files')
  })

  it('names an icon-only strip with its plain-text label', async () => {
    await renderStrip({
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

  it('names a hidden-label strip whose label is a node by that node’s hidden text', async () => {
    // A node label cannot become aria-label (only a string can), and the node
    // itself is not rendered while `hideLabel` is set — so without help the
    // toggle has no name at all. Its text now renders inside the toggle in a
    // visually hidden wrapper (axe `button-name`).
    await renderStrip({
      molId: 'files',
      toggleMolId: 'files-toggle',
      labelIsNode: true,
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
