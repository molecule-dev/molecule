/**
 * Shared fixtures for the Vue margin-notes tests: the stub ClassMap, the i18n
 * provider, a client mount and a server render.
 *
 * @module
 */

import { createApp, createSSRApp, defineComponent, h, type VNode, type VNodeChild } from 'vue'
import { renderToString as renderServer } from 'vue/server-renderer'

import { createSimpleI18nProvider, type I18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { I18nKey } from '@molecule/app-vue'

import { MarginNotes } from '../MarginNotes.js'
import type { MarginNote, MarginNoteKind, MarginNotesBlock, MarginNotesProps } from '../types.js'

/** The i18n provider every mount installs (no translations, so defaults show). */
export const i18nProvider: I18nProvider = createSimpleI18nProvider('en')

/**
 * Bonds a minimal icon set, so the pin glyph resolves (the component renders
 * the same  in every framework).
 */
export function installStubIcons(): void {
  setIconSet({ pin: { paths: [{ d: 'M5 5h6v6H5z' }] } })
}

/**
 * Bonds the real Tailwind ClassMap, so the classes the component asks for are
 * the strings a consumer gets (and framework prop types see strings).
 */
export function installStubClassMap(): void {
  setClassMap(classMap)
}

/**
 * A small annotated document: a section summary over three paragraphs, two prompts.
 *
 * @returns Fresh blocks, notes and kinds (VNodes cannot be rendered twice).
 */
export function makeDoc(): {
  blocks: MarginNotesBlock[]
  notes: MarginNote[]
  kinds: MarginNoteKind[]
} {
  return {
    blocks: [
      { id: 'p1', content: h('p', 'Human opening paragraph.'), noteIds: ['s1'] },
      {
        id: 'p2',
        content: h('p', 'An AI-written paragraph.'),
        noteIds: ['s1', 'q1'],
        marked: true,
      },
      {
        id: 'p3',
        content: h('p', 'Another AI paragraph, same prompt.'),
        noteIds: ['s1', 'q1'],
        marked: true,
      },
      { id: 'p4', content: h('p', 'Closing words.') },
    ],
    notes: [
      { id: 's1', kind: 'summary', content: h('p', 'SUMMARY-ONE') },
      { id: 'q1', kind: 'prompt', content: h('p', 'PROMPT-ONE') },
    ],
    kinds: [
      { id: 'summary', label: 'Summaries', defaultOn: true },
      { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
    ],
  }
}

/**
 * Mounts a tree with the i18n provider installed.
 *
 * @param root - The root render function.
 * @param container - The element to mount into (a fresh one by default).
 * @returns The container element.
 */
export function mount(root: () => VNodeChild, container?: HTMLElement): HTMLElement {
  const host = container ?? document.createElement('div')
  if (!container) document.body.appendChild(host)
  const app = createApp(defineComponent({ render: root }))
  app.provide(I18nKey, i18nProvider)
  app.mount(host)
  return host
}

/**
 * Mounts `<MarginNotes>` with the given props.
 *
 * @param props - The props.
 * @returns The container element.
 */
export function mountNotes(props: MarginNotesProps): HTMLElement {
  return mount(() => h(MarginNotes, props) as VNode)
}

/**
 * Server-renders a tree with the i18n provider installed.
 *
 * @param root - The root render function.
 * @returns The HTML.
 */
export async function renderHtml(root: () => VNodeChild): Promise<string> {
  const app = createSSRApp(defineComponent({ render: root }))
  app.provide(I18nKey, i18nProvider)
  return renderServer(app)
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
