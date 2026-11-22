// @vitest-environment jsdom
/**
 * A `read_file` card names the file(s) it read — one `path` or a batch `paths` —
 * and each name opens its own file. A port of `@molecule/app-ide-react`'s
 * `ToolCallCard.read-file.test.tsx` with the same test names and the same
 * behavioral assertions, mounted through Vue's own `createApp`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

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
function renderRead(overrides: Record<string, unknown> = {}): HTMLElement {
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
          input: { paths: ['my-app/app/src/App.tsx', 'my-app/app/src/pages/Home.tsx'] },
          status: 'done',
          output: {
            files: [
              { path: '/workspace/my-app/app/src/App.tsx', content: 'export const App = 1' },
              { path: '/workspace/my-app/app/src/pages/Home.tsx', error: 'No such file' },
            ],
          },
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

/**
 * The double click a peer's tab pin listens for.
 *
 * @param el - The element.
 */
function doubleClick(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
}

describe('ToolCallCard — read_file', () => {
  it('names every file of a batch read and opens the one clicked', () => {
    const opened: string[] = []
    const container = renderRead({ onFileOpen: (p: string) => opened.push(p) })
    expect(container.textContent).toContain('Read')
    expect(container.textContent).toContain('App.tsx')
    expect(container.textContent).toContain('Home.tsx')
    const codes = Array.from(container.querySelectorAll('code'))
    const home = codes.find((c) => c.textContent === 'Home.tsx')!
    ;(home.querySelector('button') as HTMLElement).click()
    expect(opened).toContain('my-app/app/src/pages/Home.tsx')
  })

  it('still names a single-path read', () => {
    const container = renderRead({
      input: { path: 'my-app/AGENTS.md' },
      output: { path: '/workspace/my-app/AGENTS.md', content: '# Agents' },
    })
    expect(container.textContent).toContain('AGENTS.md')
  })

  it('opens the file a name belongs to even when an earlier path named nothing', () => {
    // `src/` has no basename, so it gets no `code` segment in the label — but it
    // is still the FIRST entry of the raw path list. Indexing that raw list by
    // the label's segment position made `App.tsx` open `src/` instead of the
    // file it names.
    const opened: string[] = []
    const container = renderRead({
      input: { paths: ['src/', 'my-app/app/src/App.tsx'] },
      onFileOpen: (p: string) => opened.push(p),
    })
    expect(container.textContent).toContain('App.tsx')
    const code = Array.from(container.querySelectorAll('code')).find(
      (c) => c.textContent === 'App.tsx',
    ) as HTMLElement
    ;(code.querySelector('button') as HTMLElement).click()
    expect(opened).toEqual(['my-app/app/src/App.tsx'])
  })

  it('puts the open action on a native button inside the code element', () => {
    const opened: string[] = []
    const doubleClicked: string[] = []
    const container = renderRead({
      onFileOpen: (p: string) => opened.push(p),
      onFileDoubleClick: (p: string) => doubleClicked.push(p),
    })
    const button = Array.from(container.querySelectorAll('code button')).find(
      (el) => el.textContent === 'App.tsx',
    ) as HTMLButtonElement

    // `code` is a semantic element and cannot be a button, so a real <button>
    // carries the action.
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('aria-label')).toBe('Open my-app/app/src/App.tsx')

    button.click()
    expect(opened).toEqual(['my-app/app/src/App.tsx'])

    doubleClick(button)
    expect(doubleClicked).toEqual(['my-app/app/src/App.tsx'])
    // Neither gesture bubbles to the row's own handler.
    expect(opened).toEqual(['my-app/app/src/App.tsx'])
  })

  it('keeps the row free of nested controls — the open control is its sibling', () => {
    // axe `nested-interactive`: the row is itself a role="button" control, so
    // the file open button (and the undo affordance) cannot sit inside it.
    const container = renderRead({ onFileOpen: () => {} })

    const row = container.querySelector('[role="button"]') as HTMLElement
    expect(row).not.toBeNull()
    expect(row.querySelector('button, [role="button"], [tabindex]')).toBeNull()

    const open = Array.from(container.querySelectorAll('code button')).find(
      (el) => el.textContent === 'App.tsx',
    ) as HTMLElement
    expect(open).not.toBeUndefined()
    expect(row.contains(open)).toBe(false)
  })
})
