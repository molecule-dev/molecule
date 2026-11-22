// @vitest-environment jsdom
/**
 * Click-wiring coverage for the package-doc cards.
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/doc-card-click.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication` with the theme provider.
 *
 * The bug this suite pins down was invisible to every existing test: the
 * read_molecule_doc / find_package cards DID switch the IDE to the code view on
 * click, but the path they handed the editor named a file that no longer
 * exists. THIS file proves the last hop: a real click on the rendered card
 * delivers that exact path to the host's `onFileOpen`.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The JIT host: its template binds every input the card takes. */
const ToolCallCardHost = Component({
  selector: 'mol-doc-card-click-host',
  standalone: true,
  imports: [ToolCallCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-tool-call-card [id]="p['id']" [name]="p['name']" [input]="p['input']" [output]="p['output']" [status]="p['status']" [onFileOpen]="p['onFileOpen']"></div>`,
})(
  class ToolCallCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  container: HTMLElement
} | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Angular's zoneless change detection settle. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
}

/**
 * Mounts a tool-call card with the given props.
 *
 * @param props - The card's inputs.
 * @returns The rendered container.
 */
async function renderCard(props: Record<string, unknown>): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideTheme(buildThemeProvider())],
  })
  const ref: ComponentRef<InstanceType<typeof ToolCallCardHost>> = createComponent(
    ToolCallCardHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, container }
  await flush()
  return container
}

describe('package-doc cards open the file on click', () => {
  it('read_molecule_doc: clicking the package name hands onFileOpen the sandbox README.md path', async () => {
    const onFileOpen = vi.fn()
    const container = await renderCard({
      id: 'tc-doc',
      name: 'read_molecule_doc',
      input: { name: '@molecule/api-payments-stripe' },
      output: { package: '@molecule/api-payments-stripe', doc: '# docs' },
      status: 'done',
      onFileOpen,
    })
    // The clickable button inside the card label's only <code> carries the action.
    const codeLinks = [...container.querySelectorAll('code button')].filter((el) =>
      (el.getAttribute('style') ?? '').includes('cursor: pointer'),
    )
    expect(codeLinks.length).toBeGreaterThan(0)
    const link = [...container.querySelectorAll<HTMLElement>('code button')].find(
      (el) => (el.textContent ?? '').trim() === '@molecule/api-payments-stripe',
    )
    expect(link, 'the package name must render as a clickable code button').not.toBeUndefined()
    link?.click()
    await flush()
    expect(onFileOpen).toHaveBeenCalledWith(
      '/workspace/node_modules/@molecule/api-payments-stripe/README.md',
    )
  })

  it('find_package: clicking a result row hands onFileOpen that package’s README.md path', async () => {
    const onFileOpen = vi.fn()
    const container = await renderCard({
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
    // Result rows live in the expandable body — open the card first (the row's
    // click toggles expansion).
    const row = container.querySelector('div[role="button"]') as HTMLElement | null
    expect(row).not.toBeNull()
    row?.click()
    await flush()
    const firstRow = container.querySelector('[data-mol-id="find-package-result-0"]')
    expect(firstRow).not.toBeNull()
    ;(firstRow as HTMLElement).click()
    await flush()
    expect(onFileOpen).toHaveBeenCalledWith('/workspace/node_modules/@molecule/app-ui/README.md')
  })
})
