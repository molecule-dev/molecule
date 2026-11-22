// @vitest-environment jsdom

/**
 * A `read_file` card names the file(s) it read — one `path` or a batch `paths`
 * — and each name opens its own file.
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/ToolCallCard.read-file.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication`.
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
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * The JIT host the way the conformance kit mounts the card: its template binds
 * every input the card takes.
 */
const ToolCallCardHost = Component({
  selector: 'mol-tool-call-card-host',
  standalone: true,
  imports: [ToolCallCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-tool-call-card [id]="p['id']" [name]="p['name']" [input]="p['input']" [output]="p['output']" [status]="p['status']" [fileDiff]="p['fileDiff']" [isUndone]="p['isUndone']" [onUndoToggle]="p['onUndoToggle']" [onFileOpen]="p['onFileOpen']" [onFileDoubleClick]="p['onFileDoubleClick']" [onFileDiff]="p['onFileDiff']" [onFileRevert]="p['onFileRevert']" [onAskUserResponse]="p['onAskUserResponse']" [onSkip]="p['onSkip']" [skipDisabledReason]="p['skipDisabledReason']" [className]="p['className']"></div>`,
})(
  class ToolCallCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ToolCallCardHost>>
  container: HTMLElement
} | null = null

/** Lets Angular's zoneless change detection settle. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Render a `read_file` card.
 *
 * @param overrides - Inputs to override.
 * @returns The container.
 */
async function renderRead(overrides: Record<string, unknown> = {}): Promise<HTMLElement> {
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
    {
      environmentInjector: appRef.injector,
    },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
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
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return container
}

/**
 * Clicks like a user and lets Angular settle.
 * @param el - The element to click.
 */
async function click(el: HTMLElement | null): Promise<void> {
  el?.click()
  await flush()
}

/**
 * Double-clicks like a user and lets Angular settle.
 * @param el - The element to double-click.
 */
async function doubleClick(el: HTMLElement | null): Promise<void> {
  el?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  await flush()
}

/** Destroys the live mount, the way the React suite's `cleanup()` does. */
async function cleanup(): Promise<void> {
  if (!current) return
  current.appRef.destroy()
  current.container.remove()
  current = null
  document.body.innerHTML = ''
}

// The first mount in a worker pays Angular's JIT compilation of the card's
// large template; warm it up outside a test so no assertion carries that cost.
beforeAll(async () => {
  await renderRead()
  await cleanup()
}, 120_000)

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  await cleanup()
  setProvider(createSimpleI18nProvider())
})

describe('ToolCallCard — read_file', () => {
  it('names every file of a batch read and opens the one clicked', async () => {
    const opened: string[] = []
    const container = await renderRead({ onFileOpen: (p: string) => opened.push(p) })
    expect(container.textContent).toContain('Read')
    expect(container.textContent).toContain('App.tsx')
    expect(container.textContent).toContain('Home.tsx')
    const codes = Array.from(container.querySelectorAll('code'))
    const home = codes.find((c) => c.textContent === 'Home.tsx')!
    await click(home.querySelector('button') as HTMLElement)
    expect(opened).toContain('my-app/app/src/pages/Home.tsx')
  })

  it('still names a single-path read', async () => {
    const container = await renderRead({
      input: { path: 'my-app/AGENTS.md' },
      output: { path: '/workspace/my-app/AGENTS.md', content: '# Agents' },
    })
    expect(container.textContent).toContain('AGENTS.md')
  })

  it('opens the file a name belongs to even when an earlier path named nothing', async () => {
    // `src/` has no basename, so it gets no `code` segment in the label — but it
    // is still the FIRST entry of the raw path list. Indexing that raw list by
    // the label's segment position made `App.tsx` open `src/` instead of the
    // file it names.
    const opened: string[] = []
    const container = await renderRead({
      input: { paths: ['src/', 'my-app/app/src/App.tsx'] },
      onFileOpen: (p: string) => opened.push(p),
    })
    expect(container.textContent).toContain('App.tsx')
    const code = Array.from(container.querySelectorAll('code')).find(
      (c) => c.textContent === 'App.tsx',
    ) as HTMLElement
    await click(code.querySelector('button') as HTMLElement)
    expect(opened).toEqual(['my-app/app/src/App.tsx'])
  })

  it('puts the open action on a native button inside the code element', async () => {
    const opened: string[] = []
    const doubleClicked: string[] = []
    const container = await renderRead({
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

    await click(button)
    expect(opened).toEqual(['my-app/app/src/App.tsx'])

    await doubleClick(button)
    expect(doubleClicked).toEqual(['my-app/app/src/App.tsx'])
    // Neither gesture bubbles to the row's own handler.
    expect(opened).toEqual(['my-app/app/src/App.tsx'])
  })

  it('keeps the row free of nested controls — the open control is its sibling', async () => {
    // axe `nested-interactive`: the row is itself a role="button" control, so
    // the file open button (and the undo affordance) cannot sit inside it.
    const container = await renderRead({ onFileOpen: () => {} })

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
