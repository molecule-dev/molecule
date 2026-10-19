import { describe, expect, it } from 'vitest'

import {
  browserProbeOverBudgetAdvice,
  browserProbeRefusal,
  type ForegroundBrowserProbe,
  standaloneBrowserLeak,
} from '../index.js'

/** The import every positive fixture needs: the engine must be real Playwright, not a stub. */
const PW_IMPORT = "import { chromium } from '@playwright/test'\n"

// ── The real fixture ─────────────────────────────────────────────────────────
// X1 xr-molecule-flash-m257 (+10:44) wrote this 30-line file to
// /workspace/.mol-scratch/fav-probe.mjs and ran it in the foreground behind `| tail -5`. It is
// reproduced verbatim from the run's chat (the write_file call): the launch binding, the page
// work, and the last `console.log` — with no close, disconnect, disposal scope or process.exit.
const M257_PROBE = `import { chromium } from '@playwright/test'

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
const uid = Date.now().toString().slice(-6)

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', error => console.log('page error:', error.message))

await page.goto(BASE + '/register')
await page.waitForSelector('input[name="username"]')
await page.fill('input[name="username"]', \`fav\${uid}\`)
await page.fill('input[name="email"]', \`fav\${uid}@test.com\`)
await page.fill('input[name="password"]', 'password123')
await page.click('button[type="submit"]')
await page.waitForURL(\`\${BASE}/\`)

await page.click('a[href="/editor"]')
await page.waitForSelector('input[name="title"]')
await page.fill('input[name="title"]', \`Favorite Probe \${uid}\`)
await page.fill('input[name="description"]', 'desc')
await page.fill('textarea[name="body"]', 'body text')
await page.click('button[type="submit"]')
await page.waitForURL(/\\/article\\//)

await page.goto(BASE + '/')
await page.waitForSelector('.article-preview')
console.log('preview favorite buttons:', await page.locator('button:has-text("Favorite Article")').count())
console.log('any button text:', await page.locator('.article-preview button').first().textContent())
`

/** The same probe with the one lifecycle fix the refusal asks for. */
const M257_PROBE_FIXED = `import { chromium } from '@playwright/test'

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:4173/')
  console.log('loaded:', await page.title())
} finally {
  await browser.close()
}
`

describe('standaloneBrowserLeak — the m257 leak', () => {
  it('diagnoses the real 30-line fav-probe.mjs: browser is never closed and nothing else holds it', () => {
    expect(standaloneBrowserLeak(M257_PROBE)).toEqual({ variable: 'browser' })
  })

  it('accepts the same probe with try/finally browser.close()', () => {
    expect(standaloneBrowserLeak(M257_PROBE_FIXED)).toBeNull()
  })

  it('diagnoses every launch engine and an arbitrary binding name', () => {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const source =
        `import { ${engine} } from '@playwright/test'\n` +
        `const probe = await ${engine}.launch()\n` +
        'const page = await probe.newPage()\n' +
        'console.log(await page.title())\n'
      expect(standaloneBrowserLeak(source)).toEqual({ variable: 'probe' })
    }
  })

  it('diagnoses a qualified engine (playwright.chromium.launch) and a type annotation', () => {
    const source =
      "import { playwright } from 'playwright'\n" +
      'const browser: Browser = await playwright.chromium.launch()\n' +
      'const page = await browser.newPage()\n'
    expect(standaloneBrowserLeak(source)).toEqual({ variable: 'browser' })
  })

  it('diagnoses a namespace import (import * as pw from playwright)', () => {
    const source =
      "import * as pw from 'playwright'\n" +
      'const browser = await pw.chromium.launch()\n' +
      'const page = await browser.newPage()\n'
    expect(standaloneBrowserLeak(source)).toEqual({ variable: 'browser' })
  })

  it('diagnoses a destructured require from playwright', () => {
    const source =
      "const { chromium } = require('playwright')\n" +
      'const browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n'
    expect(standaloneBrowserLeak(source)).toEqual({ variable: 'browser' })
  })

  it('counts only direct non-closing browser methods as references', () => {
    const source =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const context = await browser.newContext()\n' +
      'const page = await context.newPage()\n' +
      "browser.on('disconnected', () => {})\n" +
      'console.log(browser.version(), browser.isConnected(), browser.contexts())\n' +
      'await page.goto(BASE)\n'
    expect(standaloneBrowserLeak(source)).toEqual({ variable: 'browser' })
  })
})

describe("standaloneBrowserLeak — the review's harmless scripts stay valid", () => {
  it('leaves a locally bound engine stub alone (no Playwright provenance)', () => {
    // The peer review's local-stub.mjs: `chromium` is a plain object, `launch()` returns `{}`.
    const source =
      'const chromium = { launch: async () => ({}) }\n' +
      'const browser = await chromium.launch()\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a namespace-shaped local stub alone (no Playwright provenance)', () => {
    const source =
      'const pw = { chromium: { launch: async () => ({}) } }\n' +
      'const browser = await pw.chromium.launch()\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a local binding that shadows a real import alone', () => {
    const source =
      PW_IMPORT +
      'const chromium = { launch: async () => ({}) }\nconst browser = await chromium.launch()\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves an engine imported from a non-Playwright module alone', () => {
    const source =
      "import { chromium } from './my-browser.js'\n" + 'const browser = await chromium.launch()\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves the launch text in a string literal alone', () => {
    // The peer review's string-literal.mjs.
    const source = "console.log('usage: const browser = await chromium.launch() then do work')\n"
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves the launch text in a comment alone', () => {
    // The peer review's comment-only.mjs.
    const source =
      '// Harmless: the launch text is only a comment.\n' +
      '// const browser = await chromium.launch()\n' +
      "console.log('comment-only script')\n"
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a launch printed from a template literal alone', () => {
    // The peer review's doc-example.mjs: the three lines are documentation, never executed.
    const source =
      'const example = `\n' +
      'const browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n' +
      'console.log(await page.title())\n' +
      '`\n' +
      'console.log(example)\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a launch inside a regex literal after a condition alone', () => {
    // The lexer reads the `/` after `)` as division, so this regex's text survives blanking; the
    // line-start guard is what keeps it from being read as a launch.
    const source =
      PW_IMPORT +
      "if (process.env.X) /const browser = await chromium.launch()/.test('x')\n" +
      "console.log('done')\n"
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a launch inside a function that is never called alone', () => {
    // The peer review's uncalled-function.mjs: a launch in a function body is not proof it ran.
    const source =
      'async function probe() {\n' +
      '  const browser = await chromium.launch()\n' +
      '  console.log(await browser.newPage())\n' +
      '}\n' +
      "console.log('probe never called')\n"
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a top-level throw alone (an uncaught exception ends Node)', () => {
    // A top-level `throw` terminates Node in ~0.1 s even with a live browser handle.
    const source =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n' +
      "throw new Error('stop here')\n"
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('still diagnoses a top-level launch when the only throw is inside a function', () => {
    // The throw at depth 1 is not an exit path for this run; the top-level browser still leaks.
    const source =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      "function fail() { throw new Error('later') }\n" +
      'console.log(browser.version())\n'
    expect(standaloneBrowserLeak(source)).toEqual({ variable: 'browser' })
  })

  it('does not let a close inside a string mask the leak', () => {
    // A string is prose, not a cleanup path; the browser is still never closed.
    const source =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n' +
      "console.log('call browser.close() when done')\n"
    expect(standaloneBrowserLeak(source)).toEqual({ variable: 'browser' })
  })

  it('reads a close inside a template substitution as real cleanup', () => {
    // `${…}` is code, not literal text: this close would end the browser, so leave it alone.
    const source =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n' +
      'await page.goto(`http://x/${await browser.close()}`)\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })
})

describe('standaloneBrowserLeak — other false positives stay valid', () => {
  it('leaves a helper-owned cleanup alone (imported close/teardown helper)', () => {
    const helperCall =
      PW_IMPORT +
      "import { closeBrowser } from './helpers/cleanup.js'\n" +
      'const browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n' +
      'await page.goto(BASE)\n' +
      'await closeBrowser(browser)\n'
    const helperModule =
      PW_IMPORT +
      "import { teardown } from './session-teardown.js'\n" +
      'const browser = await chromium.launch()\n' +
      'await teardown()\n'
    expect(standaloneBrowserLeak(helperCall)).toBeNull()
    expect(standaloneBrowserLeak(helperModule)).toBeNull()
  })

  it('leaves an alias alone (the browser escapes through another name)', () => {
    const source =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const b = browser\n' +
      'const page = await b.newPage()\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a Playwright test/fixture alone', () => {
    const source =
      "import { test, expect } from '@playwright/test'\n" +
      "test('favorites an article', async ({ page }) => {\n" +
      "  await page.goto('/')\n" +
      "  await expect(page.locator('.article-preview')).toBeVisible()\n" +
      '})\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves context/page disposal alone (a cleanup path the source reading cannot follow)', () => {
    const contextClose =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const context = await browser.newContext()\n' +
      'const page = await context.newPage()\n' +
      'await page.goto(BASE)\n' +
      'await context.close()\n'
    const pageClose = contextClose.replace('context.close()', 'page.close()')
    expect(standaloneBrowserLeak(contextClose)).toBeNull()
    expect(standaloneBrowserLeak(pageClose)).toBeNull()
  })

  it('leaves a disposal scope alone', () => {
    const source =
      PW_IMPORT +
      'await using browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a persistent browser/server alone', () => {
    const launchServer =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const server = await chromium.launchServer()\n' +
      'console.log(server.wsEndpoint())\n'
    const listener =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n' +
      'http.createServer(() => {}).listen(3000)\n'
    const timer =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'setInterval(() => console.log(browser.version()), 1000)\n'
    expect(standaloneBrowserLeak(launchServer)).toBeNull()
    expect(standaloneBrowserLeak(listener)).toBeNull()
    expect(standaloneBrowserLeak(timer)).toBeNull()
  })

  it('leaves an explicit process exit alone', () => {
    const source =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n' +
      'console.log(await page.title())\n' +
      'process.exit(0)\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a browser closed in a signal handler alone', () => {
    const source =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      "process.on('SIGINT', async () => { await browser.close() })\n"
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a bare reference alone (the browser escapes without a known method)', () => {
    const source =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n' +
      'console.log(browser)\n'
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves indirect code alone (eval / dynamic import)', () => {
    const source =
      PW_IMPORT +
      'const browser = await chromium.launch()\n' +
      'const page = await browser.newPage()\n' +
      "await import('./maybe-cleanup.js')\n"
    expect(standaloneBrowserLeak(source)).toBeNull()
  })

  it('leaves a non-browser script and an empty source alone', () => {
    expect(standaloneBrowserLeak("console.log('hello')\n")).toBeNull()
    expect(standaloneBrowserLeak('')).toBeNull()
  })
})

describe('browser probe advice', () => {
  const probe: ForegroundBrowserProbe = {
    variable: 'browser',
    script: '/workspace/.mol-scratch/fav-probe.mjs',
  }

  it('names the file and variable, and asks for try/finally or the runner fixture', () => {
    const sentence = browserProbeRefusal(probe, 290)
    expect(sentence).toContain('/workspace/.mol-scratch/fav-probe.mjs')
    expect(sentence).toContain('`browser`')
    expect(sentence).toContain(
      'This probe launches a browser and never closes it, so Node will stay alive after its last statement.',
    )
    expect(sentence).toContain(
      'Put the page work in try { … } finally { await browser.close() }, or use a Playwright test whose browser fixture is cleaned up by the runner.',
    )
    expect(sentence).toContain('290 s budget')
    expect(sentence).not.toContain('run_in_background')
  })

  it('tells a piped probe to drop the | tail that withholds its output', () => {
    const sentence = browserProbeRefusal(probe, 290, true)
    expect(sentence).toContain('`| tail` pipe would also withhold its output')
  })

  it('never sends a proven leak to the background at cut time', () => {
    const sentence = browserProbeOverBudgetAdvice(probe)
    expect(sentence).toContain(
      'Put the page work in try { … } finally { await browser.close() }, or use a Playwright test whose browser fixture is cleaned up by the runner.',
    )
    expect(sentence).toContain('starting it in the background only moves the hang')
    expect(sentence).not.toMatch(/run it in the background\b/)
  })
})
