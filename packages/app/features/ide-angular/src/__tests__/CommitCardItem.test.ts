// @vitest-environment jsdom
/**
 * `CommitCardItem` rendered for real.
 *
 * Angular port of the render contract `@molecule/app-ide-react`'s ChatPanel
 * asserts for a commit card (`ChatPanel.commit-trailer.test.tsx`,
 * `ChatPanel.commit-card-dedupe.test.tsx`), mounted on the part itself because
 * the Angular ChatPanel does not carry the timeline dispatch yet (unit U4).
 * Every case is read from `CommitCardItem.tsx`: the status dot, the truncated
 * label with the co-author trailer stripped, the file count and its
 * disclosure, the chevron, and the revert control that is a SIBLING of the row
 * button (never nested inside it) with its own hover state and undo/redo flow.
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
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { COARSE_POINTER_QUERY, TIMELINE_ITEM_GAP } from '@molecule/app-ide-panel-logic'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type CommitCard, CommitCardItem } from '../parts/commit-card-item.component.js'

/** The exact trailer molecule.dev appends, after a blank line per git convention. */
const SYNTHASE_TRAILER = 'Co-authored-by: Synthase <synthase@molecule.dev>'
const SUBJECT = 'feat: add login screen'

/** The host the cases mount (React's prop names). */
const CommitCardHost = Component({
  selector: 'mol-commit-card-host',
  standalone: true,
  imports: [CommitCardItem],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-commit-card-item [card]="p['card']" [onRevert]="p['onRevert']"></div>`,
})(
  class CommitCardHostComponent {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted card, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
})

/**
 * Mounts the card with the given props.
 *
 * @param card - The commit to render.
 * @param onRevert - The host's revert handler, when it has one.
 * @returns The mount container.
 */
async function renderCard(
  card: CommitCard,
  onRevert?: (hash: string) => Promise<string | undefined>,
): Promise<HTMLElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<InstanceType<typeof CommitCardHost>> = createComponent(CommitCardHost, {
    environmentInjector: appRef.injector,
  })
  ref.instance.p = { card, onRevert }
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  current = { appRef, container }
  return container
}

/**
 * Lets Angular's zoneless change detection settle what an event queued.
 *
 * @returns A promise that settles after the next pass.
 */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
  await new Promise((settle) => {
    setTimeout(settle, 0)
  })
  current?.appRef.tick()
  for (let i = 0; i < 3; i += 1) await Promise.resolve()
  current?.appRef.tick()
}

/**
 * The CSSOM value a browser reads back for a declaration, so a case compares
 * against what React's own style object produces rather than its source text.
 *
 * @param property - The kebab-case CSS property.
 * @param value - The value React's style object writes.
 * @returns The declaration's CSSOM-serialized value.
 */
function css(property: string, value: string): string {
  const probe = document.createElement('div')
  probe.style.setProperty(property, value)
  return probe.style.getPropertyValue(property)
}

/**
 * The declarations of a style attribute, split at the semicolons outside
 * quotes and brackets — the way the conformance normalizer reads them.
 *
 * @param value - The style attribute text.
 * @returns The written declarations.
 */
function declarations(value: string): string[] {
  const out: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]
    if (quote) {
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '(') depth += 1
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (ch === ';' && depth === 0) {
      out.push(value.slice(start, i))
      start = i + 1
    }
  }
  out.push(value.slice(start))
  return out.map((entry) => entry.trim()).filter(Boolean)
}

/**
 * One element's declaration value, read the way a browser applies an attribute
 * style: declaration by declaration, in order (so a shorthand never swallows a
 * later longhand).
 *
 * @param element - The rendered element.
 * @param property - The kebab-case CSS property.
 * @returns The declaration's CSSOM-serialized value.
 */
function styleOf(element: Element, property: string): string {
  const probe = document.createElement('div')
  for (const declaration of declarations(element.getAttribute('style') ?? '')) {
    const split = declaration.indexOf(':')
    if (split < 0) continue
    probe.style.setProperty(declaration.slice(0, split).trim(), declaration.slice(split + 1).trim())
  }
  return probe.style.getPropertyValue(property)
}

/**
 * The card's root element (React's outer margin div).
 *
 * @param container - The mount container.
 * @returns The root element.
 */
function root(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>('div[mol-commit-card-item]')
  if (!element) throw new Error('the commit card did not render')
  return element
}

/**
 * The header row (React's flex row holding the button, the revert control and
 * the disclosed file list).
 *
 * @param container - The mount container.
 * @returns The row element.
 */
function row(container: HTMLElement): HTMLElement {
  return root(container).children[0] as HTMLElement
}

/**
 * The row's disclosure button.
 *
 * @param container - The mount container.
 * @returns The button element.
 */
function headerButton(container: HTMLElement): HTMLButtonElement {
  return row(container).querySelector('button') as HTMLButtonElement
}

/**
 * The revert control, when it renders.
 *
 * @param container - The mount container.
 * @returns The control element or null.
 */
function revertControl(container: HTMLElement): HTMLElement | null {
  return row(container).querySelector<HTMLElement>('[role="button"]')
}

/**
 * The revert control, asserting that it rendered.
 *
 * @param container - The mount container.
 * @returns The control element.
 */
function control(container: HTMLElement): HTMLElement {
  const element = revertControl(container)
  if (!element) throw new Error('the revert control did not render')
  return element
}

/**
 * The disclosure chevron, asserting that it rendered.
 *
 * @param container - The mount container.
 * @returns The chevron element.
 */
function chevron(container: HTMLElement): HTMLElement {
  const element = headerButton(container).querySelector<HTMLElement>('svg[viewBox="0 0 16 16"]')
  if (!element) throw new Error('the disclosure chevron did not render')
  return element
}

/** Tears the mount alive right now down. */
function unmount(): void {
  current?.appRef.destroy()
  current?.container.remove()
  current = null
}

describe('CommitCardItem', () => {
  it('renders React’s outer rhythm and header row geometry', async () => {
    const container = await renderCard({
      id: 'c1',
      message: SUBJECT,
      files: ['src/Login.tsx'],
      timestamp: 1,
      status: 'done',
      hash: 'abc1234',
    })
    expect(styleOf(root(container), 'margin-bottom')).toBe(
      css('margin-bottom', `${TIMELINE_ITEM_GAP}px`),
    )
    expect(styleOf(row(container), 'margin-bottom')).toBe(css('margin-bottom', '4px'))
    expect(styleOf(row(container), 'display')).toBe('flex')
    expect(styleOf(row(container), 'align-items')).toBe('flex-start')

    const button = headerButton(container)
    expect(button.getAttribute('type')).toBe('button')
    expect(styleOf(button, 'display')).toBe('flex')
    expect(styleOf(button, 'gap')).toBe(css('gap', '6px'))
    expect(styleOf(button, 'background')).toBe(css('background', 'none'))
    expect(styleOf(button, 'border')).toBe(css('border', 'none'))
    expect(styleOf(button, 'cursor')).toBe('pointer')
    expect(styleOf(button, 'padding')).toBe(css('padding', '2px 0px'))
    expect(styleOf(button, 'width')).toBe('100%')
  })

  it('draws the status dot in its state colour', async () => {
    const done = await renderCard({
      id: 'c1',
      message: SUBJECT,
      files: [],
      timestamp: 1,
      status: 'done',
      hash: 'abc',
    })
    const doneCircles = root(done).querySelectorAll('circle')
    expect(doneCircles[0].getAttribute('fill')).toBe('#4070e0')
    expect(doneCircles[1].getAttribute('stroke')).toBe('#4070e0')
    expect(doneCircles[0].getAttribute('opacity')).toBe('0.35')
    expect(doneCircles[1].getAttribute('fill')).toBe('none')
    unmount()

    const running = await renderCard({
      id: 'c2',
      message: SUBJECT,
      files: [],
      timestamp: 1,
      status: 'running',
    })
    expect(root(running).querySelector('circle')?.getAttribute('fill')).toBe('#e8a000')
    expect(root(running).textContent).toContain('Committing...')
    expect(root(running).querySelector('code')).toBeNull()
    unmount()

    const error = await renderCard({
      id: 'c3',
      message: SUBJECT,
      files: [],
      timestamp: 1,
      status: 'error',
    })
    expect(root(error).querySelector('circle')?.getAttribute('fill')).toBe('#f04040')
  })

  it('renders the commit label with the co-author trailer stripped', async () => {
    const container = await renderCard({
      id: 'c1',
      message: `${SUBJECT}\n\nWires the OAuth callback.\n\n${SYNTHASE_TRAILER}`,
      files: ['src/Login.tsx'],
      timestamp: 1,
      status: 'done',
      hash: 'abc',
    })
    const text = container.textContent ?? ''
    expect(text).toContain(SUBJECT)
    expect(text).toContain('Wires the OAuth callback.')
    expect(text).not.toContain('Co-authored-by')
    expect(text).not.toContain('Synthase')

    const code = root(container).querySelector('code') as HTMLElement
    expect(code.textContent).toBe(`${SUBJECT}\n\nWires the OAuth callback.`)
    expect(styleOf(code, 'font-family')).toBe(
      css('font-family', '"SF Mono", Menlo, Consolas, "Courier New", monospace'),
    )
    expect(styleOf(code, 'font-size')).toBe('inherit')
    // React's label keeps a real space before the message.
    expect(code.parentElement?.textContent).toBe('Commit ' + code.textContent)
  })

  it('shows the file count only while collapsed, and hides the chevron without files', async () => {
    const container = await renderCard({
      id: 'c1',
      message: SUBJECT,
      files: ['src/Login.tsx', 'src/Profile.tsx'],
      timestamp: 1,
      status: 'done',
      hash: 'abc',
    })
    // The count line is the last span of the label block.
    const label = headerButton(container).children[1] as HTMLElement
    const fileCount = label.children[1] as HTMLElement
    expect(fileCount.textContent).toBe('2 files')
    expect(fileCount.className).toBe(
      getClassMap().cn(getClassMap().textMuted, getClassMap().textSize('xs')),
    )
    expect(styleOf(fileCount, 'display')).toBe('block')
    expect(styleOf(fileCount, 'margin-top')).toBe(css('margin-top', '1px'))
    // The chevron sits after the label, rotated to closed at 0.35 opacity.
    expect(styleOf(chevron(container), 'transform')).toBe('rotate(0deg)')
    expect(styleOf(chevron(container), 'opacity')).toBe('0.35')

    unmount()

    const bare = await renderCard({
      id: 'c2',
      message: SUBJECT,
      files: [],
      timestamp: 1,
      status: 'done',
      hash: 'abc',
    })
    expect(headerButton(bare).querySelector('svg[viewBox="0 0 16 16"]')).toBeNull()
    expect(styleOf(headerButton(bare), 'cursor')).toBe('default')
    expect(bare.textContent).not.toContain('files')
  })

  it('discloses the committed files inside the header row and collapses again', async () => {
    const container = await renderCard({
      id: 'c1',
      message: SUBJECT,
      files: ['src/Login.tsx', 'src/Profile.tsx'],
      timestamp: 1,
      status: 'done',
      hash: 'abc',
    })
    const button = headerButton(container)
    button.click()
    await flush()

    // React nests the disclosure in the flex row, after the button.
    expect(row(container).children).toHaveLength(2)
    const detail = row(container).children[1] as HTMLElement
    expect(detail.className).toBe(getClassMap().surfaceSecondary)
    expect(styleOf(detail, 'margin-left')).toBe(css('margin-left', '14px'))
    expect(styleOf(detail, 'margin-top')).toBe(css('margin-top', '4px'))
    expect(styleOf(detail, 'margin-bottom')).toBe(css('margin-bottom', '4px'))
    expect(styleOf(detail, 'border-radius')).toBe(css('border-radius', '4px'))
    expect(styleOf(detail, 'overflow-x')).toBe('auto')
    expect(styleOf(detail, 'padding')).toBe(css('padding', '6px 10px'))

    const list = detail.children[0] as HTMLElement
    expect(styleOf(list, 'font-size')).toBe(css('font-size', '11px'))
    expect(styleOf(list, 'line-height')).toBe('1.6')
    expect(Array.from(list.children).map((child) => child.textContent)).toEqual([
      'src/Login.tsx',
      'src/Profile.tsx',
    ])

    // Expanded: the count line makes way for the list, and the label wraps.
    expect(headerButton(container).textContent).not.toContain('2 files')
    expect(styleOf(headerButton(container).children[1], 'white-space')).toBe('normal')
    expect(styleOf(chevron(container), 'transform')).toBe('rotate(90deg)')

    button.click()
    await flush()
    expect(row(container).children).toHaveLength(1)
  })

  it('ignores clicks on a row without files', async () => {
    const container = await renderCard({
      id: 'c1',
      message: SUBJECT,
      files: [],
      timestamp: 1,
      status: 'done',
    })
    headerButton(container).click()
    await flush()
    expect(row(container).children).toHaveLength(1)
  })

  it('reveals the disclosure on row hover', async () => {
    const container = await renderCard({
      id: 'c1',
      message: SUBJECT,
      files: ['src/Login.tsx'],
      timestamp: 1,
      status: 'done',
      hash: 'abc',
    })
    headerButton(container).dispatchEvent(new MouseEvent('mouseenter'))
    await flush()
    expect(styleOf(chevron(container), 'opacity')).toBe('0.85')
    headerButton(container).dispatchEvent(new MouseEvent('mouseleave'))
    await flush()
    expect(styleOf(chevron(container), 'opacity')).toBe('0.35')
  })

  it('renders the revert control only for a done commit with a hash and a handler', async () => {
    const withHandler = await renderCard(
      { id: 'c1', message: SUBJECT, files: [], timestamp: 1, status: 'done', hash: 'abc' },
      async () => undefined,
    )
    const element = control(withHandler)
    expect(element.tagName.toLowerCase()).toBe('span')
    expect(element.getAttribute('tabindex')).toBe('0')
    expect(element.getAttribute('title')).toBe('Revert this commit')
    // The control is a SIBLING of the row button, never inside it.
    expect(headerButton(withHandler).contains(element)).toBe(false)
    expect(styleOf(element, 'width')).toBe(css('width', '20px'))
    expect(styleOf(element, 'height')).toBe(css('height', '20px'))
    expect(styleOf(element, 'opacity')).toBe('0')
    expect(styleOf(element, 'cursor')).toBe('pointer')
    unmount()

    // No handler → no control.
    const noHandler = await renderCard({
      id: 'c2',
      message: SUBJECT,
      files: [],
      timestamp: 1,
      status: 'done',
      hash: 'abc',
    })
    expect(revertControl(noHandler)).toBeNull()
    unmount()

    // No hash → no control.
    const noHash = await renderCard(
      { id: 'c3', message: SUBJECT, files: [], timestamp: 1, status: 'done' },
      async () => undefined,
    )
    expect(revertControl(noHash)).toBeNull()
    unmount()

    // Running and failed commits offer no control.
    for (const status of ['running', 'error'] as const) {
      const card = { id: 'c4', message: SUBJECT, files: [], timestamp: 1, status }
      const running = await renderCard(card, async () => undefined)
      expect(revertControl(running)).toBeNull()
      unmount()
    }
  })

  it('reverts, then re-applies the revert commit on the next activation', async () => {
    const onRevert = vi.fn(async () => 'revert-hash')
    const container = await renderCard(
      {
        id: 'c1',
        message: SUBJECT,
        files: ['src/Login.tsx'],
        timestamp: 1,
        status: 'done',
        hash: 'abc1234',
      },
      onRevert,
    )

    revertControl(container)?.click()
    await flush()
    expect(onRevert).toHaveBeenCalledTimes(1)
    expect(onRevert).toHaveBeenCalledWith('abc1234')
    expect(revertControl(container)?.getAttribute('title')).toBe('Re-apply this commit')
    // Clicking the control must not also toggle the row (stopPropagation).
    expect(row(container).children).toHaveLength(2)

    revertControl(container)?.click()
    await flush()
    expect(onRevert).toHaveBeenCalledTimes(2)
    expect(onRevert).toHaveBeenLastCalledWith('revert-hash')
    expect(revertControl(container)?.getAttribute('title')).toBe('Revert this commit')
  })

  it('marks the control busy while a revert is in flight', async () => {
    let resolve: ((hash: string | undefined) => void) | undefined
    const onRevert = (): Promise<string | undefined> =>
      new Promise((settle) => {
        resolve = settle
      })
    const container = await renderCard(
      { id: 'c1', message: SUBJECT, files: [], timestamp: 1, status: 'done', hash: 'abc' },
      onRevert,
    )
    revertControl(container)?.click()
    await flush()
    expect(styleOf(control(container), 'cursor')).toBe('wait')
    expect(styleOf(control(container), 'opacity')).toBe('0.3')
    // A second activation during the request is ignored.
    revertControl(container)?.click()
    await flush()
    expect(typeof resolve).toBe('function')
    resolve?.('next-hash')
    await flush()
    expect(revertControl(container)?.getAttribute('title')).toBe('Re-apply this commit')
    expect(styleOf(control(container), 'cursor')).toBe('pointer')
  })

  it('keeps the control revealed by the row hover and by its own hover', async () => {
    const container = await renderCard(
      { id: 'c1', message: SUBJECT, files: [], timestamp: 1, status: 'done', hash: 'abc' },
      async () => undefined,
    )
    const element = control(container)

    headerButton(container).dispatchEvent(new MouseEvent('mouseenter'))
    await flush()
    expect(styleOf(element, 'opacity')).toBe('0.6')

    element.dispatchEvent(new MouseEvent('mouseenter'))
    await flush()
    expect(styleOf(element, 'background')).toBe(css('background', 'rgba(128,128,128,0.2)'))
    // React writes 1 on enter and only re-applies the rendered 0.6 when that
    // value changes, so while the row hover already held it at 0.6 the control
    // stays at 1 — the reference DOM the conformance kit records.
    expect(styleOf(element, 'opacity')).toBe('1')

    element.dispatchEvent(new MouseEvent('mouseleave'))
    await flush()
    expect(styleOf(element, 'background')).toBe(css('background', 'transparent'))
    // The row is still hovered, so React cleared its imperative opacity without
    // re-rendering the unchanged 0.6: the declaration is simply absent.
    expect(styleOf(element, 'opacity')).toBe('')

    headerButton(container).dispatchEvent(new MouseEvent('mouseleave'))
    await flush()
    expect(styleOf(element, 'opacity')).toBe('0')
  })

  it('activates the revert control from the keyboard', async () => {
    const onRevert = vi.fn(async () => undefined)
    const container = await renderCard(
      { id: 'c1', message: SUBJECT, files: [], timestamp: 1, status: 'done', hash: 'abc' },
      onRevert,
    )
    const element = control(container)
    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    element.dispatchEvent(enter)
    await flush()
    expect(enter.defaultPrevented).toBe(true)
    expect(onRevert).toHaveBeenCalledWith('abc')

    const other = new KeyboardEvent('keydown', { key: 'a', cancelable: true })
    element.dispatchEvent(other)
    await flush()
    expect(other.defaultPrevented).toBe(false)
    expect(onRevert).toHaveBeenCalledTimes(1)

    const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true })
    element.dispatchEvent(space)
    await flush()
    expect(onRevert).toHaveBeenCalledTimes(2)
  })

  it('rests the control visible with a 32px hit box on a coarse pointer', async () => {
    window.matchMedia = (query: string): MediaQueryList =>
      Object.assign(new EventTarget(), {
        matches: query === COARSE_POINTER_QUERY,
        media: query,
        onchange: null,
        addListener: (): void => undefined,
        removeListener: (): void => undefined,
      })
    const container = await renderCard(
      { id: 'c1', message: SUBJECT, files: [], timestamp: 1, status: 'done', hash: 'abc' },
      async () => undefined,
    )
    const element = control(container)
    expect(styleOf(element, 'width')).toBe(css('width', '32px'))
    expect(styleOf(element, 'height')).toBe(css('height', '32px'))
    expect(styleOf(element, 'opacity')).toBe('0.6')
  })
})
