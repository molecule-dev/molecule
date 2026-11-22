// @vitest-environment jsdom
/**
 * Click-wiring coverage for the package-doc cards.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/doc-card-click.test.tsx`
 * with the same test names and the same assertions: the read_molecule_doc /
 * find_package cards DID switch the IDE to the code view on click, but the
 * path they handed the editor named a file that no longer exists (MOLECULE.md,
 * pre-rename). These prove the last hop — a real click on the rendered card
 * delivers the exact README.md path to the host's `onFileOpen`, which is the
 * callback whose fetch loads the file into the editor.
 *
 * Mounted as a real Solid root under the theme context (the only provider the
 * card needs).
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { ThemeContext, type ThemeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/ToolCallCard.jsx'

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeAll(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

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

/**
 * Mounts one card under the theme context.
 *
 * @param element - The card.
 * @returns The host element.
 */
function mount(element: () => ReturnType<typeof ToolCallCard>): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.dispose = render(
    () => <ThemeContext.Provider value={themeProvider}>{element()}</ThemeContext.Provider>,
    host,
  )
  return host
}

describe('package-doc cards open the file on click', () => {
  it('read_molecule_doc: clicking the package name hands onFileOpen the sandbox README.md path', () => {
    const onFileOpen = vi.fn()
    const container = mount(() => (
      <ToolCallCard
        id="tc-doc"
        name="read_molecule_doc"
        input={{ name: '@molecule/api-payments-stripe' }}
        output={{ package: '@molecule/api-payments-stripe', doc: '# docs' }}
        status="done"
        onFileOpen={onFileOpen}
      />
    ))
    // The clickable button inside the card label's only <code> carries the action.
    const codeLinks = container.querySelectorAll('code button[style*="cursor: pointer"]')
    expect(codeLinks.length).toBeGreaterThan(0)
    getByText('@molecule/api-payments-stripe').click()
    expect(onFileOpen).toHaveBeenCalledWith(
      '/workspace/node_modules/@molecule/api-payments-stripe/README.md',
    )
  })

  it('find_package: clicking a result row hands onFileOpen that package’s README.md path', () => {
    const onFileOpen = vi.fn()
    const container = mount(() => (
      <ToolCallCard
        id="tc-find"
        name="find_package"
        input={{ query: 'ui' }}
        output={{
          found: 2,
          results: [{ name: '@molecule/app-ui' }, { name: '@molecule/app-ui-react' }],
        }}
        status="done"
        onFileOpen={onFileOpen}
      />
    ))
    // Result rows live in the expandable body — open the card first (the
    // chevron sits on the summary row whose click toggles expansion).
    const chevron = container.querySelector('svg')
    expect(chevron).not.toBeNull()
    chevron!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const firstRow = container.querySelector('[data-mol-id="find-package-result-0"]')
    expect(firstRow).not.toBeNull()
    firstRow!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onFileOpen).toHaveBeenCalledWith('/workspace/node_modules/@molecule/app-ui/README.md')
  })
})
