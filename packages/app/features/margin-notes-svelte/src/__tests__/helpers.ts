/**
 * Shared fixtures for the Svelte margin-notes tests: the ClassMap bond, the
 * i18n provider, a client mount and a server render.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarginNotes } from '../components.js'
import type { MarginNote, MarginNoteKind, MarginNotesBlock, MarginNotesProps } from '../types.js'

/** The i18n provider every mount installs (no translations, so defaults show). */
export const i18nProvider = createSimpleI18nProvider('en')

/** Installs the i18n provider the Svelte binding reads. */
export function installI18n(): void {
  setProvider(i18nProvider)
}

/** Bonds the real Tailwind ClassMap and a minimal icon set (the pin glyph). */
export function installBonds(): void {
  setClassMap(classMap)
  setIconSet({ pin: { paths: [{ d: 'M5 5h6v6H5z' }] } })
}

/**
 * A snippet rendering the given markup, the way a caller fills a node prop.
 *
 * @param html - The markup.
 * @returns The snippet.
 */
export function raw(html: string): Snippet {
  return createRawSnippet(() => ({ render: () => html }))
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
      { id: 'p1', content: raw('<p>Human opening paragraph.</p>'), noteIds: ['s1'] },
      {
        id: 'p2',
        content: raw('<p>An AI-written paragraph.</p>'),
        noteIds: ['s1', 'q1'],
        marked: true,
      },
      {
        id: 'p3',
        content: raw('<p>Another AI paragraph, same prompt.</p>'),
        noteIds: ['s1', 'q1'],
        marked: true,
      },
      { id: 'p4', content: raw('<p>Closing words.</p>') },
    ],
    notes: [
      { id: 's1', kind: 'summary', content: raw('<p>SUMMARY-ONE</p>') },
      { id: 'q1', kind: 'prompt', content: raw('<p>PROMPT-ONE</p>') },
    ],
    kinds: [
      { id: 'summary', label: 'Summaries', defaultOn: true },
      { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
    ],
  }
}

/** The teardowns of the components the running test mounted. */
const mounted: Array<() => void> = []

/** Disposes every component the previous test mounted. */
export function disposeAll(): void {
  for (const dispose of mounted.splice(0)) dispose()
  document.body.innerHTML = ''
}

/**
 * Mounts `<MarginNotes>` with the given props.
 *
 * @param props - The props.
 * @returns The container element.
 */
export function mountNotes(props: MarginNotesProps): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(MarginNotes, { target, props })
  mounted.push(() => unmount(component))
  flushSync()
  return target
}

/**
 * Server-renders `<MarginNotes>` with the given props.
 *
 * @param props - The props.
 * @returns The HTML body.
 */
export async function renderHtml(props: MarginNotesProps): Promise<string> {
  const { render } = await import('svelte/server')
  return render(MarginNotes, { props }).body
}

/** Flushes Svelte's pending component updates. */
export function settle(): void {
  flushSync()
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
 * Clicks an element.
 *
 * @param el - The element.
 */
export const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  settle()
}

/**
 * Hovers an element.
 *
 * @param el - The element.
 */
export const enter = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
  settle()
}

/**
 * Un-hovers an element.
 *
 * @param el - The element.
 */
export const leave = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
  settle()
}

/**
 * Focuses an element the way a browser (and the conformance kit) does.
 *
 * @param el - The element.
 */
export const focusIn = (el: HTMLElement): void => {
  el.focus()
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  settle()
}

/**
 * Blurs an element the way a browser (and the conformance kit) does.
 *
 * @param el - The element.
 */
export const focusOut = (el: HTMLElement): void => {
  el.blur()
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  settle()
}
