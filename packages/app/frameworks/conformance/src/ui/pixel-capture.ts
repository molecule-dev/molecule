/**
 * Pixel capture: each snapshot as a static page a real browser can render.
 *
 * The case runner compares normalized DOM, which is equal pixels only if the
 * normalizer drops nothing that draws. To check that claim in a browser, a run
 * with `CONFORMANCE_PIXEL_DIR=<dir>` also records every snapshot as a page:
 * the document's `<html>` and `<body>` as they are (attributes, text, comments,
 * framework attributes), the live state of form controls written into
 * attributes (a serialized `<input>` otherwise loses the value a user typed),
 * and every stylesheet a framework put into `<head>`. Only the harness's own
 * mount wrappers (`data-parity-unwrap`) are replaced by their children, since
 * no app has them. `scripts/framework-pixel-parity.mjs` in the workspace
 * renders React's page and each framework's page in Chromium with the
 * reference stylesheet and compares the pixels.
 *
 * Without the variable nothing is recorded, so ordinary runs pay nothing.
 *
 * @module
 */

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { losesEmptySelection } from './select-state.js'
import { styleDeclarations } from './style-declarations.js'

/** Where pixel pages go (`CONFORMANCE_PIXEL_DIR`), or null when the run records none. */
export const pixelCaptureDir = (): string | null => process.env.CONFORMANCE_PIXEL_DIR || null

/** The attribute that marks a checkbox the page shows as indeterminate (no HTML attribute exists). */
export const INDETERMINATE_ATTRIBUTE = 'data-pixel-indeterminate'

/** Marks a dropdown whose live empty selection would be replaced when its HTML is parsed. */
const EMPTY_SELECTION_ATTRIBUTE = 'data-pixel-empty-selection'

const FORM_CONTROLS = 'input, textarea, select, option'

/**
 * Writes each form control's live state into attributes of its copy.
 *
 * @param live - A control in the document.
 * @param copy - The same control in the cloned body.
 */
const copyControlState = (live: Element, copy: Element): void => {
  if (live instanceof HTMLInputElement) {
    if (live.type === 'checkbox' || live.type === 'radio') {
      copy.toggleAttribute('checked', live.checked)
      copy.toggleAttribute(INDETERMINATE_ATTRIBUTE, live.indeterminate)
    } else if (live.type !== 'file') {
      copy.setAttribute('value', live.value)
    }
  } else if (live instanceof HTMLTextAreaElement) {
    copy.textContent = live.value
  } else if (live.localName === 'select') {
    copy.toggleAttribute(EMPTY_SELECTION_ATTRIBUTE, losesEmptySelection(live))
  } else if (live instanceof HTMLOptionElement) {
    copy.toggleAttribute('selected', live.selected)
  }
}

/**
 * Escapes an attribute value for a double-quoted attribute.
 *
 * @param value - The raw value.
 * @returns The escaped value.
 */
const attributeValue = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * Expands the min/max-size shorthands jsdom's CSSOM may generate from paired width and height
 * longhands. Chromium drops those shorthands. Read the values from the original CSSOM so a
 * lossy serialization never has to be parsed back into dimensions.
 *
 * @param el - The styled element in the live document.
 * @returns Its inline style in browser-readable form, or null when no style was set.
 */
const captureStyle = (el: Element): string | null => {
  const written = el.getAttribute('style')
  if (!written || !/(?:min|max)-size\s*:/i.test(written)) return written
  if (!(el instanceof HTMLElement || el instanceof SVGElement)) return written
  return styleDeclarations(written)
    .flatMap((declaration) => {
      const prefix = /^(min|max)-size\s*:/i.exec(declaration)?.[1]?.toLowerCase()
      if (!prefix) return declaration
      const longhands = [`${prefix}-width`, `${prefix}-height`].map((name) => {
        const value = el.style.getPropertyValue(name)
        const priority = el.style.getPropertyPriority(name)
        return value && `${name}: ${value}${priority ? ' !important' : ''}`
      })
      return longhands.every(Boolean) ? longhands : declaration
    })
    .join('; ')
}

/**
 * The document as a static page: `<html>` with its attributes, the stylesheets in
 * `<head>` (except the kit's own reference stylesheet), and `<body>` with live
 * form state written into attributes and the harness mount wrappers unwrapped.
 *
 * @param doc - The test document.
 * @returns The page's HTML.
 */
export function capturePage(doc: Document): string {
  const body = doc.body.cloneNode(true) as HTMLElement
  // Controls pair by document order, which holds only while the clone has the live tree's
  // shape: copy their state before anything below restructures the clone.
  const live = Array.from(doc.body.querySelectorAll(FORM_CONTROLS))
  const copies = Array.from(body.querySelectorAll(FORM_CONTROLS))
  live.forEach((control, i) => {
    const copy = copies[i]
    if (!copy) throw new Error('pixel capture: missing form control in cloned body')
    copyControlState(control, copy)
  })
  const styled = [doc.body, ...doc.body.querySelectorAll('[style]')]
  const styledCopies = [body, ...body.querySelectorAll('[style]')]
  styled.forEach((element, i) => {
    const style = captureStyle(element)
    if (style !== null && style !== element.getAttribute('style'))
      styledCopies[i]?.setAttribute('style', style)
  })
  for (const wrapper of Array.from(body.querySelectorAll('[data-parity-unwrap]')))
    wrapper.replaceWith(...Array.from(wrapper.childNodes))
  // A script draws nothing, and would run in the browser that renders the page.
  for (const script of Array.from(body.querySelectorAll('script'))) script.remove()
  const styles = Array.from(doc.head.querySelectorAll('style, link[rel~="stylesheet"]'))
    .filter((el) => !el.hasAttribute('data-parity-reference-stylesheet'))
    .map((el) => el.outerHTML)
    .join('')
  const htmlAttributes = Array.from(doc.documentElement.attributes)
    .map((attribute) => {
      const value =
        attribute.name === 'style' ? (captureStyle(doc.documentElement) ?? '') : attribute.value
      return ` ${attribute.name}="${attributeValue(value)}"`
    })
    .join('')
  return `<!doctype html><html${htmlAttributes}><head>${styles}</head>${body.outerHTML}</html>`
}

/** One case's pages, as {@link writePixelCapture} stores them. */
export interface PixelCapture {
  /** The React package the case belongs to (`@molecule/app-ui-react`, `@molecule/app-header-react`). */
  reference: string
  /** The component the case renders. */
  component: string
  /** The case name. */
  case: string
  /** One page per snapshot: after mount, then after each interaction. */
  pages: string[]
}

/**
 * The file one case's pages go to, the same for every framework.
 *
 * @param reference - The React package the case belongs to.
 * @param component - The component.
 * @param caseName - The case.
 * @returns The file name.
 */
export const pixelCaptureFile = (reference: string, component: string, caseName: string): string =>
  `${createHash('sha256').update(`${reference}\0${component}\0${caseName}`).digest('hex').slice(0, 32)}.json`

/**
 * Stores one case's pages under `<CONFORMANCE_PIXEL_DIR>/<framework>/`, when the run records them.
 *
 * @param framework - `react`, `vue`, `solid`, `svelte` or `angular`.
 * @param capture - The case and its pages.
 */
export function writePixelCapture(framework: string, capture: PixelCapture): void {
  const root = pixelCaptureDir()
  if (!root) return
  const dir = join(root, framework)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, pixelCaptureFile(capture.reference, capture.component, capture.case)),
    JSON.stringify(capture),
  )
}
