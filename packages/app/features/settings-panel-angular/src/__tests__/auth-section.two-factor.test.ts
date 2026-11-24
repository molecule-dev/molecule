// @vitest-environment jsdom

/**
 * An API without a two-factor provider serves no `verify-two-factor` route, so a scaffold without
 * one renders the section with `[twoFactor]="false"`: an Enable button there only answers 404.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AppAngular from '@molecule/app-angular'
import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import { type IconSet, setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AuthSection } from '../auth-section.component.js'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<typeof AppAngular>()),
  useAuth: () => ({ user: signal({ id: 'user-1' }) }),
  useChangePassword: () => ({
    status: 'idle',
    error: null,
    changePassword: vi.fn(),
    reset: vi.fn(),
  }),
  useHttpClient: () => http,
}))

const destroys: Array<() => void> = []

/**
 * Mount the section.
 *
 * @param twoFactor - The section's `twoFactor` input, or undefined for the default.
 * @returns The container it renders into.
 */
async function mount(twoFactor?: boolean): Promise<HTMLElement> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<unknown> = createComponent(AuthSection as Type<unknown>, {
    environmentInjector: appRef.injector,
  })
  if (twoFactor !== undefined) ref.setInput('twoFactor', twoFactor)
  const container = document.createElement('div')
  document.body.appendChild(container)
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  await Promise.resolve()
  appRef.tick()
  destroys.push(() => {
    appRef.destroy()
    container.remove()
  })
  return container
}

/** Every icon the modal asks for, as one plain glyph. */
const iconSet = new Proxy({} as IconSet, {
  get: () => ({ paths: [{ d: 'M6 18L18 6' }], viewBox: '0 0 24 24' }),
})

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(iconSet)
  setI18nProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const destroy of destroys.splice(0)) destroy()
  vi.resetAllMocks()
})

describe('AuthSection two-factor row', () => {
  it('shows the row and reads the 2FA status by default', async () => {
    http.get.mockReturnValue(new Promise(() => {}))
    const container = await mount()
    expect(container.textContent).toContain('Two-factor authentication')
    expect(http.get).toHaveBeenCalledWith('/api/users/me')
  })

  it('shows only the password change when twoFactor is false', async () => {
    const container = await mount(false)
    expect(container.textContent).toContain('Change password')
    expect(container.textContent).not.toContain('Two-factor authentication')
    expect(http.get).not.toHaveBeenCalled()
  })
})
