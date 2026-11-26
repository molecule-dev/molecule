// @vitest-environment jsdom
/**
 * Unit tests for the Vue `SettingsActionsBar` — a port of
 * `@molecule/app-settings-actions-bar-react/src/__tests__/settings-actions-bar.test.tsx`:
 * the same test names and behavioral assertions, rendered with Vue SSR and
 * asserted on the markup the component produces.
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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
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
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: defineComponent({
      name: 'MockButton',
      props: { disabled: { type: Boolean, default: false } },
      emits: ['click'],
      setup(props, { slots, emit }) {
        return () =>
          h(
            'button',
            {
              'data-button': '',
              disabled: props.disabled || undefined,
              onClick: (event: MouseEvent) => emit('click', event),
            },
            slots.default?.(),
          )
      },
    }),
  }
})

const { SettingsActionsBar } = await import('../SettingsActionsBar.js')
const { renderToString } = await import('vue/server-renderer')
const { h } = await import('vue')

/**
 * Renders a {@link SettingsActionsBar} to static markup, the way React's
 * `renderToStaticMarkup` helper does in the React suite.
 *
 * @param props - The component props.
 * @returns The serialized markup.
 */
const html = async (props: SettingsActionsBarProps): Promise<string> =>
  renderToString(h(SettingsActionsBar, props))

describe('SettingsActionsBar', () => {
  it('always renders the Save button', async () => {
    const markup = await html({ onSave: () => {} })
    expect(markup).toContain('Save changes')
  })

  it('renders the Cancel button only when onCancel is supplied', async () => {
    const withCancel = await html({ onSave: () => {}, onCancel: () => {} })
    expect(withCancel).toContain('Cancel')
    const without = await html({ onSave: () => {} })
    expect(without).not.toContain('Cancel')
  })

  it('shows the saving label and disables Save while loading', async () => {
    const markup = await html({ onSave: () => {}, loading: true })
    expect(markup).toContain('Saving…')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('disables Save when the disabled prop is set', async () => {
    const markup = await html({ onSave: () => {}, disabled: true })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the "Saved" status when savedAt is supplied', async () => {
    const markup = await html({ onSave: () => {}, savedAt: Date.now() })
    expect(markup).toContain('Saved')
  })

  it('paints a real theme surface + top border on the bar (not transparent)', async () => {
    const markup = await html({ onSave: () => {} })
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

  it('renders the bonded "Saved {{at}}" template with the relative time interpolated', async () => {
    const markup = await html({ onSave: () => {}, savedAt: Date.now() })
    expect(markup).toContain('Saved just now')
  })

  it('renders the inline error and leading slot', async () => {
    const markup = await html({
      onSave: () => {},
      error: 'Something went wrong',
      leading: h('span', { 'data-leading': '' }),
    })
    expect(markup).toContain('Something went wrong')
    // Vue's serializer writes a bare attribute for the empty value
    // (`data-leading`), where React writes `data-leading=""` — same attribute.
    expect(markup).toContain('data-leading')
  })

  it('applies the sticky inline style by default and drops it when sticky is false', async () => {
    expect(await html({ onSave: () => {} })).toContain('position:sticky')
    expect(await html({ onSave: () => {}, sticky: false })).not.toContain('position:sticky')
  })

  it('forwards className', async () => {
    const markup = await html({ onSave: () => {}, className: 'sab-cls' })
    expect(markup).toContain('sab-cls')
  })
})
