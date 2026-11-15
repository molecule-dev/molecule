/**
 * `@molecule/app-social-share-buttons-react` cases: the Twitter(X)/LinkedIn/
 * Facebook/Reddit/email/copy share button row.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const ALL_PLATFORMS = ['twitter', 'x', 'linkedin', 'facebook', 'reddit', 'email', 'copy']

/** `@molecule/app-social-share-buttons-react`. */
export const socialShareButtonsFeature: FeatureCases = {
  package: '@molecule/app-social-share-buttons-react',
  families: [
    {
      component: 'SocialShareButtons',
      cases: [
        // The default platform list: twitter, linkedin, facebook, copy.
        { name: 'default platforms', props: { url: 'https://example.com/blog/my-post' } },
        // Every platform variant in one row, with a url and title that need encoding.
        {
          name: 'all platforms with an encoded url and title',
          props: {
            url: 'https://example.com/a b?x=1&y=2',
            title: 'Read this & that',
            platforms: ALL_PLATFORMS,
          },
        },
        // A subset in a caller-chosen order: reddit and email only.
        {
          name: 'platform subset in a custom order',
          props: { url: 'https://x.test/post', platforms: ['reddit', 'email'] },
        },
        // The always-present copy platform on its own.
        { name: 'copy only', props: { url: 'https://x.test/post', platforms: ['copy'] } },
        // The md size and a caller className beside the ClassMap tokens.
        {
          name: 'md size and className',
          props: {
            url: 'https://x.test/post',
            title: 'A title',
            size: 'md',
            className: 'parity-token',
          },
        },
        // An empty list still renders the wrapper row.
        { name: 'no platforms', props: { url: 'https://x.test/post', platforms: [] } },
        // A later prop change replaces the platform list.
        {
          name: 'platforms change',
          props: { url: 'https://x.test/post', platforms: ['twitter'] },
          interactions: [{ type: 'props', props: { platforms: ['reddit', 'copy'] } }],
        },
        // A later prop change updates the url, title and size.
        {
          name: 'url, title and size change',
          props: { url: 'https://x.test/one', title: 'One' },
          interactions: [
            { type: 'props', props: { url: 'https://x.test/two', title: 'Two', size: 'md' } },
          ],
        },
        // The copy button's click handler (clipboard is absent in jsdom, so it
        // does nothing, exactly as React's documented fallback).
        {
          name: 'copy click',
          props: { url: 'https://x.test/post', platforms: ['copy'] },
          fakeTimers: true,
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'advance', ms: 1500 },
          ],
        },
        // Clicking a share link keeps the browser default (it opens a new tab).
        {
          name: 'share link click',
          props: { url: 'https://x.test/post', platforms: ['twitter', 'copy'] },
          interactions: [{ type: 'click', selector: 'a' }],
        },
      ],
    },
  ],
}
