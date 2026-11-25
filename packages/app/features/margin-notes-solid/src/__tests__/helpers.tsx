/**
 * Shared fixtures for the Solid margin-notes tests: the ClassMap, the i18n
 * provider, a client mount and a server render.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render, renderToString } from 'solid-js/web'

import { createSimpleI18nProvider, type I18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { I18nContext } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarginNotes } from '../MarginNotes.jsx'
import type { MarginNote, MarginNoteKind, MarginNotesBlock, MarginNotesProps } from '../types.js'

/** The i18n provider every mount installs (no translations, so defaults show). */
export const i18nProvider: I18nProvider = createSimpleI18nProvider('en')

/** Bonds the real Tailwind ClassMap and a minimal icon set (the pin glyph). */
export function installBonds(): void {
  setClassMap(classMap)
  setIconSet({ pin: { paths: [{ d: 'M5 5h6v6H5z' }] } })
}

/**
 * A small annotated document: a section summary over three paragraphs, two prompts.
 *
 * @returns Fresh blocks, notes and kinds.
 */
export function makeDoc(): {
  blocks: MarginNotesBlock[]
  notes: MarginNote[]
  kinds: MarginNoteKind[]
} {
  return {
    blocks: [
      { id: 'p1', content: <p>Human opening paragraph.</p>, noteIds: ['s1'] },
      {
        id: 'p2',
        content: <p>An AI-written paragraph.</p>,
        noteIds: ['s1', 'q1'],
        marked: true,
      },
      {
        id: 'p3',
        content: <p>Another AI paragraph, same prompt.</p>,
        noteIds: ['s1', 'q1'],
        marked: true,
      },
      { id: 'p4', content: <p>Closing words.</p> },
    ],
    notes: [
      { id: 's1', kind: 'summary', content: <p>SUMMARY-ONE</p> },
      { id: 'q1', kind: 'prompt', content: <p>PROMPT-ONE</p> },
    ],
    kinds: [
      { id: 'summary', label: 'Summaries', defaultOn: true },
      { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
    ],
  }
}

/**
 * A document of two sections that each open on a heading: a later noted section
 * for the phone panel to reach, and rows whose text starts below the row's top.
 *
 * @returns Fresh blocks and notes.
 */
export function makeSections(): { blocks: MarginNotesBlock[]; notes: MarginNote[] } {
  return {
    blocks: [
      { id: 'h1', content: <h2>First section</h2>, noteIds: ['s1'] },
      { id: 'a1', content: <p>First body.</p>, noteIds: ['s1'] },
      { id: 'h2', content: <h2>Second section</h2>, noteIds: ['s2'] },
      { id: 'b1', content: <p>Second body.</p>, noteIds: ['s2'], marked: true },
    ],
    notes: [
      { id: 's1', kind: 'summary', content: <p>FIRST-SUMMARY</p> },
      { id: 's2', kind: 'summary', content: <p>SECOND-SUMMARY</p> },
    ],
  }
}

/** The teardowns of the trees the running test rendered. */
const disposers: Array<() => void> = []

/** Disposes every tree the previous test rendered. */
export function disposeAll(): void {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
}

/**
 * Renders a view inside the i18n provider.
 *
 * @param view - The view to render.
 * @returns The container element.
 */
export function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => <I18nContext.Provider value={i18nProvider}>{view()}</I18nContext.Provider>,
      container,
    ),
  )
  return container
}

/**
 * Renders `<MarginNotes>` with the given props.
 *
 * @param props - The props.
 * @returns The container element.
 */
export function mountNotes(props: MarginNotesProps): HTMLElement {
  return mount(() => <MarginNotes {...props} />)
}

/**
 * Server-renders a view inside the i18n provider.
 *
 * @param view - The view to render.
 * @returns The HTML.
 */
export function renderHtml(view: () => JSX.Element): string {
  return renderToString(() => (
    <I18nContext.Provider value={i18nProvider}>{view()}</I18nContext.Provider>
  ))
}

/**
 * The element carrying `data-mol-id="<id>"`.
 *
 * @param id - The `data-mol-id` value.
 * @returns The element.
 */
export function byMol(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-mol-id="${id}"]`)
  if (!el) throw new Error(`no ${id}`)
  return el
}

/**
 * The element carrying `data-testid="<id>"`.
 *
 * @param id - The `data-testid` value.
 * @returns The element.
 */
export function byTestId(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  if (!el) throw new Error(`no test id ${id}`)
  return el
}

/**
 * Clicks an element.
 *
 * @param el - The element.
 */
export const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

/**
 * Hovers an element.
 *
 * @param el - The element.
 */
export const enter = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
}

/**
 * Un-hovers an element.
 *
 * @param el - The element.
 */
export const leave = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
}

/**
 * Focuses an element the way a browser (and the conformance kit) does.
 *
 * @param el - The element.
 */
export const focusIn = (el: HTMLElement): void => {
  el.focus()
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

/**
 * Blurs an element the way a browser (and the conformance kit) does.
 *
 * @param el - The element.
 */
export const focusOut = (el: HTMLElement): void => {
  el.blur()
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}
