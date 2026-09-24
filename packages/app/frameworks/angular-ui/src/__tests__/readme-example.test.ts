// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the example component is bootstrapped
 * as a real (JIT-compiled) Angular app with the REAL Tailwind ClassMap and the
 * REAL molecule icon set bonded, then driven through the DOM.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import { type ApplicationRef, Component } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import { registerLocaleModule, t } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import * as commonLocales from '@molecule/app-locales-common'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MoleculeAlert, MoleculeButton, MoleculeInput } from '../index.js'

setClassMap(classMap)
setIconSet(iconSet)
registerLocaleModule(commonLocales)

class ProfileForm {
  name = ''
  savedName = ''

  get nameLabel(): string {
    return t('form.displayName', undefined, { defaultValue: 'Display name' })
  }
  get saveLabel(): string {
    return t('common.saveProfile', undefined, { defaultValue: 'Save profile' })
  }
  get savedMessage(): string {
    return t('common.profileSavedPeriod', undefined, { defaultValue: 'Profile saved.' })
  }

  // Outputs emit the raw DOM event — read the value from its target.
  onName(event: Event): void {
    this.name = (event.target as HTMLInputElement).value
  }
  save(): void {
    this.savedName = this.name
  }
}

// Test files are outside tsconfig's `include`, so the transformer does not
// down-level decorator SYNTAX here; applying the decorator as a call is the
// exact runtime equivalent of `@Component({...})` on the class.
Component({
  selector: 'app-root',
  imports: [MoleculeAlert, MoleculeButton, MoleculeInput],
  template: `
    <mol-input [label]="nameLabel" [value]="name" (handleInput)="onName($event)"></mol-input>
    <mol-button color="primary" testId="save-profile" (handleClick)="save()">{{ saveLabel }}</mol-button>
    @if (savedName) {
      <mol-alert status="success">{{ savedMessage }}</mol-alert>
    }
  `,
})(ProfileForm)

let appRef: ApplicationRef | undefined

afterEach(() => {
  appRef?.destroy()
  appRef = undefined
  document.body.innerHTML = ''
})

describe('README @example', () => {
  it('renders the molecule components and wires their handle* outputs', async () => {
    document.body.innerHTML = '<app-root></app-root>'
    appRef = await bootstrapApplication(ProfileForm)
    await appRef.whenStable()

    const root = document.querySelector('app-root')
    const label = root?.querySelector('label')
    expect(label?.textContent?.trim()).toBe('Display name')
    const button = root?.querySelector<HTMLButtonElement>('[data-testid="save-profile"]')
    expect(button?.className).toContain(classMap.button({ color: 'primary' }).split(' ')[0])
    expect(root?.querySelector('[role="alert"]')).toBeNull()

    const input = root?.querySelector('input')
    if (!input || !button) throw new Error('mol-input / mol-button did not render')
    input.value = 'Ada'
    input.dispatchEvent(new Event('input'))
    button.dispatchEvent(new Event('click'))
    await appRef.whenStable()

    const alert = root?.querySelector('[role="alert"]')
    expect(alert?.textContent?.trim()).toBe('Profile saved.')
    expect(input.value).toBe('Ada')
  })
})
