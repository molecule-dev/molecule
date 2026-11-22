// @vitest-environment jsdom
/**
 * Click-wiring coverage for the package-doc cards.
 *
 * A port of `@molecule/app-ide-react`'s `doc-card-click` suite with the same
 * test names and the same assertions: a real click on the rendered card
 * delivers the sandbox README.md path to the host's `onFileOpen`, the callback
 * whose fetch loads the file into the editor.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { ToolCallCard } from '../components/ToolCallCard.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * Render one tool call inside the contexts it mounts in.
 *
 * @param overrides - Props to override.
 * @returns The container.
 */
function renderCard(overrides: Record<string, unknown> = {}): HTMLElement {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild =>
        h(ToolCallCard, {
          id: 'tc-1',
          name: 'read_file',
          input: {},
          status: 'done',
          ...overrides,
        }),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
  return host
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Vue flush the render a DOM event queued. */
async function flush(): Promise<void> {
  await nextTick()
  await nextTick()
}

describe('package-doc cards open the file on click', () => {
  it('read_molecule_doc: clicking the package name hands onFileOpen the sandbox README.md path', async () => {
    const onFileOpen = vi.fn()
    const container = renderCard({
      id: 'tc-doc',
      name: 'read_molecule_doc',
      input: { name: '@molecule/api-payments-stripe' },
      output: { package: '@molecule/api-payments-stripe', doc: '# docs' },
      onFileOpen,
    })
    // The clickable button inside the card label's `<code>` carries the action.
    const codeLinks = container.querySelectorAll('code button[style*="cursor: pointer"]')
    expect(codeLinks.length).toBeGreaterThan(0)
    const packageLink = Array.from(codeLinks).find(
      (el) => el.textContent === '@molecule/api-payments-stripe',
    )
    expect(packageLink, 'the package name must render as a clickable link').not.toBeUndefined()
    ;(packageLink as HTMLElement).click()
    await flush()
    expect(onFileOpen).toHaveBeenCalledWith(
      '/workspace/node_modules/@molecule/api-payments-stripe/README.md',
    )
  })

  it('find_package: clicking a result row hands onFileOpen that package’s README.md path', async () => {
    const onFileOpen = vi.fn()
    const container = renderCard({
      id: 'tc-find',
      name: 'find_package',
      input: { query: 'ui' },
      output: {
        found: 2,
        results: [{ name: '@molecule/app-ui' }, { name: '@molecule/app-ui-react' }],
      },
      onFileOpen,
    })
    // Result rows live in the expandable body — open the card first (the row is
    // itself the role="button" whose click toggles expansion).
    const row = container.querySelector('[role="button"]')
    expect(row).not.toBeNull()
    ;(row as HTMLElement).click()
    await flush()
    const firstRow = container.querySelector('[data-mol-id="find-package-result-0"]')
    expect(firstRow).not.toBeNull()
    ;(firstRow as HTMLElement).click()
    await flush()
    expect(onFileOpen).toHaveBeenCalledWith('/workspace/node_modules/@molecule/app-ui/README.md')
  })
})
