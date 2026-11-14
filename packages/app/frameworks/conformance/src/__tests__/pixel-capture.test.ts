/**
 * Unit tests for the pixel capture: the static pages a run with
 * `CONFORMANCE_PIXEL_DIR` set records alongside the normalized snapshots.
 *
 * `capturePage` must serialize the document the way a browser draws it: the
 * live state of every form control written into attributes, the harness's
 * mount wrappers replaced by their children, the page's `<html>`/`<body>`
 * attributes and the stylesheets in `<head>` kept — all without touching the
 * live document. The recording itself stays silent without the variable, and
 * the real runner records one page per snapshot only while it is set.
 *
 * @module
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import '../ui/setup.js'
import { afterEach, describe, expect, it } from 'vitest'

import {
  capturePage,
  INDETERMINATE_ATTRIBUTE,
  type PixelCapture,
  pixelCaptureDir,
  pixelCaptureFile,
  writePixelCapture,
} from '../ui/pixel-capture.js'
import { reactAdapter } from './react-adapter.js'

const originalPixelDir = process.env.CONFORMANCE_PIXEL_DIR
let pixelDir: string | undefined

afterEach(() => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  for (const attribute of Array.from(document.documentElement.attributes))
    document.documentElement.removeAttribute(attribute.name)
  if (originalPixelDir === undefined) delete process.env.CONFORMANCE_PIXEL_DIR
  else process.env.CONFORMANCE_PIXEL_DIR = originalPixelDir
  if (pixelDir) {
    rmSync(pixelDir, { recursive: true, force: true })
    pixelDir = undefined
  }
})

/**
 * Parses a captured page back into a document, as the browser reading the file would.
 *
 * @param page - The HTML `capturePage` produced.
 * @returns The parsed document.
 */
const parse = (page: string): Document => new DOMParser().parseFromString(page, 'text/html')

/**
 * Creates an input of the given type, in the body's querySelectorAll order.
 *
 * @param type - The input's `type`.
 * @param id - An id to find the element by in the captured page.
 * @returns The input, not yet connected.
 */
const input = (type: string, id: string): HTMLInputElement => {
  const el = document.createElement('input')
  el.type = type
  el.id = id
  return el
}

describe('capturePage', () => {
  it('writes the live form state into attributes of the captured copy', () => {
    const checkedBox = input('checkbox', 'checked-box')
    checkedBox.checked = true
    const uncheckedBox = input('checkbox', 'unchecked-box')
    uncheckedBox.checked = false
    const indeterminateBox = input('checkbox', 'indeterminate-box')
    indeterminateBox.indeterminate = true
    const textInput = input('text', 'text-input')
    textInput.value = 'typed text'
    const note = document.createElement('textarea')
    note.id = 'note'
    note.value = 'note text'
    const select = document.createElement('select')
    const first = document.createElement('option')
    first.id = 'first-option'
    const second = document.createElement('option')
    second.id = 'second-option'
    select.append(first, second)
    second.selected = true
    const file = input('file', 'file-input')
    document.body.append(checkedBox, uncheckedBox, indeterminateBox, textInput, note, select, file)

    const parsed = parse(capturePage(document))
    expect(parsed.getElementById('checked-box')?.hasAttribute('checked')).toBe(true)
    expect(parsed.getElementById('unchecked-box')?.hasAttribute('checked')).toBe(false)
    expect(parsed.getElementById('indeterminate-box')?.hasAttribute(INDETERMINATE_ATTRIBUTE)).toBe(
      true,
    )
    expect(parsed.getElementById('text-input')?.getAttribute('value')).toBe('typed text')
    expect(parsed.getElementById('note')?.textContent).toBe('note text')
    expect(parsed.getElementById('second-option')?.hasAttribute('selected')).toBe(true)
    expect(parsed.getElementById('first-option')?.hasAttribute('selected')).toBe(false)
    expect(parsed.getElementById('file-input')?.hasAttribute('value')).toBe(false)
  })

  it('replaces every data-parity-unwrap element with its children, nested ones included, in order', () => {
    const outer = document.createElement('div')
    outer.setAttribute('data-parity-unwrap', '')
    const inner = document.createElement('div')
    inner.setAttribute('data-parity-unwrap', '')
    inner.append('Two')
    outer.append('One', inner, 'Three')
    document.body.append(outer)

    const parsed = parse(capturePage(document))
    expect(parsed.querySelectorAll('[data-parity-unwrap]')).toHaveLength(0)
    expect(parsed.body.textContent).toBe('OneTwoThree')
  })

  it('keeps the html and body attributes, escaping quotes, ampersands and < in values', () => {
    document.documentElement.setAttribute('class', 'dark')
    document.documentElement.setAttribute('lang', 'en')
    document.documentElement.setAttribute('data-weird', 'a"&<b')
    document.body.setAttribute('style', 'overflow: hidden')

    expect(capturePage(document)).toBe(
      '<!doctype html><html class="dark" lang="en" data-weird="a&quot;&amp;&lt;b">' +
        '<head></head><body style="overflow: hidden"></body></html>',
    )
  })

  it('keeps the stylesheets in head but leaves out the reference stylesheet', () => {
    const style = document.createElement('style')
    style.textContent = '.mine { color: red }'
    const link = document.createElement('link')
    link.setAttribute('rel', 'stylesheet')
    link.setAttribute('href', '/theme.css')
    const preloaded = document.createElement('link')
    preloaded.setAttribute('rel', 'preload stylesheet')
    preloaded.setAttribute('href', '/fonts.css')
    const reference = document.createElement('style')
    reference.setAttribute('data-parity-reference-stylesheet', '')
    reference.textContent = '.reference { color: blue }'
    document.head.append(style, link, preloaded, reference)

    const page = capturePage(document)
    expect(page).toContain('<style>.mine { color: red }</style>')
    expect(page).toContain('<link rel="stylesheet" href="/theme.css">')
    expect(page).toContain('<link rel="preload stylesheet" href="/fonts.css">')
    expect(page).not.toContain('.reference')
    expect(page).not.toContain('data-parity-reference-stylesheet')
  })

  it('drops scripts, which draw nothing and would run in the rendering browser', () => {
    const script = document.createElement('script')
    script.textContent = 'void 0'
    const text = document.createElement('p')
    text.append('kept')
    document.body.append(text, script)

    const parsed = parse(capturePage(document))
    expect(parsed.querySelectorAll('script')).toHaveLength(0)
    expect(parsed.body.textContent).toBe('kept')
    expect(document.body.contains(script)).toBe(true)
  })

  it('leaves the live document untouched', () => {
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-parity-unwrap', '')
    wrapper.append('mounted')
    const checkbox = input('checkbox', 'live-checkbox')
    checkbox.checked = true
    const textInput = input('text', 'live-input')
    textInput.value = 'typed'
    document.body.append(wrapper, checkbox, textInput)

    capturePage(document)
    expect(checkbox.hasAttribute('checked')).toBe(false)
    expect(textInput.hasAttribute('value')).toBe(false)
    expect(document.querySelector('[data-parity-unwrap]')).toBe(wrapper)
    expect(wrapper.textContent).toBe('mounted')
  })
})

describe('writePixelCapture', () => {
  it('writes nothing without CONFORMANCE_PIXEL_DIR, and the case as one JSON file with it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pixel-capture-'))
    pixelDir = dir
    delete process.env.CONFORMANCE_PIXEL_DIR
    expect(pixelCaptureDir()).toBeNull()
    writePixelCapture('react', {
      reference: '@molecule/app-ui-react',
      component: 'Button',
      case: 'unset',
      pages: [],
    })
    expect(readdirSync(dir)).toEqual([])

    process.env.CONFORMANCE_PIXEL_DIR = dir
    expect(pixelCaptureDir()).toBe(dir)
    const capture: PixelCapture = {
      reference: '@molecule/app-ui-react',
      component: 'Button',
      case: 'written',
      pages: ['<!doctype html><html><body><p>one</p></body></html>'],
    }
    writePixelCapture('react', capture)
    const file = join(
      dir,
      'react',
      pixelCaptureFile(capture.reference, capture.component, capture.case),
    )
    expect(readdirSync(join(dir, 'react'))).toEqual([
      pixelCaptureFile(capture.reference, capture.component, capture.case),
    ])
    const stored: unknown = JSON.parse(readFileSync(file, 'utf8'))
    expect(stored).toEqual(capture)
  })
})

describe('pixelCaptureFile', () => {
  it('names one file per reference, component and case', () => {
    const file = pixelCaptureFile('@molecule/app-ui-react', 'Button', 'defaults')
    expect(pixelCaptureFile('@molecule/app-ui-react', 'Button', 'defaults')).toBe(file)
    expect(pixelCaptureFile('@molecule/app-header-react', 'Button', 'defaults')).not.toBe(file)
    expect(pixelCaptureFile('@molecule/app-ui-react', 'Card', 'defaults')).not.toBe(file)
    expect(pixelCaptureFile('@molecule/app-ui-react', 'Button', 'variant solid')).not.toBe(file)
  })
})

describe('reactAdapter.run pixel pages', () => {
  it('returns no pages without CONFORMANCE_PIXEL_DIR and one unwrapped page with it', async () => {
    delete process.env.CONFORMANCE_PIXEL_DIR
    const without = await reactAdapter.run('Button', {
      name: 'pixel',
      props: { children: 'Hi' },
    })
    expect(without.pages).toBeUndefined()

    const dir = mkdtempSync(join(tmpdir(), 'pixel-capture-'))
    pixelDir = dir
    process.env.CONFORMANCE_PIXEL_DIR = dir
    const captured = await reactAdapter.run('Button', {
      name: 'pixel',
      props: { children: 'Hi' },
    })
    expect(captured.pages).toHaveLength(1)
    const page = captured.pages?.[0]
    if (!page) throw new Error('pixel capture: the run recorded no page')
    expect(page).toContain('Hi')
    expect(page).toMatch(/^<!doctype html><html/)
    expect(page).not.toContain('data-parity-unwrap')
  })
})
