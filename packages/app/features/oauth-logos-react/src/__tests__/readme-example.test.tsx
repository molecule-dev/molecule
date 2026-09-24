/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { OAuthProviderLogo } from '../index.js'

const providers = [
  { id: 'google', name: 'Google' },
  { id: 'github', name: 'GitHub' },
  { id: 'okta', name: 'Okta' }, // no bundled logo → fallback renders
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered sign-in links.
 */
function SignInLinks(): React.JSX.Element {
  return (
    <nav>
      {providers.map((p) => (
        <a key={p.id} href={`/api/users/oauth/${p.id}`}>
          <OAuthProviderLogo
            provider={p.id}
            size={20}
            mode="brand"
            ariaLabel=""
            fallback={<span aria-hidden="true">🔑</span>}
          />
          <span>Continue with {p.name}</span>
        </a>
      ))}
    </nav>
  )
}

describe('README @example', () => {
  it('renders a hidden 20px logo per known provider and the fallback for an unknown one', () => {
    const html = renderToStaticMarkup(<SignInLinks />)
    expect(html.match(/<svg /g)).toHaveLength(2)
    expect(html.match(/width="20" height="20"/g)).toHaveLength(2)
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(3)
    expect(html).not.toContain('role="img"')
    expect(html).toContain('#4285F4') // Google brand blue in brand mode
    expect(html).toContain('href="/api/users/oauth/github"')
    expect(html).toContain('<span aria-hidden="true">🔑</span><span>Continue with Okta</span>')
  })
})
