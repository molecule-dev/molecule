import { describe, expect, it } from 'vitest'

import * as panel from '../index.js'

describe('@molecule/app-settings-panel-react', () => {
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
})
