// @vitest-environment jsdom
/**
 * Unit tests for the Solid `SettingsActionsBar` — a port of
 * `@molecule/app-settings-actions-bar-react/src/__tests__/settings-actions-bar.test.tsx`:
 * the same test names and behavioral assertions, rendered with Solid's client
 * renderer in jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

// The REAL companion locale bond (not mocked) — proves t('settingsActions.saved')
// and its siblings resolve from the bond's canonical en table, not just the
// inline defaultValue that would otherwise mask a missing key.
import { en as settingsActionsBarEn } from '@molecule/app-locales-settings-actions-bar'

import type { SettingsActionsBarProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `surface`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// `Button` is the only UI component dependency — stub it to an inspectable
// `<button>` carrying `data-button` and the disabled state, the same markers
// the React suite's `@molecule/app-ui-react` stub renders.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: (props: { children?: unknown; disabled?: boolean; onClick?: () => void }) => (
    <button data-button="" disabled={props.disabled} onClick={props.onClick}>
      {props.children as never}
    </button>
  ),
}))

const { SettingsActionsBar } = await import('../SettingsActionsBar.jsx')
const { render } = await import('solid-js/web')

/**
 * Renders a {@link SettingsActionsBar} into a detached jsdom node and returns
 * the markup it produced, the way React's `renderToStaticMarkup` helper does in
 * the React suite (Solid's own string renderer is SSR-only, so the package's
 * client build mounts instead).
 *
 * @param props - The component props.
 * @returns The serialized markup.
 */
const html = (props: SettingsActionsBarProps): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const dispose = render(() => <SettingsActionsBar {...props} />, target)
  const markup = target.innerHTML
  dispose()
  target.remove()
  return markup
}

describe('SettingsActionsBar', () => {
  it('always renders the Save button', () => {
    const markup = html({ onSave: () => {} })
    expect(markup).toContain('Save changes')
  })

  it('renders the Cancel button only when onCancel is supplied', () => {
    const withCancel = html({ onSave: () => {}, onCancel: () => {} })
    expect(withCancel).toContain('Cancel')
    const without = html({ onSave: () => {} })
    expect(without).not.toContain('Cancel')
  })

  it('shows the saving label and disables Save while loading', () => {
    const markup = html({ onSave: () => {}, loading: true })
    expect(markup).toContain('Saving…')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('disables Save when the disabled prop is set', () => {
    const markup = html({ onSave: () => {}, disabled: true })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the "Saved" status when savedAt is supplied', () => {
    const markup = html({ onSave: () => {}, savedAt: Date.now() })
    expect(markup).toContain('Saved')
  })

  it('paints a real theme surface + top border on the bar (not transparent)', () => {
    const markup = html({ onSave: () => {} })
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
    const markup = html({ onSave: () => {}, savedAt: Date.now() })
    expect(markup).toContain('Saved just now')
  })

  it('renders the inline error and leading slot', () => {
    const markup = html({
      onSave: () => {},
      error: 'Something went wrong',
      leading: <span data-leading />,
    })
    expect(markup).toContain('Something went wrong')
    expect(markup).toContain('data-leading=""')
  })

  it('applies the sticky inline style by default and drops it when sticky is false', () => {
    // Solid writes the declarations through the CSSOM, so jsdom serializes
    // them with a space after the colon (React's SSR string has none).
    expect(html({ onSave: () => {} })).toMatch(/position:\s*sticky/)
    expect(html({ onSave: () => {}, sticky: false })).not.toMatch(/position:\s*sticky/)
  })

  it('forwards className', () => {
    const markup = html({ onSave: () => {}, className: 'sab-cls' })
    expect(markup).toContain('sab-cls')
  })
})
