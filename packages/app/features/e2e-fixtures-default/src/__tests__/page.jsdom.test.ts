// @vitest-environment jsdom
/**
 * The Playwright-shaped page over a transport that evaluates in THIS jsdom
 * document — the whole driver/runtime round trip without a browser.
 */
import { afterEach, beforeEach, describe, expect as vexpect, it } from 'vitest'

import { E2EStrictModeError, type E2ETransport, E2EUnsupportedError } from '@molecule/app-e2e'

import { expect } from '../expect.js'
import { createEvaluatePage } from '../page.js'

type Listener = (payload: unknown) => void

const zero = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  toJSON: () => ({}),
}

const hasHiddenAncestor = (el: Element): boolean => {
  for (let e: Element | null = el; e; e = e.parentElement) {
    if (getComputedStyle(e).display === 'none') return true
  }
  return false
}

/** jsdom lays nothing out: give every connected, displayed element a box so visibility means something. */
const stubLayout = (): void => {
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (!this.isConnected || hasHiddenAncestor(this)) return zero
    const i = Array.from(document.querySelectorAll('*')).indexOf(this)
    const top = 10 + i * 24
    return {
      x: 10,
      y: top,
      width: 100,
      height: 20,
      top,
      left: 10,
      right: 110,
      bottom: top + 20,
      toJSON: () => ({}),
    }
  }
}

const makeTransport = (): {
  transport: E2ETransport
  emit: (event: string, payload: unknown) => void
} => {
  const listeners = new Map<string, Set<Listener>>()
  const transport: E2ETransport = {
    async evaluate(source, arg) {
      const fn = new Function('return (' + source + ')')() as (a: unknown) => unknown
      const value = await fn(arg)
      return value === undefined ? null : JSON.parse(JSON.stringify(value))
    },
    async navigate(kind, url) {
      if (kind === 'goto' && url)
        window.history.pushState({}, '', new URL(url, location.href).pathname)
    },
    async viewport() {
      return { width: window.innerWidth, height: window.innerHeight }
    },
    url: () => location.href,
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(listener as Listener)
      return () => listeners.get(event)?.delete(listener as Listener)
    },
    async close() {
      /* nothing */
    },
  }
  return { transport, emit: (event, payload) => listeners.get(event)?.forEach((fn) => fn(payload)) }
}

const HTML = `
  <h1>Field Notes</h1>
  <h2>First</h2>
  <h2>Second</h2>
  <p id="lead">Hello <span>world</span></p>
  <form id="f">
    <label for="email">Email</label><input id="email" type="email" />
    <label><input type="checkbox" id="agree" /> I agree</label>
    <select id="pick"><option value="a">Alpha</option><option value="b">Beta</option></select>
    <button type="submit">Save</button>
  </form>
  <nav><a href="/about">About</a><a href="/blog/">Blog</a></nav>
  <div class="card"><span>Foo</span></div><div class="card"><span>Bar</span></div>
  <div id="hidden" style="display:none">Secret</div>
  <div id="out"></div>
`

describe('createEvaluatePage over a jsdom transport', () => {
  let page: Awaited<ReturnType<typeof createEvaluatePage>>
  let emit: (event: string, payload: unknown) => void
  const events: Record<string, number> = {}

  beforeEach(async () => {
    stubLayout()
    document.body.innerHTML = HTML
    document.title = 'Field Notes'
    for (const k of Object.keys(events)) delete events[k]
    const form = document.getElementById('f') as HTMLFormElement
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      events.submit = (events.submit ?? 0) + 1
    })
    document.querySelector('button')!.addEventListener('click', () => {
      events.click = (events.click ?? 0) + 1
      document.getElementById('out')!.textContent = 'clicked'
    })
    document.getElementById('email')!.addEventListener('input', () => {
      events.input = (events.input ?? 0) + 1
    })
    const made = makeTransport()
    emit = made.emit
    page = await createEvaluatePage(made.transport, { timeout: 500, bondName: 'the test bond' })
  })
  afterEach(async () => {
    await page.close()
  })

  it('clicks by role and name, with the DOM reacting', async () => {
    await page.getByRole('button', { name: 'Save' }).click()
    vexpect(events.click).toBe(1)
    await expect(page.locator('#out')).toHaveText('clicked')
  })

  it('fills a labelled input through the native setter and fires input', async () => {
    await page.getByLabel('Email').fill('a@b.c')
    vexpect((document.getElementById('email') as HTMLInputElement).value).toBe('a@b.c')
    vexpect(events.input).toBeGreaterThanOrEqual(1)
    await expect(page.getByLabel('Email')).toHaveValue('a@b.c')
  })

  it('counts headings by level and finds the leaf for text', async () => {
    vexpect(await page.getByRole('heading', { level: 2 }).count()).toBe(2)
    vexpect(await page.getByRole('heading', { level: 1 }).textContent()).toBe('Field Notes')
    vexpect(await page.getByText('world').evaluate((el: Element) => el.tagName)).toBe('SPAN')
    vexpect(await page.getByText('Hello world').evaluate((el: Element) => el.id)).toBe('lead')
  })

  it('parses Playwright selector strings: text=, >>, :has-text()', async () => {
    vexpect(await page.locator('text=Foo').count()).toBe(1)
    vexpect(await page.locator('.card >> text=Bar').evaluate((el: Element) => el.textContent)).toBe(
      'Bar',
    )
    vexpect(await page.locator('.card:has-text("Bar")').count()).toBe(1)
    vexpect(await page.locator('nav >> a').count()).toBe(2)
  })

  it('enforces strict mode for single-element actions', async () => {
    await vexpect(page.locator('.card').textContent()).rejects.toBeInstanceOf(E2EStrictModeError)
    vexpect(await page.locator('.card').first().textContent()).toBe('Foo')
    vexpect(await page.locator('.card').last().textContent()).toBe('Bar')
  })

  it('expect: visibility, count, hidden, not, and a failure that names expected/received', async () => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('#hidden')).toBeHidden()
    await expect(page.locator('#hidden')).not.toBeVisible()
    await expect(page.locator('.card')).toHaveCount(2)
    await expect(page.locator('nav a')).toHaveText(['About', 'Blog'])
    await expect(page.locator('#lead')).toContainText('world')
    let message = ''
    try {
      await expect(page.locator('#out')).toHaveText('nope', { timeout: 150 })
    } catch (error) {
      message = (error as Error).message
    }
    vexpect(message).toContain('toHaveText() failed')
    vexpect(message).toContain('Expected: "nope"')
    vexpect(message).toContain('Received: ""')
  })

  it('passes plain values straight to Playwright expect', () => {
    expect(3).toBe(3)
    expect({ a: 1 }).toEqual({ a: 1 })
    expect([1, 2]).toHaveLength(2)
  })

  it('checks a checkbox, selects an option, presses Enter to submit', async () => {
    await page.getByRole('checkbox').check()
    await expect(page.getByRole('checkbox')).toBeChecked()
    await page.getByRole('checkbox').uncheck()
    await expect(page.getByRole('checkbox')).not.toBeChecked()
    vexpect(await page.locator('#pick').selectOption('Beta')).toEqual(['b'])
    await expect(page.locator('#pick')).toHaveValue('b')
    await page.getByLabel('Email').press('Enter')
    vexpect(events.submit).toBe(1)
  })

  it('reads a bounding box, evaluates in the page, and reports url/title', async () => {
    const box = await page.getByRole('heading', { level: 1 }).boundingBox()
    vexpect(box?.width).toBe(100)
    vexpect(await page.evaluate(() => document.title)).toBe('Field Notes')
    vexpect(await page.title()).toBe('Field Notes')
    await page.goto('/blog/')
    vexpect(page.url()).toContain('/blog/')
    await expect(page).toHaveURL('/blog/')
  })

  it('forwards console messages and page errors to listeners', async () => {
    const seen: string[] = []
    page.on('console', (msg) => seen.push(`${msg.type()}:${msg.text()}`))
    page.on('pageerror', (err) => seen.push(`error:${err.message}`))
    emit('console', { type: 'error', text: 'boom' })
    emit('pageerror', { message: 'crashed' })
    vexpect(seen).toEqual(['error:boom', 'error:crashed'])
  })

  it('throws a named alternative for methods the preview cannot do', async () => {
    let error: Error | null = null
    try {
      await page.screenshot()
    } catch (e) {
      error = e as Error
    }
    vexpect(error).toBeInstanceOf(E2EUnsupportedError)
    vexpect(error?.message).toContain('boundingBox()')
    vexpect(error?.message).toContain('the test bond')
    vexpect(() => page.locator('h1').dragTo(page.locator('h2'))).toThrow(E2EUnsupportedError)
    vexpect(() => page.context().cookies()).toThrow(/document\.cookie/)
  })

  it('setViewportSize throws when the host cannot resize', async () => {
    await vexpect(page.setViewportSize({ width: 390, height: 844 })).rejects.toBeInstanceOf(
      E2EUnsupportedError,
    )
  })

  it('waits for an element that appears later', async () => {
    setTimeout(() => {
      const late = document.createElement('p')
      late.id = 'late'
      late.textContent = 'here'
      document.body.appendChild(late)
    }, 120)
    await expect(page.locator('#late')).toBeVisible({ timeout: 2_000 })
    await page.locator('#late').waitFor({ state: 'attached' })
  })
})
