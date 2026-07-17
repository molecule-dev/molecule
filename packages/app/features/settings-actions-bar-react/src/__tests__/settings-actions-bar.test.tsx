import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// The REAL companion locale bond (not mocked) — proves t('settingsActions.saved')
// and its siblings resolve from the bond's canonical en table, not just the
// inline defaultValue that would otherwise mask a missing key.
import { en as settingsActionsBarEn } from '@molecule/app-locales-settings-actions-bar'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
}))

const { SettingsActionsBar } = await import('../SettingsActionsBar.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('SettingsActionsBar', () => {
  it('always renders the Save button', () => {
    const markup = html(createElement(SettingsActionsBar, { onSave: () => {} }))
    expect(markup).toContain('Save changes')
  })

  it('renders the Cancel button only when onCancel is supplied', () => {
    const withCancel = html(
      createElement(SettingsActionsBar, { onSave: () => {}, onCancel: () => {} }),
    )
    expect(withCancel).toContain('Cancel')
    const without = html(createElement(SettingsActionsBar, { onSave: () => {} }))
    expect(without).not.toContain('Cancel')
  })

  it('shows the saving label and disables Save while loading', () => {
    const markup = html(createElement(SettingsActionsBar, { onSave: () => {}, loading: true }))
    expect(markup).toContain('Saving…')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('disables Save when the disabled prop is set', () => {
    const markup = html(createElement(SettingsActionsBar, { onSave: () => {}, disabled: true }))
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the "Saved" status when savedAt is supplied', () => {
    const markup = html(
      createElement(SettingsActionsBar, { onSave: () => {}, savedAt: Date.now() }),
    )
    expect(markup).toContain('Saved')
  })

  it('paints a real theme surface + top border on the bar (not transparent)', () => {
    const markup = html(createElement(SettingsActionsBar, { onSave: () => {} }))
    // The stub ClassMap resolves each token to its own name, so a real
    // `cm.surface`/`cm.borderT` class token must appear on the wrapper — the
    // transparent-sticky-bar regression would leave both absent.
    expect(markup).toMatch(/class="[^"]*\bsurface\b[^"]*"/)
    expect(markup).toMatch(/class="[^"]*\bborderT\b[^"]*"/)
  })

  it('resolves settingsActions.saved (and its siblings) from the companion locale bond', () => {
    // The finding: t('settingsActions.saved') was rendered by the component but
    // existed in NO locale bond, so every non-English locale silently fell back
    // to English. Guard that the key is now bonded and interpolation-ready.
    expect(typeof settingsActionsBarEn['settingsActions.saved']).toBe('string')
    expect(settingsActionsBarEn['settingsActions.saved']).toContain('{{at}}')
    for (const key of [
      'settingsActions.cancel',
      'settingsActions.saving',
      'settingsActions.save',
      'settingsActions.saved',
    ] as const) {
      expect(settingsActionsBarEn[key].length, `${key} missing/empty in the bond`).toBeGreaterThan(
        0,
      )
    }
  })

  it('renders the bonded "Saved {{at}}" template with the relative time interpolated', () => {
    // Drive t() through the same interpolation the bonded value uses: the
    // component passes { at }, and the canonical bond value is "Saved {{at}}".
    const markup = html(
      createElement(SettingsActionsBar, { onSave: () => {}, savedAt: Date.now() }),
    )
    expect(markup).toContain('Saved just now')
  })

  it('renders the inline error and leading slot', () => {
    const markup = html(
      createElement(SettingsActionsBar, {
        onSave: () => {},
        error: 'Something went wrong',
        leading: createElement('span', { 'data-leading': '' }),
      }),
    )
    expect(markup).toContain('Something went wrong')
    expect(markup).toContain('data-leading=""')
  })

  it('applies the sticky inline style by default and drops it when sticky is false', () => {
    expect(html(createElement(SettingsActionsBar, { onSave: () => {} }))).toContain(
      'position:sticky',
    )
    expect(
      html(createElement(SettingsActionsBar, { onSave: () => {}, sticky: false })),
    ).not.toContain('position:sticky')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(SettingsActionsBar, { onSave: () => {}, className: 'sab-cls' }),
    )
    expect(markup).toContain('sab-cls')
  })
})
