// @vitest-environment jsdom
/**
 * Unmount tests for the Modal's focus restore: a dialog removed while open (its parent stops
 * rendering it) gives focus back to whatever opened it, as closing it does; with that element
 * gone, or a dialog that was never open, focus is left alone. Same cases as
 * `@molecule/app-ui-react`'s `modal-unmount-focus.test.tsx`.
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

setProvider(createSimpleI18nProvider())

const { Modal } = await import('../components/modal.component.js')

/** Whether the host renders its dialog; a test removes it by setting this false. */
const shown = signal(true)
/** Whether the dialog is open. */
const open = signal(true)

const Host: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-modal-unmount-focus',
  standalone: true,
  imports: [Modal],
  template: `@if (shown()) {
    <mol-modal [open]="open()" title="Restore">Body</mol-modal>
  }`,
})(
  class SpecModalUnmountFocusHost {
    readonly shown = shown
    readonly open = open
  },
)

/**
 * A focused button outside the dialog, as the control that opens it.
 *
 * @returns The button.
 */
const focusedOpener = (): HTMLButtonElement => {
  const opener = document.createElement('button')
  opener.textContent = 'Open'
  document.body.appendChild(opener)
  opener.focus()
  return opener
}

const apps: ApplicationRef[] = []

/**
 * Mounts the host in its own application and renders it (the dialog's open focus runs after the
 * render). Unmounting removes the dialog through the host's `@if`, as a parent that stops
 * rendering it does, and renders again.
 *
 * @param isOpen - Whether the dialog is open.
 * @returns Unmounts the dialog.
 */
const mountModal = async (isOpen: boolean): Promise<() => Promise<void>> => {
  shown.set(true)
  open.set(isOpen)
  const appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  apps.push(appRef)
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  await appRef.whenStable()
  return async () => {
    shown.set(false)
    appRef.tick()
    await appRef.whenStable()
  }
}

afterEach(() => {
  for (const appRef of apps.splice(0)) if (!appRef.destroyed) appRef.destroy()
  document.body.innerHTML = ''
})

describe('Modal focus on unmount', () => {
  it('unmounting an open dialog returns focus to the element that opened it', async () => {
    const opener = focusedOpener()
    const unmount = await mountModal(true)
    expect(document.activeElement).not.toBe(opener)
    await unmount()
    expect(document.activeElement).toBe(opener)
  })

  it('unmounting an open dialog leaves focus alone when its opener is gone', async () => {
    const opener = focusedOpener()
    const unmount = await mountModal(true)
    opener.remove()
    await unmount()
    expect(document.activeElement).toBe(document.body)
  })

  it('unmounting a closed dialog leaves focus where it is', async () => {
    const other = focusedOpener()
    const unmount = await mountModal(false)
    await unmount()
    expect(document.activeElement).toBe(other)
  })

  it('destroying the whole application with an open dialog does not throw', async () => {
    focusedOpener()
    await mountModal(true)
    const appRef = apps.pop()!
    expect(() => appRef.destroy()).not.toThrow()
  })
})
