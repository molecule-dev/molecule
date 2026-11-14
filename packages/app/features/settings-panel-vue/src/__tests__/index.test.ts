/**
 * Unit tests for `@molecule/app-settings-panel-vue` — a port of
 * `@molecule/app-settings-panel-react/src/__tests__/index.test.ts`: the same
 * export-surface assertions for the Vue package.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import * as panel from '../index.js'

describe('@molecule/app-settings-panel-vue', () => {
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
      expect(panel[name as keyof typeof panel], name).toBeTruthy()
    }
  })

  it('exports useSettingsPanelContext for sections that need onClose', () => {
    expect(typeof panel.useSettingsPanelContext).toBe('function')
  })

  it('exports the SettingsPanelContext and the shared push helpers', () => {
    expect(panel.SettingsPanelContext).toBeDefined()
    expect(typeof panel.enablePushOnCurrentDevice).toBe('function')
    expect(typeof panel.disablePushOnCurrentDevice).toBe('function')
    expect(typeof panel.findCurrentDevice).toBe('function')
    expect(typeof panel.readCurrentDevicePushEnabled).toBe('function')
    expect(typeof panel.subscriptionFromToken).toBe('function')
  })
})
