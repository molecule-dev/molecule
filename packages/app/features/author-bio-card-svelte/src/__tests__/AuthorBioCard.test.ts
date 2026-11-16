// @vitest-environment jsdom

/**
 * Unit tests for the Svelte `<AuthorBioCard>` — a port of
 * `@molecule/app-author-bio-card-react`'s own suite: the same test names and
 * the same behavioral assertions, mounted with Svelte in jsdom against the
 * real UI components and a stub ClassMap that records which `cm.*` calls were
 * made.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Every `cm.*` call the render made: its token and its arguments. */
const { classCalls } = vi.hoisted(() => ({
  classCalls: [] as Array<{ token: string; args: unknown[] }>,
}))

// A permissive ClassMap proxy that records each method call and echoes the
// member back as its token — the same mock the React suite uses, plus the
// record that stands in for the React suite's UI-component mocks.
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
        const fn = (...args: unknown[]): string => {
          classCalls.push({ token, args })
          return token
        }
        return new Proxy(fn, {
          get(_target, key) {
            if (key === Symbol.toPrimitive || key === 'toString') return () => token
            return undefined
          },
        })
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import AuthorBioCard from '../AuthorBioCard.svelte'
import type { AuthorBioCardProps } from '../props.js'
import { resolveSocialHref } from '../social.js'

/** The most recent recorded call for one ClassMap member. */
const lastCall = (token: string): { token: string; args: unknown[] } | undefined =>
  [...classCalls].reverse().find((call) => call.token === token)

/** A mounted card: the exports handle `mount` returns, and the element it rendered into. */
interface Mounted {
  component: ReturnType<typeof mount>
  target: HTMLElement
}

const mounted: Mounted[] = []

beforeEach(() => {
  classCalls.length = 0
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const { component, target } of mounted.splice(0)) {
    void unmount(component)
    target.remove()
  }
  document.body.innerHTML = ''
})

/** Mounts an {@link AuthorBioCard} with the given props and remembers it for teardown. */
const mountCard = (props: AuthorBioCardProps) => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(AuthorBioCard, { target, props })
  const entry = { component, target }
  mounted.push(entry)
  return entry
}

/** Clicks an element the way a user would. */
const click = (el: Element | null): void => {
  if (!el) throw new Error('no element to click')
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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
      const { target } = mountCard({ author: baseAuthor })
      const avatar = target.querySelector('img')
      expect(avatar?.getAttribute('alt')).toBe('Alice Example')
      expect(avatar?.getAttribute('src')).toBe('https://example.com/alice.png')
      expect(lastCall('avatar')?.args[0]).toMatchObject({ size: 'md' })
    })

    it('renders the name as a span when no href is provided', () => {
      const { target } = mountCard({ author: baseAuthor })
      const nameEl = target.querySelector('[data-mol-id="author-bio-card-name"]')
      expect(nameEl?.tagName).toBe('SPAN')
      expect(nameEl?.textContent).toBe('Alice Example')
    })

    it('renders the name as a link when href is provided', () => {
      const { target } = mountCard({ author: { ...baseAuthor, href: '/authors/alice' } })
      const nameEl = target.querySelector('[data-mol-id="author-bio-card-name"]')
      expect(nameEl?.tagName).toBe('A')
      expect(nameEl?.getAttribute('href')).toBe('/authors/alice')
    })

    it('renders the bio paragraph', () => {
      const { target } = mountCard({ author: baseAuthor })
      const bio = target.querySelector('[data-mol-id="author-bio-card-bio"]')
      expect(bio?.textContent).toBe('Writes about distributed systems.')
    })

    it('omits the bio paragraph when bio is empty', () => {
      const { target } = mountCard({ author: { ...baseAuthor, bio: undefined } })
      expect(target.querySelector('[data-mol-id="author-bio-card-bio"]')).toBeNull()
    })

    it('hides the follow button when onFollow is omitted', () => {
      const { target } = mountCard({ author: baseAuthor })
      expect(target.querySelector('[data-mol-id="author-bio-card-follow"]')).toBeNull()
    })

    it('renders a Follow button that toggles to the new state on click', () => {
      const onFollow = vi.fn()
      const { target } = mountCard({ author: baseAuthor, onFollow })
      const btn = target.querySelector('[data-mol-id="author-bio-card-follow"]')
      expect(btn?.textContent?.trim()).toBe('Follow')
      expect(btn?.getAttribute('aria-pressed')).toBe('false')
      expect(lastCall('button')?.args[0]).toMatchObject({ variant: 'solid' })
      click(btn)
      expect(onFollow).toHaveBeenCalledWith(true)
    })

    it('renders a Following button when following=true', () => {
      const onFollow = vi.fn()
      const { target } = mountCard({ author: baseAuthor, onFollow, following: true })
      const btn = target.querySelector('[data-mol-id="author-bio-card-follow"]')
      expect(btn?.textContent?.trim()).toBe('Following')
      expect(btn?.getAttribute('aria-pressed')).toBe('true')
      expect(lastCall('button')?.args[0]).toMatchObject({ variant: 'outline' })
      click(btn)
      expect(onFollow).toHaveBeenCalledWith(false)
    })

    it('omits the social row when no socials are provided', () => {
      const { target } = mountCard({ author: baseAuthor })
      expect(target.querySelector('[data-mol-id="author-bio-card-socials"]')).toBeNull()
    })

    it('renders only the social platforms that have values', () => {
      const { target } = mountCard({
        author: { ...baseAuthor, socials: { twitter: 'alice', github: 'alice-gh' } },
      })
      expect(target.querySelector('[data-mol-id="author-bio-card-social-twitter"]')).not.toBeNull()
      expect(target.querySelector('[data-mol-id="author-bio-card-social-github"]')).not.toBeNull()
      expect(target.querySelector('[data-mol-id="author-bio-card-social-linkedin"]')).toBeNull()
    })

    it('attaches an accessible label to each social link', () => {
      const { target } = mountCard({ author: { ...baseAuthor, socials: { twitter: 'alice' } } })
      const link = target.querySelector('[data-mol-id="author-bio-card-social-twitter"]')
      expect(link?.getAttribute('aria-label')).toBe('Alice Example on Twitter')
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
      expect(link?.getAttribute('target')).toBe('_blank')
    })

    it('routes every social label and aria-label through its literal translation key', () => {
      setProvider({
        ...createSimpleI18nProvider('en'),
        t: (key: string) => `@@${key}@@`,
      })
      const { target } = mountCard({
        author: {
          ...baseAuthor,
          socials: {
            twitter: 'alice',
            github: 'alice-gh',
            linkedin: 'alice',
            mastodon: '@alice@hachyderm.io',
            website: 'alice.example',
          },
        },
      })
      for (const key of ['twitter', 'github', 'linkedin', 'mastodon', 'website']) {
        const link = target.querySelector(`[data-mol-id="author-bio-card-social-${key}"]`)
        expect(link?.textContent).toBe(`@@authorBioCard.social.${key}.label@@`)
        expect(link?.getAttribute('aria-label')).toBe(`@@authorBioCard.social.${key}@@`)
      }
    })

    it('honors a custom dataMolId for the wrapping card and child selectors', () => {
      const { target } = mountCard({
        author: { ...baseAuthor, socials: { twitter: 'alice' } },
        onFollow: () => {},
        dataMolId: 'custom-author',
      })
      expect(target.querySelector('[data-mol-id="custom-author"]')).not.toBeNull()
      expect(target.querySelector('[data-mol-id="custom-author-name"]')).not.toBeNull()
      expect(target.querySelector('[data-mol-id="custom-author-social-twitter"]')).not.toBeNull()
      expect(target.querySelector('[data-mol-id="custom-author-follow"]')).not.toBeNull()
    })

    it('uses an avatar fallback (initials) when no avatar URL is provided', () => {
      const { target } = mountCard({ author: { ...baseAuthor, avatar: undefined } })
      expect(target.querySelector('img')).toBeNull()
      expect(target.textContent).toContain('AE')
    })
  })

  describe('full layout', () => {
    it('renders a larger avatar', () => {
      mountCard({ author: baseAuthor, layout: 'full' })
      expect(lastCall('avatar')?.args[0]).toMatchObject({ size: 'lg' })
    })

    it('still renders bio + socials + follow button', () => {
      const { target } = mountCard({
        author: { ...baseAuthor, socials: { website: 'alice.example' } },
        layout: 'full',
        onFollow: () => {},
      })
      expect(target.querySelector('[data-mol-id="author-bio-card-bio"]')).not.toBeNull()
      expect(target.querySelector('[data-mol-id="author-bio-card-social-website"]')).not.toBeNull()
      expect(target.querySelector('[data-mol-id="author-bio-card-follow"]')).not.toBeNull()
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
