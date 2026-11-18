// @vitest-environment jsdom
/**
 * Unit tests for the Svelte auth-page brand header — a port of
 * `@molecule/app-auth-brand-header-react/src/__tests__/auth-brand-header.test.tsx`:
 * the same test names and behavioral assertions, rendered with Svelte in jsdom
 * and asserted on the markup the components produce.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `bgPrimary`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React package's own tests use.
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

vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    // Mirrors real i18next: with no resource for the key, the (interpolated)
    // defaultValue is returned — so `{{appName}}` is substituted from `values`.
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      const resolved = opts?.defaultValue ?? key
      return resolved.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(values?.[name] ?? ''))
    },
  }),
}))

import AuthBrandHeader from '../AuthBrandHeader.svelte'
import AuthBrandHeaderChip from '../AuthBrandHeaderChip.svelte'
import AuthBrandHeaderTagline from '../AuthBrandHeaderTagline.svelte'
import AuthBrandHeaderWordmark from '../AuthBrandHeaderWordmark.svelte'

/** A snippet rendering the given markup, the way a caller fills `children`. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a component and returns the markup it produced — the Svelte
 * equivalent of the React suite's static render.
 *
 * @param component - The Svelte component to mount.
 * @param props - Its props.
 * @returns The rendered markup.
 */
const render = (component: unknown, props: Record<string, unknown> = {}): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mount(component as Parameters<typeof mount>[0], { target, props })
  flushSync()
  return target.innerHTML
}

describe('AuthBrandHeader (preset mode)', () => {
  it('renders the appName in an <h1> and the tagline in a <p>', () => {
    const markup = render(AuthBrandHeader, { appName: 'Acme', tagline: 'Ship faster' })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Acme')
    expect(markup).toContain('<p')
    expect(markup).toContain('Ship faster')
  })

  it('renders the gradient icon chip when an icon is supplied and omits it otherwise', () => {
    const withIcon = render(AuthBrandHeader, {
      appName: 'A',
      tagline: 'T',
      icon: 'rocket_launch',
    })
    expect(withIcon).toContain('iconGlyphFont')
    expect(withIcon).toContain('rocket_launch')
    const without = render(AuthBrandHeader, { appName: 'A', tagline: 'T' })
    expect(without).not.toContain('iconGlyphFont')
  })

  it('applies the wordmarkColor as an inline color on the <h1>', () => {
    const markup = render(AuthBrandHeader, {
      appName: 'A',
      tagline: 'T',
      wordmarkColor: '#ff0000',
    })
    expect(markup).toContain('color: rgb(255, 0, 0)')
  })

  it('appends className onto the <header> wrapper', () => {
    const markup = render(AuthBrandHeader, { appName: 'A', tagline: 'T', className: 'extra-cls' })
    expect(markup).toContain('extra-cls')
  })
})

describe('AuthBrandHeader (children mode)', () => {
  it('renders children verbatim inside the wrapper <div> and ignores preset props', () => {
    const markup = render(AuthBrandHeader, {
      appName: 'IgnoredName',
      tagline: 'IgnoredTagline',
      children: raw('<div data-custom>Bespoke</div>'),
    })
    expect(markup).toContain('<div')
    expect(markup).toContain('data-custom')
    expect(markup).toContain('Bespoke')
    expect(markup).not.toContain('IgnoredName')
    expect(markup).not.toContain('IgnoredTagline')
  })
})

describe('AuthBrandHeaderChip', () => {
  it('renders the icon and applies chipGradient + square shape', () => {
    const markup = render(AuthBrandHeaderChip, {
      icon: 'star',
      chipGradient: 'linear-gradient(red, blue)',
      chipShape: 'square',
    })
    expect(markup).toContain('star')
    expect(markup).toContain('background: linear-gradient(red, blue)')
    expect(markup).toContain('authBrandHeaderChipSquare')
  })

  it('falls back to the primary background when no chipGradient is supplied so the white icon stays visible', () => {
    const markup = render(AuthBrandHeaderChip, { icon: 'description' })
    expect(markup).toContain('description')
    expect(markup).toContain('bgPrimary')
    expect(markup).not.toContain('background:')
  })

  it('omits the primary background fallback when chipGradient supplies its own background', () => {
    const markup = render(AuthBrandHeaderChip, {
      icon: 'description',
      chipGradient: 'linear-gradient(red, blue)',
    })
    expect(markup).not.toContain('bgPrimary')
    expect(markup).toContain('background: linear-gradient(red, blue)')
  })
})

describe('AuthBrandHeaderWordmark', () => {
  it('renders children in an <h1> and appends className + inline color', () => {
    const markup = render(AuthBrandHeaderWordmark, {
      color: '#7c3aed',
      className: 'custom-wordmark',
      children: raw('Refract'),
    })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Refract')
    expect(markup).toContain('custom-wordmark')
    expect(markup).toContain('color: rgb(124, 58, 237)')
  })

  it('includes the wordmark ink by default so it stays legible in both themes', () => {
    const markup = render(AuthBrandHeaderWordmark, { children: raw('Reverb') })
    expect(markup).toContain('authBrandHeaderWordmark')
  })
})

describe('AuthBrandHeaderTagline', () => {
  it('renders children in a <p> and appends className', () => {
    const markup = render(AuthBrandHeaderTagline, {
      className: 'font-mono',
      children: raw('Ship faster'),
    })
    expect(markup).toContain('<p')
    expect(markup).toContain('Ship faster')
    expect(markup).toContain('authBrandHeaderTagline')
    expect(markup).toContain('font-mono')
  })
})
