// @vitest-environment jsdom

/**
 * The tool-call label goes through i18n at render: `toolLabel` (in
 * `@molecule/app-ide-panel-logic`) emits its English words through `ide.tool.*`
 * keys, and the file names stay data in `` `backtick` `` segments. With a marker
 * translator that names the key, the card's collapsed row must show the marker
 * next to the untouched data segments — and follow a locale switch, because the
 * label is recomputed on every render.
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/ToolCallCard.i18n.test.tsx`
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

import { provideDomPlacement, provideTheme } from '@molecule/app-angular'
import {
  createSimpleI18nProvider,
  type I18nProvider as I18nProviderContract,
  setProvider as setI18nProvider,
} from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A second locale the marker translator can switch to. */
const MARKER_LOCALE = 'xx'

/**
 * A provider whose `t` returns `⟦<locale>|<key>⟧` — naming the locale and the
 * key, so a test can prove WHICH key rendered and that a locale switch
 * re-translated the label.
 *
 * @returns The marker provider.
 */
function buildMarkerProvider(): I18nProviderContract {
  const base = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
    { code: MARKER_LOCALE, name: 'Marker', direction: 'ltr', translations: {} },
  ])
  return {
    ...base,
    t: (key) => `⟦${base.getLocale()}|${key}⟧`,
  }
}

/**
 * The JIT host the way the conformance kit mounts the card: its template binds
 * every input the card takes.
 */
const ToolCallCardHost = Component({
  selector: 'mol-tool-call-card-host',
  standalone: true,
  imports: [ToolCallCard],
  changeDetection: ChangeDetectionStrategy.Eager,
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
 * Render one tool call.
 *
 * @param props - The card's inputs.
 * @returns The container.
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
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideTheme(buildThemeProvider()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof ToolCallCardHost>> = createComponent(
    ToolCallCardHost,
    {
      environmentInjector: appRef.injector,
    },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return container
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
  await renderCard({
    id: 'warmup',
    name: 'read_file',
    input: { path: 'warmup.ts' },
    status: 'done',
  })
  await cleanup()
}, 120_000)

beforeEach(() => {
  setClassMap(classMap)
})

afterEach(async () => {
  await cleanup()
  setI18nProvider(createSimpleI18nProvider())
})

describe('ToolCallCard labels go through ide.tool.* keys (marker translator)', () => {
  it('renders a read_file label through ide.tool.read with the filename as data', async () => {
    setI18nProvider(buildMarkerProvider())
    const container = await renderCard({
      id: 't1',
      name: 'read_file',
      input: { path: 'src/index.ts' },
      status: 'done',
    })

    const text = container.textContent ?? ''
    expect(text).toContain('⟦en|ide.tool.read⟧')
    // The filename stays a data segment, untouched by the marker translator.
    expect(text).toContain('index.ts')
    expect(text).not.toContain('⟦index.ts⟧')
  })

  it('renders a sentence-shaped label through its key', async () => {
    setI18nProvider(buildMarkerProvider())
    const container = await renderCard({
      id: 't2',
      name: 'reload_preview',
      input: {},
      status: 'done',
    })
    expect(container.textContent).toContain('⟦en|ide.tool.reloadPreview⟧')
  })

  it('re-translates the label after a locale switch (the label is computed at render)', async () => {
    const provider = buildMarkerProvider()
    setI18nProvider(provider)
    const container = await renderCard({
      id: 't3',
      name: 'read_file',
      input: { path: 'src/index.ts' },
      status: 'done',
    })
    expect(container.textContent).toContain('⟦en|ide.tool.read⟧')

    await provider.setLocale(MARKER_LOCALE)
    await flush()

    expect(container.textContent).toContain(`⟦${MARKER_LOCALE}|ide.tool.read⟧`)
  })
})
