// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: a real (JIT-compiled) Angular app is
 * bootstrapped with `provideMolecule`, and the injected Molecule services and
 * the reactive `t()` drive the rendered template. Only `fetch` (the outside
 * world) is stubbed.
 *
 * @module
 */
import '@angular/compiler'
import { AsyncPipe } from '@angular/common'
import { type ApplicationRef, Component, inject } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'
import {
  registerLocaleModule,
  setProvider as setI18nProvider,
  simpleProvider as i18nProvider,
} from '@molecule/app-i18n'
import * as commonLocales from '@molecule/app-locales-common'
import { provider as themeProvider } from '@molecule/app-theme-css-variables'

import { MoleculeAuthService, MoleculeThemeService, provideMolecule, t } from '../index.js'

interface User {
  id: string
  name: string
}

class AppComponent {
  protected readonly t = t
  private readonly auth: MoleculeAuthService<User> = inject(MoleculeAuthService)
  private readonly theme = inject(MoleculeThemeService)
  protected readonly isAuthenticated$ = this.auth.isAuthenticated$
  protected readonly mode$ = this.theme.mode$

  toggleTheme(): void {
    this.theme.toggleTheme()
  }
}

// Test files are outside tsconfig's `include`, so the transformer does not
// down-level decorator SYNTAX here; applying the decorator as a call is the
// exact runtime equivalent of `@Component({...})` on the class.
Component({
  selector: 'app-root',
  imports: [AsyncPipe],
  template: `
    <main [attr.data-theme]="mode$ | async">
      <h1>
        @if (isAuthenticated$ | async) {
          {{ t('auth.login.signInTitle', undefined, { defaultValue: 'Welcome back' }) }}
        } @else {
          {{ t('auth.login.logIn', undefined, { defaultValue: 'Log in' }) }}
        }
      </h1>
      <button type="button" data-mol-id="toggle-theme" (click)="toggleTheme()">
        {{ t('theme.toggle', undefined, { defaultValue: 'Toggle theme' }) }}
      </button>
    </main>
  `,
})(AppComponent)

let appRef: ApplicationRef | undefined

afterEach(() => {
  appRef?.destroy()
  appRef = undefined
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('README @example', () => {
  it('bootstraps with provideMolecule and renders through the injected services', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    )
    document.body.innerHTML = '<app-root></app-root>'

    setI18nProvider(i18nProvider)
    registerLocaleModule(commonLocales)
    const authClient = createJWTAuthClient<User>({ baseURL: '/api' })

    appRef = await bootstrapApplication(AppComponent, {
      providers: [provideMolecule({ auth: authClient, theme: themeProvider, i18n: i18nProvider })],
    })
    await appRef.whenStable()

    const root = document.querySelector('app-root')
    expect(root?.querySelector('h1')?.textContent?.trim()).toBe('Log in')
    const main = root?.querySelector('main')
    const before = themeProvider.getTheme().mode
    expect(main?.getAttribute('data-theme')).toBe(before)

    root?.querySelector('button')?.dispatchEvent(new Event('click'))
    await appRef.whenStable()
    expect(main?.getAttribute('data-theme')).toBe(before === 'light' ? 'dark' : 'light')
  })
})
