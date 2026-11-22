// @vitest-environment jsdom
/**
 * A `read_file` card names the file(s) it read — one `path` or a batch `paths`
 * — and each name opens its own file.
 *
 * A port of
 * `@molecule/app-ide-react/src/__tests__/ToolCallCard.read-file.test.tsx` with
 * the same test names and the same assertions, mounted through Svelte 5's own
 * `mount`/`flushSync`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { buildThemeProvider } from './theme-test-provider.js'
import ToolCallCardHost from './ToolCallCardHost.svelte'

/** The mounts alive right now, torn down before the next test. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Render a batch `read_file` card.
 *
 * @param overrides - Props to override.
 * @returns The container.
 */
function renderRead(overrides: Partial<ToolCallCardProps> = {}): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(ToolCallCardHost, {
    target: container,
    props: {
      theme: buildThemeProvider(),
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
    },
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

describe('ToolCallCard — read_file', () => {
  it('names every file of a batch read and opens the one clicked', () => {
    const opened: string[] = []
    const container = renderRead({ onFileOpen: (p) => opened.push(p) })
    expect(container.textContent).toContain('Read')
    expect(container.textContent).toContain('App.tsx')
    expect(container.textContent).toContain('Home.tsx')
    const codes = Array.from(container.querySelectorAll('code'))
    const home = codes
      .find((c) => c.textContent === 'Home.tsx')!
      .querySelector('button') as HTMLElement
    home.click()
    flushSync()
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
      onFileOpen: (p) => opened.push(p),
    })
    expect(container.textContent).toContain('App.tsx')
    const code = Array.from(container.querySelectorAll('code')).find(
      (c) => c.textContent === 'App.tsx',
    ) as HTMLElement
    ;(code.querySelector('button') as HTMLElement).click()
    flushSync()
    expect(opened).toEqual(['my-app/app/src/App.tsx'])
  })

  it('puts the open action on a native button inside the code element', () => {
    const opened: string[] = []
    const doubleClicked: string[] = []
    const container = renderRead({
      onFileOpen: (p) => opened.push(p),
      onFileDoubleClick: (p) => doubleClicked.push(p),
    })
    const button = Array.from(container.querySelectorAll('code button')).find(
      (el) => el.textContent === 'App.tsx',
    ) as HTMLButtonElement

    // `code` is a semantic element and cannot be a button, so a real <button>
    // carries the action. A native button is Enter/Space activated by the
    // browser itself, which jsdom does not implement — it dispatches the click
    // the browser would, through the same element.
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('aria-label')).toBe('Open my-app/app/src/App.tsx')

    button.click()
    flushSync()
    expect(opened).toEqual(['my-app/app/src/App.tsx'])

    button.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    flushSync()
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
