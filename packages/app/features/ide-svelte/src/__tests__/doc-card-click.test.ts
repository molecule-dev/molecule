// @vitest-environment jsdom
/**
 * Click-wiring coverage for the package-doc cards.
 *
 * The 2026-10-03 bug this suite pins down was invisible to every existing
 * test: the read_molecule_doc / find_package cards DID switch the IDE to the
 * code view on click, but the path they handed the editor named a file that no
 * longer exists (MOLECULE.md, pre-rename). THIS file proves the last hop: a
 * real click on the rendered card delivers that exact path to the host's
 * `onFileOpen`, which is the callback whose fetch loads the file into the
 * editor.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/doc-card-click.test.tsx`
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { buildThemeProvider } from './theme-test-provider.js'
import ToolCallCardHost from './ToolCallCardHost.svelte'

/** The mounts alive right now, torn down before the next test. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeAll(() => {
  setClassMap(classMap)
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
 * Mounts one tool-call card.
 *
 * @param props - The card's props.
 * @returns The container the card mounted into.
 */
function renderCard(props: Omit<ComponentProps<typeof ToolCallCardHost>, 'theme'>): HTMLElement {
  setProvider(createSimpleI18nProvider('en'))
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(ToolCallCardHost, {
    target: container,
    props: { theme: buildThemeProvider(), ...props },
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

/**
 * Finds the deepest element whose whole text is the given text (React's
 * `getByText`).
 *
 * @param text - The text to find.
 * @returns The element.
 */
function getByText(text: string): HTMLElement {
  const matches = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(
    (element) => element.textContent === text,
  )
  const deepest = matches.filter((element) =>
    matches.every((other) => other === element || !element.contains(other)),
  )
  const found = deepest[0]
  if (!found) throw new Error(`no element with text: ${text}`)
  return found
}

describe('package-doc cards open the file on click', () => {
  it('read_molecule_doc: clicking the package name hands onFileOpen the sandbox README.md path', () => {
    const onFileOpen = vi.fn()
    const container = renderCard({
      id: 'tc-doc',
      name: 'read_molecule_doc',
      input: { name: '@molecule/api-payments-stripe' },
      output: { package: '@molecule/api-payments-stripe', doc: '# docs' },
      status: 'done',
      onFileOpen,
    })
    // The clickable button inside the card label's only <code> carries the action.
    const codeLinks = container.querySelectorAll('code button[style*="cursor: pointer"]')
    expect(codeLinks.length).toBeGreaterThan(0)
    getByText('@molecule/api-payments-stripe').click()
    flushSync()
    expect(onFileOpen).toHaveBeenCalledWith(
      '/workspace/node_modules/@molecule/api-payments-stripe/README.md',
    )
  })

  it('find_package: clicking a result row hands onFileOpen that package’s README.md path', () => {
    const onFileOpen = vi.fn()
    const container = renderCard({
      id: 'tc-find',
      name: 'find_package',
      input: { query: 'ui' },
      output: {
        found: 2,
        results: [{ name: '@molecule/app-ui' }, { name: '@molecule/app-ui-react' }],
      },
      status: 'done',
      onFileOpen,
    })
    // Result rows live in the expandable body — open the card first (the
    // chevron sits on the summary row whose click toggles expansion).
    const chevron = container.querySelector('svg')
    expect(chevron).not.toBeNull()
    chevron?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flushSync()
    const firstRow = container.querySelector('[data-mol-id="find-package-result-0"]')
    expect(firstRow).not.toBeNull()
    firstRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    flushSync()
    expect(onFileOpen).toHaveBeenCalledWith('/workspace/node_modules/@molecule/app-ui/README.md')
  })
})
