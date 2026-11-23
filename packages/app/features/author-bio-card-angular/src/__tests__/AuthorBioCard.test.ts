// @vitest-environment jsdom

/**
 * Unit tests of `AuthorBioCard` — the port of
 * `@molecule/app-author-bio-card-react`'s own suite: the same test names and
 * the same behavioral assertions. Like the React suite, it mocks the ClassMap
 * and the UI components (Avatar, Button) so the props the card passes them are
 * observable, and mounts through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses).
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React suite uses.
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

// The UI markers the React suite mocks `@molecule/app-ui-react` with: an Avatar
// carrying the src/name/size it received, and a Button carrying its variant and
// its pass-through attributes.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  const MockAvatar = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-avatar]',
    standalone: true,
    inputs: ['src', 'alt', 'name', 'size', 'rounded', 'className', 'style', 'testId'],
    host: {
      'data-testid': 'avatar',
      '[attr.data-name]': 'name',
      '[attr.data-src]': 'src',
      '[attr.data-size]': 'size',
    },
    template: '',
  })(
    class MockAvatarClass {
      /** Image source. */
      src?: string
      /** Image alt text. */
      alt?: string
      /** Display name. */
      name?: string
      /** Size preset. */
      size?: string
      /** Rounded corners. */
      rounded?: boolean
      /** Extra classes. */
      className?: string
      /** Inline style. */
      style?: Record<string, unknown>
      /** `data-testid`. */
      testId?: string
    },
  )
  const MockButton = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'button[mol-button]',
    standalone: true,
    inputs: [
      'variant',
      'color',
      'size',
      'loading',
      'loadingText',
      'fullWidth',
      'className',
      'style',
      'testId',
      'disabled',
      'type',
    ],
    host: {
      'data-testid': 'follow-btn',
      '[attr.data-variant]': 'variant',
      type: 'button',
    },
    template: `<ng-content></ng-content>`,
  })(
    class MockButtonClass {
      /** Visual variant. */
      variant?: string
      /** Color scheme. */
      color?: string
      /** Button size. */
      size?: string
      /** Loading state. */
      loading?: boolean
      /** Text while loading. */
      loadingText?: string
      /** Whether the button fills its row. */
      fullWidth?: boolean
      /** Extra classes. */
      className?: string
      /** Inline style. */
      style?: Record<string, unknown>
      /** `data-testid`. */
      testId?: string
      /** Whether the button is disabled. */
      disabled?: boolean
      /** The button's `type` attribute. */
      type: 'button' | 'submit' | 'reset' = 'button'
    },
  )
  return { Avatar: MockAvatar, Button: MockButton }
})

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { AuthorBioCard, resolveSocialHref } = await import('../author-bio-card.component.js')

/** The host template: every input bound from `p`. */
const TEMPLATE = `<div mol-author-bio-card [author]="p['author']" [layout]="p['layout']" [following]="p['following']" [onFollow]="p['onFollow']" [className]="p['className']" [dataMolId]="p['dataMolId']"></div>`

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a
  // translation override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** Mounts an {@link AuthorBioCard} with the given props and remembers it for teardown. */
const mountCard = async (
  props: Record<string, unknown>,
  provider: ReturnType<typeof createSimpleI18nProvider> = createSimpleI18nProvider('en'),
): Promise<Mounted> => {
  setProvider(provider)
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [AuthorBioCard],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const entry: Mounted = {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
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
    it('renders the avatar with the author name', async () => {
      const { host } = await mountCard({ author: baseAuthor })
      const avatar = host.querySelector('[data-testid="avatar"]')
      expect(avatar?.getAttribute('data-name')).toBe('Alice Example')
      expect(avatar?.getAttribute('data-src')).toBe('https://example.com/alice.png')
      expect(avatar?.getAttribute('data-size')).toBe('md')
    })

    it('renders the name as a span when no href is provided', async () => {
      const { host } = await mountCard({ author: baseAuthor })
      const nameEl = host.querySelector('[data-mol-id="author-bio-card-name"]')
      expect(nameEl?.tagName).toBe('SPAN')
      expect(nameEl?.textContent).toBe('Alice Example')
    })

    it('renders the name as a link when href is provided', async () => {
      const { host } = await mountCard({ author: { ...baseAuthor, href: '/authors/alice' } })
      const nameEl = host.querySelector('[data-mol-id="author-bio-card-name"]')
      expect(nameEl?.tagName).toBe('A')
      expect(nameEl?.getAttribute('href')).toBe('/authors/alice')
    })

    it('renders the bio paragraph', async () => {
      const { host } = await mountCard({ author: baseAuthor })
      const bio = host.querySelector('[data-mol-id="author-bio-card-bio"]')
      expect(bio?.textContent).toBe('Writes about distributed systems.')
    })

    it('omits the bio paragraph when bio is empty', async () => {
      const { host } = await mountCard({ author: { ...baseAuthor, bio: undefined } })
      expect(host.querySelector('[data-mol-id="author-bio-card-bio"]')).toBeNull()
    })

    it('hides the follow button when onFollow is omitted', async () => {
      const { host } = await mountCard({ author: baseAuthor })
      expect(host.querySelector('[data-testid="follow-btn"]')).toBeNull()
    })

    it('renders a Follow button that toggles to the new state on click', async () => {
      const onFollow = vi.fn()
      const { host } = await mountCard({ author: baseAuthor, onFollow })
      const btn = host.querySelector('[data-testid="follow-btn"]')
      expect(btn?.textContent).toBe('Follow')
      expect(btn?.getAttribute('aria-pressed')).toBe('false')
      expect(btn?.getAttribute('data-variant')).toBe('solid')
      click(btn)
      expect(onFollow).toHaveBeenCalledWith(true)
    })

    it('renders a Following button when following=true', async () => {
      const onFollow = vi.fn()
      const { host } = await mountCard({ author: baseAuthor, onFollow, following: true })
      const btn = host.querySelector('[data-testid="follow-btn"]')
      expect(btn?.textContent).toBe('Following')
      expect(btn?.getAttribute('aria-pressed')).toBe('true')
      expect(btn?.getAttribute('data-variant')).toBe('outline')
      click(btn)
      expect(onFollow).toHaveBeenCalledWith(false)
    })

    it('omits the social row when no socials are provided', async () => {
      const { host } = await mountCard({ author: baseAuthor })
      expect(host.querySelector('[data-mol-id="author-bio-card-socials"]')).toBeNull()
    })

    it('renders only the social platforms that have values', async () => {
      const { host } = await mountCard({
        author: { ...baseAuthor, socials: { twitter: 'alice', github: 'alice-gh' } },
      })
      expect(host.querySelector('[data-mol-id="author-bio-card-social-twitter"]')).not.toBeNull()
      expect(host.querySelector('[data-mol-id="author-bio-card-social-github"]')).not.toBeNull()
      expect(host.querySelector('[data-mol-id="author-bio-card-social-linkedin"]')).toBeNull()
    })

    it('attaches an accessible label to each social link', async () => {
      const { host } = await mountCard({
        author: { ...baseAuthor, socials: { twitter: 'alice' } },
      })
      const link = host.querySelector('[data-mol-id="author-bio-card-social-twitter"]')
      expect(link?.getAttribute('aria-label')).toBe('Alice Example on Twitter')
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
      expect(link?.getAttribute('target')).toBe('_blank')
    })

    it('routes every social label and aria-label through its literal translation key', async () => {
      const markerProvider = {
        ...createSimpleI18nProvider('en'),
        t: (key: string) => `@@${key}@@`,
      }
      const { host } = await mountCard(
        {
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
        },
        markerProvider,
      )
      for (const key of ['twitter', 'github', 'linkedin', 'mastodon', 'website']) {
        const link = host.querySelector(`[data-mol-id="author-bio-card-social-${key}"]`)
        expect(link?.textContent).toBe(`@@authorBioCard.social.${key}.label@@`)
        expect(link?.getAttribute('aria-label')).toBe(`@@authorBioCard.social.${key}@@`)
      }
    })

    it('honors a custom dataMolId for the wrapping card and child selectors', async () => {
      const { host } = await mountCard({
        author: { ...baseAuthor, socials: { twitter: 'alice' } },
        onFollow: () => {},
        dataMolId: 'custom-author',
      })
      expect(host.querySelector('[data-mol-id="custom-author"]')).not.toBeNull()
      expect(host.querySelector('[data-mol-id="custom-author-name"]')).not.toBeNull()
      expect(host.querySelector('[data-mol-id="custom-author-social-twitter"]')).not.toBeNull()
      expect(host.querySelector('[data-mol-id="custom-author-follow"]')).not.toBeNull()
    })

    it('uses an avatar fallback (initials) when no avatar URL is provided', async () => {
      const { host } = await mountCard({ author: { ...baseAuthor, avatar: undefined } })
      const avatar = host.querySelector('[data-testid="avatar"]')
      expect(avatar?.getAttribute('data-src')).toBeNull()
      expect(avatar?.getAttribute('data-name')).toBe('Alice Example')
    })
  })

  describe('full layout', () => {
    it('renders a larger avatar', async () => {
      const { host } = await mountCard({ author: baseAuthor, layout: 'full' })
      expect(host.querySelector('[data-testid="avatar"]')?.getAttribute('data-size')).toBe('lg')
    })

    it('still renders bio + socials + follow button', async () => {
      const { host } = await mountCard({
        author: { ...baseAuthor, socials: { website: 'alice.example' } },
        layout: 'full',
        onFollow: () => {},
      })
      expect(host.querySelector('[data-mol-id="author-bio-card-bio"]')).not.toBeNull()
      expect(host.querySelector('[data-mol-id="author-bio-card-social-website"]')).not.toBeNull()
      expect(host.querySelector('[data-testid="follow-btn"]')).not.toBeNull()
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
