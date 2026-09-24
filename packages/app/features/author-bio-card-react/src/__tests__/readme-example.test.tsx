/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real ClassMap, real i18n provider and
 * the companion locale bond.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as authorBioCardLocales from '@molecule/app-locales-author-bio-card'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AuthorBioCard } from '../index.js'

setClassMap(classMap)
registerLocaleModule(authorBioCardLocales)

const author = {
  id: 'alice',
  name: 'Alice Example',
  avatar: '/avatars/alice.png',
  bio: 'Writes about distributed systems and tea.',
  href: '/authors/alice',
  socials: { twitter: 'alice', github: 'alice', website: 'alice.example' },
}

/**
 * The README example, verbatim.
 *
 * @returns The article footer with the author card.
 */
function ArticleFooter(): JSX.Element {
  const [following, setFollowing] = useState(false)
  return (
    <I18nProvider provider={getI18nProvider()}>
      <AuthorBioCard author={author} layout="full" following={following} onFollow={setFollowing} />
    </I18nProvider>
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the author with resolved social links and a working follow toggle', () => {
    render(<ArticleFooter />)

    expect(screen.getByText('Alice Example').getAttribute('href')).toBe('/authors/alice')
    expect(screen.getByText('Writes about distributed systems and tea.')).toBeTruthy()
    expect(screen.getByLabelText('Alice Example on GitHub').getAttribute('href')).toBe(
      'https://github.com/alice',
    )
    expect(screen.getByLabelText('Alice Example on Twitter').getAttribute('href')).toBe(
      'https://twitter.com/alice',
    )
    expect(screen.getByText('Website').getAttribute('href')).toBe('https://alice.example')

    const follow = screen.getByRole('button', { name: 'Follow' })
    expect(follow.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(follow)
    const following = screen.getByRole('button', { name: 'Following' })
    expect(following.getAttribute('aria-pressed')).toBe('true')
  })
})
