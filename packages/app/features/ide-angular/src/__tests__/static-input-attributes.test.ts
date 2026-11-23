// @vitest-environment jsdom

/**
 * An input written as a static attribute reaches the component AND stays on
 * the host element in Angular, where React's component takes the prop and
 * renders no such attribute. For a tool call the leftover attribute is one the
 * browser acts on: its `id` (the call's identifier, which React never renders)
 * would become the card's element id. The card's host removes it.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provideDomPlacement, provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** The application alive right now, if any. */
let appRef: ApplicationRef | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  appRef?.destroy()
  appRef = null
  document.body.innerHTML = ''
})

/**
 * Mounts a host component carrying the case's template.
 * @param template - The host template, written as an app writes the part.
 * @param imports - The standalone components the template uses.
 * @param props - Fields the template reads.
 * @returns The part's host element (the test host's first element child).
 */
async function mount(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[data-test-host]',
    standalone: true,
    imports,
    template,
  })(class StaticInputAttributesHost {})
  appRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideTheme(buildThemeProvider()),
    ],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  Object.assign(ref.instance, props)
  const root = ref.location.nativeElement as HTMLElement
  document.body.appendChild(root)
  appRef.attachView(ref.hostView)
  appRef.tick()
  await appRef.whenStable()
  const host = root.firstElementChild
  if (!(host instanceof HTMLElement)) throw new Error('part host not found')
  return host
}

describe('static input attributes', () => {
  it("keeps a static tool call id off the card's element", async () => {
    const host = await mount(
      `<div mol-tool-call-card id="tc-static" [name]="'read_file'" [input]="input" [status]="'done'"></div>`,
      [ToolCallCard],
      { input: { path: 'src/app.ts' } },
    )
    expect(host.hasAttribute('id')).toBe(false)
    expect(document.getElementById('tc-static')).toBeNull()
  }, 120_000)
})
