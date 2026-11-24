import { describe, expect, it } from 'vitest'

import { goldenScope, KIT, testNamePattern } from '../check-golden-rules.mjs'

describe('goldenScope', () => {
  it('names each feature whose cases or goldens changed, once', () => {
    expect(
      goldenScope([
        `${KIT}/src/features/goldens/settings-panel.json`,
        `${KIT}/src/features/cases/settings-panel.ts`,
        `${KIT}/src/features/goldens/ide/ChatPanel.json`,
        `${KIT}/src/features/cases/ide/chat-panel.ts`,
        `${KIT}/src/features/goldens/action-menu.json`,
      ]),
    ).toEqual({ features: ['action-menu', 'ide', 'settings-panel'], ui: false })
  })

  it('names the UI kit when its cases or goldens changed', () => {
    expect(goldenScope([`${KIT}/src/ui/goldens.json`])).toEqual({ features: [], ui: true })
    expect(goldenScope([`${KIT}/src/ui/cases/button.ts`])).toEqual({ features: [], ui: true })
  })

  it('leaves out every other path', () => {
    expect(
      goldenScope([
        `${KIT}/src/adapters/vue.ts`,
        `${KIT}/src/features/run.ts`,
        `${KIT}/src/ui/run.ts`,
        `${KIT}/README.md`,
        'packages/app/features/settings-panel-react/src/BillingSection.tsx',
        'packages/app/frameworks/conformance-extra/src/features/goldens/x.json',
      ]),
    ).toEqual({ features: [], ui: false })
  })
})

describe('testNamePattern', () => {
  const selects = (scope, name) => new RegExp(testNamePattern(scope)).test(name)

  it('is undefined when nothing changed', () => {
    expect(testNamePattern({ features: [], ui: false })).toBeUndefined()
  })

  it("selects both tests' names for a feature, and no other feature", () => {
    const scope = { features: ['settings-panel'], ui: false }
    expect(
      selects(scope, 'React markup passes axe-core structural rules settings-panel AccountSection'),
    ).toBe(true)
    expect(
      selects(
        scope,
        'feature text goes through i18n (React, after a switch to en-XA) settings-panel',
      ),
    ).toBe(true)
    expect(
      selects(
        scope,
        'React markup passes axe-core structural rules settings-actions-bar SettingsActionsBar',
      ),
    ).toBe(false)
    expect(
      selects(scope, 'React markup passes axe-core structural rules settings-panel-x Foo'),
    ).toBe(false)
    expect(selects(scope, 'React markup passes axe-core structural rules UI kit Button')).toBe(
      false,
    )
  })

  it('selects the UI kit tests when its goldens changed', () => {
    const scope = { features: [], ui: true }
    expect(selects(scope, 'React markup passes axe-core structural rules UI kit Button')).toBe(true)
    expect(
      selects(scope, 'React markup passes axe-core structural rules settings-panel AccountSection'),
    ).toBe(false)
  })
})
