/**
 * `@molecule/app-author-bio-card-react` cases: the author bio card in both
 * layouts, the name as text or a link, the bio paragraph, the social row, the
 * follow button, and the `resolveSocialHref` utility.
 *
 * `AuthorBioCard` is the package's only component export; `resolveSocialHref`
 * is its only other runtime export.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** An author with a link, a bio and every social platform. */
const fullAuthor = {
  id: 'alice',
  name: 'Alice Example',
  avatar: 'https://example.com/alice.png',
  bio: 'Writes about distributed systems and tea.',
  href: '/authors/alice',
  socials: {
    twitter: 'alice',
    github: 'alice-gh',
    linkedin: 'alice',
    mastodon: '@alice@hachyderm.io',
    website: 'alice.example',
  },
}

/** The author the compact layout renders by default. */
const baseAuthor = {
  id: 'alice',
  name: 'Alice Example',
  avatar: 'https://example.com/alice.png',
  bio: 'Writes about distributed systems.',
}

/** `@molecule/app-author-bio-card-react`. */
export const authorBioCardFeature: FeatureCases = {
  package: '@molecule/app-author-bio-card-react',
  families: [
    {
      component: 'AuthorBioCard',
      cases: [
        // The family's first case also derives the locale-switch case, so it
        // carries the translated Follow label.
        {
          name: 'compact defaults with the follow button',
          props: { author: baseAuthor },
          callbacks: ['onFollow'],
        },
        {
          name: 'full layout with a linked name, bio, every social and following',
          props: { author: fullAuthor, layout: 'full', following: true },
          callbacks: ['onFollow'],
        },
        {
          name: 'full layout without a bio, socials or follow handler',
          props: { author: { id: 'bob', name: 'Bob Minimal' }, layout: 'full' },
        },
        {
          name: 'full layout with socials but no follow handler',
          props: {
            author: { ...baseAuthor, socials: { website: 'alice.example' } },
            layout: 'full',
          },
        },
        {
          name: 'compact without avatar, bio, socials or follow handler',
          props: { author: { id: 'bob', name: 'Bob Minimal' } },
        },
        {
          name: 'compact with a linked name and partial socials',
          props: {
            author: {
              ...baseAuthor,
              href: '/authors/alice',
              socials: { twitter: '@alice', github: 'alice-gh' },
            },
          },
        },
        {
          name: 'empty socials render no social row',
          props: { author: { ...baseAuthor, socials: {} } },
        },
        {
          name: 'an empty bio string omits the bio paragraph',
          props: { author: { ...baseAuthor, bio: '' } },
        },
        {
          name: 'custom className and dataMolId reach every child selector',
          props: {
            author: { ...baseAuthor, socials: { twitter: 'alice' } },
            className: 'parity-token',
            dataMolId: 'custom-author',
          },
          callbacks: ['onFollow'],
        },
        {
          name: 'clicking the follow button follows the author',
          props: { author: baseAuthor },
          callbacks: ['onFollow'],
          interactions: [{ type: 'click', selector: '[data-mol-id="author-bio-card-follow"]' }],
        },
        {
          name: 'clicking the button while following unfollows the author',
          props: { author: baseAuthor, following: true },
          callbacks: ['onFollow'],
          interactions: [{ type: 'click', selector: '[data-mol-id="author-bio-card-follow"]' }],
        },
        {
          name: 'every follow click reports the state after the toggle',
          props: { author: baseAuthor },
          callbacks: ['onFollow'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="author-bio-card-follow"]' },
            { type: 'props', props: { following: true } },
            { type: 'click', selector: '[data-mol-id="author-bio-card-follow"]' },
          ],
        },
        {
          name: 'following changes after mount',
          props: { author: baseAuthor },
          callbacks: ['onFollow'],
          interactions: [
            { type: 'props', props: { following: true } },
            { type: 'props', props: { following: false } },
          ],
        },
        {
          name: 'the author and layout change after mount',
          props: { author: baseAuthor },
          interactions: [
            {
              type: 'props',
              props: {
                author: { ...baseAuthor, href: '/authors/alice', bio: 'A new bio.' },
                layout: 'full',
              },
            },
            { type: 'props', props: { layout: 'compact' } },
          ],
        },
        {
          name: 'the socials and the follow handler arrive after mount',
          props: { author: { id: 'alice', name: 'Alice Example' } },
          callbacks: ['onFollow'],
          interactions: [
            {
              type: 'props',
              props: { author: { ...baseAuthor, socials: { github: 'alice-gh' } } },
            },
            { type: 'click', selector: '[data-mol-id="author-bio-card-follow"]' },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'resolveSocialHref',
      calls: [
        // Full URLs pass through unchanged.
        ['twitter', 'https://twitter.com/alice'],
        ['github', 'https://github.com/alice'],
        ['website', 'https://alice.example'],
        ['website', 'http://alice.example'],
        // Bare handles route to their platform.
        ['twitter', 'alice'],
        ['twitter', '@alice'],
        ['github', 'alice'],
        ['github', '@alice'],
        ['linkedin', 'alice'],
        // Mastodon handles parse the instance, and fall back to mastodon.social.
        ['mastodon', '@alice@hachyderm.io'],
        ['mastodon', 'alice'],
        // Websites get an https:// scheme and lose their leading slashes.
        ['website', 'alice.example'],
        ['website', '/alice.example'],
        // Surrounding whitespace is trimmed first.
        ['twitter', '  alice  '],
      ],
    },
  ],
}
