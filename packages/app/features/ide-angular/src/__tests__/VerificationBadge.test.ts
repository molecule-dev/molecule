// @vitest-environment jsdom

/**
 * `VerificationBadge` rendered for real: the passing check (with the stored
 * render-check advisory), the expandable failure card, its per-category label
 * counts, and the lint-only / type-and-runtime severity tints.
 *
 * Angular port of `@molecule/app-ide-react`'s `VerificationBadge` behaviour
 * (unit U2 of the ChatPanel port): the same DOM for the same input, the same
 * behaviour, mounted on the part itself.
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { VerificationBadge } from '../parts/verification-badge.component.js'

/** The host the tests mount: binds the badge's five inputs. */
const VerificationBadgeHost = Component({
  selector: 'mol-verification-badge-host',
  standalone: true,
  imports: [VerificationBadge],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-verification-badge [status]="p['status']" [output]="p['output']" [workspaces]="p['workspaces']" [categories]="p['categories']" [renderCheckUnavailable]="p['renderCheckUnavailable']"></div>`,
})(
  class VerificationBadgeHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted badge, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof VerificationBadgeHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  current?.appRef.destroy()
  current?.container.remove()
  current = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the badge with the given props.
 *
 * @param props - The badge's inputs to render with (status is required).
 * @returns The mounted host element.
 */
async function renderBadge(props: Record<string, unknown>): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<InstanceType<typeof VerificationBadgeHost>> = createComponent(
    VerificationBadgeHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    workspaces: ['app'],
    renderCheckUnavailable: false,
    ...props,
  }
  ref.changeDetectorRef.detectChanges()
  await appRef.whenStable()
  current = { appRef, ref, container }
  return container
}

/**
 * The failure card's disclosure button.
 *
 * @param container - The mounted host.
 * @returns The button element.
 */
function disclosure(container: HTMLElement): HTMLElement {
  return container.querySelector('button') as HTMLElement
}

describe('VerificationBadge — passing', () => {
  it('shows the passed check with a green glyph', async () => {
    const container = await renderBadge({ status: 'ok' })
    expect(container.textContent).toContain('Checks passed')
    expect(container.querySelector('path')?.getAttribute('stroke')).toBe('#3fb950')
    expect(container.querySelector('button')).toBeNull()
  })

  it('appends the stored render-check advisory in the warning token', async () => {
    const container = await renderBadge({ status: 'ok', renderCheckUnavailable: true })
    const advisory = container.querySelector(
      '[data-mol-id="render-check-unavailable"]',
    ) as HTMLElement
    expect(advisory).not.toBeNull()
    expect(advisory.textContent).toContain('Render check unavailable')
    const cm = getClassMap()
    expect(new Set(advisory.className.split(/\s+/))).toEqual(
      new Set(cm.textWarning.split(/\s+/).filter(Boolean)),
    )
  })
})

describe('VerificationBadge — failing', () => {
  it('counts type errors from the compiler output', async () => {
    const container = await renderBadge({
      status: 'error',
      categories: ['type'],
      output: 'app/src/a.ts(1,2): error TS1000: boom\napp/src/b.ts(3,4): error TS1001: bang',
    })
    expect(container.textContent).toContain('2 type errors')
    expect(disclosure(container).style.color).toBe('rgb(248, 81, 73)')
  })

  it('splits lint errors and warnings, and tints lint-only amber', async () => {
    const container = await renderBadge({
      status: 'error',
      categories: ['lint'],
      output: 'app/src/a.ts\n  1:2  error  no-unused-vars  x\n\n✖ 1 warning',
    })
    expect(container.textContent).toContain('1 lint error, 1 warning')
    expect(disclosure(container).style.color).toBe('rgb(212, 160, 23)')
  })

  it('names runtime failures and falls back to the generic label', async () => {
    expect(
      (await renderBadge({ status: 'error', categories: ['runtime'], output: '' })).textContent,
    ).toContain('Runtime errors')
    expect((await renderBadge({ status: 'error' })).textContent).toContain('Errors found')
  })

  it('reveals the runner output behind the disclosure', async () => {
    const container = await renderBadge({
      status: 'error',
      categories: ['type'],
      output: 'app/src/a.ts(1,2): error TS1000: boom',
    })
    expect(container.querySelector('pre')).toBeNull()
    disclosure(container).click()
    if (!current) throw new Error('nothing mounted')
    current.ref.changeDetectorRef.detectChanges()
    await current.appRef.whenStable()
    expect(container.querySelector('pre')?.textContent).toContain('error TS1000: boom')
  })

  it('turns the disclosure chevron over when the output is open', async () => {
    const container = await renderBadge({
      status: 'error',
      categories: ['lint'],
      output: '1:1 error x',
    })
    const chevron = container.querySelector('polyline')?.parentElement as HTMLElement
    expect(chevron.style.transform).toBe('rotate(0deg)')
    disclosure(container).click()
    if (!current) throw new Error('nothing mounted')
    current.ref.changeDetectorRef.detectChanges()
    await current.appRef.whenStable()
    expect(
      (container.querySelector('polyline')?.parentElement as HTMLElement).style.transform,
    ).toBe('rotate(180deg)')
  })
})
