// @vitest-environment jsdom
/**
 * Render tests for the Modal close-button placement — Angular port of
 * `@molecule/app-ui-react/src/__tests__/modal-close-floating.test.tsx`: with a
 * `title` the X shares the header row (`dialogClose`); WITHOUT a title there
 * must be no full-width header band at all — the X floats over the top-right
 * corner (`dialogCloseFloating`) so it doesn't push the body content down.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        // Modal calls `cm.modal({ size })`; every other token is read as a
        // plain string (`[class]="cm.dialogCloseFloating"`), so return the
        // token name directly — a callable there would break the class value.
        if (prop === 'modal') return (..._args: unknown[]) => 'modal'
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

// Modal reads `t` through `useTranslation()` (the bonded provider), so it gets
// a REAL provider instead of a static-`t` stub. No translations are
// registered: every label falls back to its own `defaultValue`.
setProvider(createSimpleI18nProvider())

const { Modal } = await import('../components/modal.component.js')

/** A Modal with no title (the floating-X case). */
const NoTitleHost: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-modal-no-title',
  standalone: true,
  imports: [Modal],
  template: `<mol-modal [open]="true">body</mol-modal>`,
})(class SpecNoTitleHost {})

/** A Modal named "Settings" (the header-row case). */
const TitleHost: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-modal-title',
  standalone: true,
  imports: [Modal],
  template: `<mol-modal [open]="true" title="Settings">body</mol-modal>`,
})(class SpecTitleHost {})

/** A title-less Modal with the close button turned off. */
const NoCloseHost: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-modal-no-close',
  standalone: true,
  imports: [Modal],
  template: `<mol-modal [open]="true" [showCloseButton]="false">body</mol-modal>`,
})(class SpecNoCloseHost {})

let appRef: ApplicationRef
const views: Array<{ destroy: () => void }> = []

beforeEach(async () => {
  if (!appRef)
    appRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
  document.body.innerHTML = ''
})

afterEach(() => {
  for (const view of views.splice(0)) view.destroy()
  document.body.innerHTML = ''
})

/** Mounts a host component and runs the mounting change-detection passes. */
async function mountHost(component: Type<unknown>): Promise<void> {
  const ref = createComponent(component, { environmentInjector: appRef.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  views.push(ref)
  appRef.tick()
  await Promise.resolve()
  appRef.tick()
}

/** The rendered close button, when one exists. */
const closeButton = (): HTMLElement | null =>
  document.body.querySelector<HTMLElement>('[data-mol-id="modal-close"]')

describe('Modal close-button placement', () => {
  it('without a title: the X floats top-right and NO header band renders', async () => {
    await mountHost(NoTitleHost)
    expect(closeButton()?.className).toContain('dialogCloseFloating')
    expect(document.body.querySelector('.dialogHeader')).toBeNull()
  })

  it('with a title: the X shares the header row, not the floating overlay', async () => {
    await mountHost(TitleHost)
    const header = document.body.querySelector('.dialogHeader')
    expect(header).not.toBeNull()
    expect(header?.textContent).toContain('Settings')
    expect(closeButton()?.className).toBe('dialogClose')
  })

  it('without a title and showCloseButton=false: no X and no header at all', async () => {
    await mountHost(NoCloseHost)
    expect(closeButton()).toBeNull()
    expect(document.body.querySelector('.dialogHeader')).toBeNull()
  })
})
