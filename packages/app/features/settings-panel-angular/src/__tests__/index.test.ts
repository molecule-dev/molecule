// The barrel pulls in Angular components whose decorators need the JIT
// compiler at module-evaluation time.
import '@angular/compiler'
import { describe, expect, it } from 'vitest'

import * as panel from '../index.js'

describe('@molecule/app-settings-panel-angular', () => {
  it('exports container + 7 section sub-components', () => {
    const expected = [
      'SettingsContainer',
      'AccountSection',
      'AuthSection',
      'NotificationsSection',
      'BillingSection',
      'DevicesSection',
      'ThisDeviceSection',
      'LogOutDeleteSection',
    ]
    for (const name of expected) {
      expect(typeof (panel as Record<string, unknown>)[name], name).toBe('function')
    }
  })

  it('exports useSettingsPanelContext for sections that need onClose', () => {
    expect(typeof panel.useSettingsPanelContext).toBe('function')
  })

  it('exports the container context under its React name', () => {
    expect(panel.SettingsPanelContext).toBeTruthy()
  })
})
