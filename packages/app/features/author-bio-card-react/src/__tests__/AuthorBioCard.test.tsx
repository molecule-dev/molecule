// @vitest-environment jsdom

/**
 * Unit tests for `<AuthorBioCard>` — layout switching, social-link rendering,
 * follow-button toggle wiring, and accessibility attributes. Mocks the
 * ClassMap + i18n + UI-react bonds so tests run without a fully-bonded app.
 *
 * @module
 */

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => buildStubClassMap(),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Avatar: ({ src, name, size }: { src?: string; name?: string; size?: string }) => (
    <span data-testid="avatar" data-name={name} data-src={src} data-size={size} />
  ),
  Button: ({
    children,
    onClick,
    variant,
    'aria-pressed': ariaPressed,
    'data-mol-id': dataMolId,
  }: {
    children: ReactNode
    onClick?: () => void
    variant?: string
    'aria-pressed'?: boolean
    'data-mol-id'?: string
  }) => (
    <button
      type="button"
      data-testid="follow-btn"
      data-variant={variant}
      data-mol-id={dataMolId}
      aria-pressed={ariaPressed}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  Card: ({
    children,
    className,
    'data-mol-id': dataMolId,
  }: {
    children: ReactNode
    className?: string
    'data-mol-id'?: string
  }) => (
    <div data-testid="card" data-mol-id={dataMolId} className={className}>
      {children}
    </div>
  ),
}))

import { AuthorBioCard, resolveSocialHref } from '../AuthorBioCard.js'

/**
 * Build a permissive ClassMap stub via Proxy: `cn(...)` joins truthy strings;
 * every other accessed property/method returns its key as a string token.
 *
 * @returns A stub ClassMap-like object suitable for tests.
 */
function buildStubClassMap(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes
            .flat()
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_target, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler)
}

const baseAuthor = {
  id: 'alice',
  name: 'Alice Example',
  avatar: 'https://example.com/alice.png',
  bio: 'Writes about distributed systems.',
}

describe('<AuthorBioCard>', () => {
  describe('compact layout (default)', () => {
    it('renders the avatar with the author name', () => {
      const { getByTestId } = render(<AuthorBioCard author={baseAuthor} />)
      const avatar = getByTestId('avatar')
      expect(avatar.getAttribute('data-name')).toBe('Alice Example')
      expect(avatar.getAttribute('data-src')).toBe('https://example.com/alice.png')
      expect(avatar.getAttribute('data-size')).toBe('md')
    })

    it('renders the name as a span when no href is provided', () => {
      const { container } = render(<AuthorBioCard author={baseAuthor} />)
      const nameEl = container.querySelector('[data-mol-id="author-bio-card-name"]')
      expect(nameEl?.tagName).toBe('SPAN')
      expect(nameEl?.textContent).toBe('Alice Example')
    })

    it('renders the name as a link when href is provided', () => {
      const { container } = render(
        <AuthorBioCard author={{ ...baseAuthor, href: '/authors/alice' }} />,
      )
      const nameEl = container.querySelector('[data-mol-id="author-bio-card-name"]')
      expect(nameEl?.tagName).toBe('A')
      expect(nameEl?.getAttribute('href')).toBe('/authors/alice')
    })

    it('renders the bio paragraph', () => {
      const { container } = render(<AuthorBioCard author={baseAuthor} />)
      const bio = container.querySelector('[data-mol-id="author-bio-card-bio"]')
      expect(bio?.textContent).toBe('Writes about distributed systems.')
    })

    it('omits the bio paragraph when bio is empty', () => {
      const { container } = render(<AuthorBioCard author={{ ...baseAuthor, bio: undefined }} />)
      expect(container.querySelector('[data-mol-id="author-bio-card-bio"]')).toBeNull()
    })

    it('hides the follow button when onFollow is omitted', () => {
      const { queryByTestId } = render(<AuthorBioCard author={baseAuthor} />)
      expect(queryByTestId('follow-btn')).toBeNull()
    })

    it('renders a Follow button that toggles to the new state on click', () => {
      const onFollow = vi.fn()
      const { getByTestId } = render(<AuthorBioCard author={baseAuthor} onFollow={onFollow} />)
      const btn = getByTestId('follow-btn')
      expect(btn.textContent).toBe('Follow')
      expect(btn.getAttribute('aria-pressed')).toBe('false')
      expect(btn.getAttribute('data-variant')).toBe('solid')
      fireEvent.click(btn)
      expect(onFollow).toHaveBeenCalledWith(true)
    })

    it('renders a Following button when following=true', () => {
      const onFollow = vi.fn()
      const { getByTestId } = render(
        <AuthorBioCard author={baseAuthor} onFollow={onFollow} following />,
      )
      const btn = getByTestId('follow-btn')
      expect(btn.textContent).toBe('Following')
      expect(btn.getAttribute('aria-pressed')).toBe('true')
      expect(btn.getAttribute('data-variant')).toBe('outline')
      fireEvent.click(btn)
      expect(onFollow).toHaveBeenCalledWith(false)
    })

    it('omits the social row when no socials are provided', () => {
      const { container } = render(<AuthorBioCard author={baseAuthor} />)
      expect(container.querySelector('[data-mol-id="author-bio-card-socials"]')).toBeNull()
    })

    it('renders only the social platforms that have values', () => {
      const { container } = render(
        <AuthorBioCard
          author={{
            ...baseAuthor,
            socials: { twitter: 'alice', github: 'alice-gh' },
          }}
        />,
      )
      expect(
        container.querySelector('[data-mol-id="author-bio-card-social-twitter"]'),
      ).not.toBeNull()
      expect(
        container.querySelector('[data-mol-id="author-bio-card-social-github"]'),
      ).not.toBeNull()
      expect(container.querySelector('[data-mol-id="author-bio-card-social-linkedin"]')).toBeNull()
    })

    it('attaches an accessible label to each social link', () => {
      const { container } = render(
        <AuthorBioCard author={{ ...baseAuthor, socials: { twitter: 'alice' } }} />,
      )
      const link = container.querySelector('[data-mol-id="author-bio-card-social-twitter"]')
      expect(link?.getAttribute('aria-label')).toBe('Alice Example on twitter')
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
      expect(link?.getAttribute('target')).toBe('_blank')
    })

    it('honors a custom dataMolId for the wrapping card and child selectors', () => {
      const { container } = render(
        <AuthorBioCard
          author={{ ...baseAuthor, socials: { twitter: 'alice' } }}
          onFollow={() => {}}
          dataMolId="custom-author"
        />,
      )
      expect(container.querySelector('[data-mol-id="custom-author"]')).not.toBeNull()
      expect(container.querySelector('[data-mol-id="custom-author-name"]')).not.toBeNull()
      expect(container.querySelector('[data-mol-id="custom-author-social-twitter"]')).not.toBeNull()
      expect(container.querySelector('[data-mol-id="custom-author-follow"]')).not.toBeNull()
    })

    it('uses an avatar fallback (initials) when no avatar URL is provided', () => {
      const { getByTestId } = render(
        <AuthorBioCard author={{ ...baseAuthor, avatar: undefined }} />,
      )
      const avatar = getByTestId('avatar')
      expect(avatar.getAttribute('data-src')).toBeNull()
      expect(avatar.getAttribute('data-name')).toBe('Alice Example')
    })
  })

  describe('full layout', () => {
    it('renders a larger avatar', () => {
      const { getByTestId } = render(<AuthorBioCard author={baseAuthor} layout="full" />)
      expect(getByTestId('avatar').getAttribute('data-size')).toBe('lg')
    })

    it('still renders bio + socials + follow button', () => {
      const { container, getByTestId } = render(
        <AuthorBioCard
          author={{ ...baseAuthor, socials: { website: 'alice.example' } }}
          layout="full"
          onFollow={() => {}}
        />,
      )
      expect(container.querySelector('[data-mol-id="author-bio-card-bio"]')).not.toBeNull()
      expect(
        container.querySelector('[data-mol-id="author-bio-card-social-website"]'),
      ).not.toBeNull()
      expect(getByTestId('follow-btn')).not.toBeNull()
    })
  })
})

describe('resolveSocialHref', () => {
  it('passes http URLs through unchanged', () => {
    expect(resolveSocialHref('twitter', 'https://twitter.com/alice')).toBe(
      'https://twitter.com/alice',
    )
  })

  it('passes https URLs through unchanged', () => {
    expect(resolveSocialHref('github', 'https://github.com/alice')).toBe('https://github.com/alice')
  })

  it('routes bare twitter handles to twitter.com', () => {
    expect(resolveSocialHref('twitter', 'alice')).toBe('https://twitter.com/alice')
    expect(resolveSocialHref('twitter', '@alice')).toBe('https://twitter.com/alice')
  })

  it('routes bare github handles to github.com', () => {
    expect(resolveSocialHref('github', 'alice')).toBe('https://github.com/alice')
  })

  it('routes bare linkedin handles to linkedin.com/in/<handle>', () => {
    expect(resolveSocialHref('linkedin', 'alice')).toBe('https://www.linkedin.com/in/alice')
  })

  it('parses mastodon @user@instance handles into URLs on the right instance', () => {
    expect(resolveSocialHref('mastodon', '@alice@hachyderm.io')).toBe('https://hachyderm.io/@alice')
  })

  it('falls back to mastodon.social for bare mastodon handles', () => {
    expect(resolveSocialHref('mastodon', 'alice')).toBe('https://mastodon.social/@alice')
  })

  it('treats bare website values as https://', () => {
    expect(resolveSocialHref('website', 'alice.example')).toBe('https://alice.example')
  })

  it('strips a leading slash from website values', () => {
    expect(resolveSocialHref('website', '/alice.example')).toBe('https://alice.example')
  })
})
