// @vitest-environment jsdom
// The barrel imports the section components, which import the Solid UI
// package — its module graph needs a DOM at import time.

import { describe, expect, it } from 'vitest'

import * as panel from '../index.js'

describe('@molecule/app-settings-panel-solid', () => {
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

  it('re-exports the push device-toggle helpers from @molecule/app-push', () => {
    for (const name of [
      'disablePushOnCurrentDevice',
      'enablePushOnCurrentDevice',
      'findCurrentDevice',
      'readCurrentDevicePushEnabled',
      'subscriptionFromToken',
    ]) {
      expect(typeof (panel as Record<string, unknown>)[name], name).toBe('function')
    }
  })
})
