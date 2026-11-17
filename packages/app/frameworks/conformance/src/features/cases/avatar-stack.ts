/**
 * `@molecule/app-avatar-stack-react` cases: the overlapping avatar row and the
 * user chip.
 *
 * `AvatarStack` has no callback props — every branch is chosen by props alone
 * (`people`, `max`, `size`, `className`), so the interactions below change
 * props. `UserChip` adds the node-valued `subtitle` and `trailing` slots,
 * a canonical profile link, and forwarded root/link attributes and events.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const people = [
  { name: 'Alice Kim', src: '/avatars/alice.jpg' },
  { name: 'Bob Lee' },
  { name: 'Carol Díaz', src: '/avatars/carol.jpg', alt: 'Carol at the desk' },
  { name: 'Dave Okafor' },
  { name: 'Eve Novak' },
  { name: 'Frank Moore', src: '/avatars/frank.jpg' },
]

const twoPeople = people.slice(0, 2)
const threePeople = people.slice(0, 3)

/** `@molecule/app-avatar-stack-react`. */
export const avatarStackFeature: FeatureCases = {
  package: '@molecule/app-avatar-stack-react',
  families: [
    {
      component: 'AvatarStack',
      cases: [
        { name: 'three people with the default max and size', props: { people: threePeople } },
        {
          name: 'caps visible avatars at max and summarises the rest',
          props: { people, max: 4 },
        },
        {
          name: 'max larger than the list adds no overflow chip',
          props: { people: twoPeople, max: 6 },
        },
        { name: 'two people', props: { people: twoPeople } },
        { name: 'single person has no overlap', props: { people: [people[0]!] } },
        { name: 'empty list', props: { people: [] } },
        { name: 'max zero summarises everyone', props: { people: twoPeople, max: 0 } },
        { name: 'overflow of one', props: { people: threePeople, max: 2 } },
        { name: 'size xs', props: { people: twoPeople, size: 'xs' } },
        { name: 'size sm', props: { people: twoPeople, size: 'sm' } },
        { name: 'size md', props: { people: twoPeople, size: 'md' } },
        { name: 'size lg', props: { people: twoPeople, size: 'lg' } },
        { name: 'alt falls back to the name', props: { people: [{ name: 'Grace Hopper' }] } },
        {
          name: 'explicit alt overrides the name',
          props: { people: [{ name: 'Grace Hopper', src: '/g.png', alt: 'Grace at the console' }] },
        },
        {
          name: 'empty alt falls back to the name',
          props: { people: [{ name: 'Grace Hopper', src: '/g.png', alt: '' }] },
        },
        { name: 'empty name renders the user glyph', props: { people: [{ name: '' }] } },
        {
          name: 'names with several words use initials',
          props: { people: [{ name: 'Mary Jane Watson Parker' }, { name: 'Ada' }] },
        },
        { name: 'className passthrough', props: { people: twoPeople, className: 'parity-token' } },
        {
          name: 'max changes',
          props: { people, max: 4 },
          interactions: [{ type: 'props', props: { max: 2 } }],
        },
        {
          name: 'size changes',
          props: { people: twoPeople, size: 'sm' },
          interactions: [{ type: 'props', props: { size: 'lg' } }],
        },
        {
          name: 'people change',
          props: { people: threePeople },
          interactions: [{ type: 'props', props: { people: [people[3]!, people[4]!] } }],
        },
        {
          name: 'overflow chip disappears',
          props: { people, max: 4 },
          interactions: [{ type: 'props', props: { people: twoPeople } }],
        },
        {
          name: 'className removed',
          props: { people: twoPeople, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
    },
    {
      component: 'UserChip',
      cases: [
        { name: 'name only', props: { name: 'Alice Kim' } },
        { name: 'name and avatar source', props: { name: 'Alice Kim', src: '/avatars/alice.jpg' } },
        {
          name: 'href links only the displayed name',
          props: { name: 'Alice Kim', src: '/avatars/alice.jpg', href: '/people/alice' },
        },
        {
          name: 'href forwards name link attributes and click',
          props: {
            name: 'Alice Kim',
            href: '/people/alice',
            id: 'identity-row',
            'data-person': 'alice',
            nameLinkProps: {
              className: 'parity-token',
              target: '_blank',
              rel: 'noopener noreferrer',
              title: 'View profile',
              tabIndex: 0,
              'data-profile': 'alice',
              onClick: { $callback: 'nameLinkClick' },
            },
          },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'a[data-mol-id="user-chip-profile"]' }],
        },
        {
          name: 'href keeps subtitle and trailing content outside the name link',
          props: { name: 'Alice Kim', src: '/avatars/alice.jpg', href: '/people/alice' },
          slots: {
            subtitle: [{ tag: 'strong', children: ['Owner'] }],
            trailing: [{ tag: 'button', attrs: { type: 'button' }, children: ['Assign'] }],
          },
        },
        {
          name: 'unlinked chip forwards root attributes and click',
          props: {
            name: 'Alice Kim',
            id: 'identity-row',
            title: 'Assignment',
            'data-person': 'alice',
            'aria-label': 'Assigned person',
            tabIndex: 0,
          },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: '#identity-row' }],
        },
        {
          name: 'href added and removed at runtime',
          props: { name: 'Alice Kim', href: undefined },
          interactions: [
            { type: 'props', props: { href: '/people/alice' } },
            { type: 'props', props: { href: undefined } },
          ],
        },
        {
          name: 'href changes including an empty destination',
          props: { name: 'Alice Kim', href: '/people/alice' },
          interactions: [
            { type: 'props', props: { href: '' } },
            { type: 'props', props: { href: '/crew/alice' } },
          ],
        },
        {
          name: 'name link attributes and listeners change and are removed',
          props: {
            name: 'Alice Kim',
            href: '/people/alice',
            nameLinkProps: {
              className: 'parity-token',
              target: '_blank',
              rel: 'noreferrer',
              'data-mol-id': undefined,
              'aria-current': false,
              onClick: { $callback: 'firstNameClick' },
            },
          },
          interactions: [
            { type: 'click', selector: 'a' },
            {
              type: 'props',
              props: {
                nameLinkProps: {
                  className: 'parity-next',
                  title: 'Updated profile',
                  onClick: { $callback: 'nextNameClick' },
                },
              },
            },
            { type: 'click', selector: 'a' },
            { type: 'props', props: { nameLinkProps: undefined } },
            { type: 'click', selector: 'a' },
          ],
        },
        {
          name: 'name link attributes are ignored without href',
          props: {
            name: 'Alice Kim',
            nameLinkProps: { className: 'parity-token', target: '_blank', title: 'View profile' },
          },
        },
        {
          name: 'subtitle',
          props: { name: 'Alice Kim' },
          slots: { subtitle: ['Admin'] },
        },
        {
          name: 'trailing content',
          props: { name: 'Alice Kim' },
          slots: { trailing: [{ tag: 'button', attrs: { type: 'button' }, children: ['Remove'] }] },
        },
        {
          name: 'subtitle and trailing content',
          props: { name: 'Alice Kim', src: '/avatars/alice.jpg' },
          slots: {
            subtitle: [{ tag: 'strong', children: ['Owner'] }],
            trailing: [{ tag: 'span', attrs: { 'data-status': 'online' }, children: ['Online'] }],
          },
        },
        { name: 'size xs', props: { name: 'Alice Kim', size: 'xs' } },
        { name: 'size md', props: { name: 'Alice Kim', size: 'md' } },
        { name: 'size lg', props: { name: 'Alice Kim', size: 'lg' } },
        { name: 'initials fallback for a long name', props: { name: 'Carol Díaz' } },
        { name: 'className passthrough', props: { name: 'Alice Kim', className: 'parity-token' } },
        {
          name: 'image error falls back to initials',
          props: { name: 'Alice Kim', src: '/avatars/broken.jpg' },
          interactions: [{ type: 'event', selector: 'img', event: 'error' }],
        },
        {
          name: 'an image error keeps the fallback after a new source',
          props: { name: 'Alice Kim', src: '/avatars/broken.jpg' },
          interactions: [
            { type: 'event', selector: 'img', event: 'error' },
            { type: 'props', props: { src: '/avatars/alice.jpg' } },
          ],
        },
        {
          name: 'name changes',
          props: { name: 'Alice Kim' },
          interactions: [{ type: 'props', props: { name: 'Bob Lee' } }],
        },
        {
          name: 'size changes',
          props: { name: 'Alice Kim', size: 'sm' },
          interactions: [{ type: 'props', props: { size: 'xs' } }],
        },
        {
          name: 'source added at runtime',
          props: { name: 'Alice Kim' },
          interactions: [{ type: 'props', props: { src: '/avatars/alice.jpg' } }],
        },
        {
          name: 'source removed',
          props: { name: 'Alice Kim', src: '/avatars/alice.jpg' },
          interactions: [{ type: 'props', props: { src: undefined } }],
        },
        {
          name: 'className removed',
          props: { name: 'Alice Kim', className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
    },
  ],
}
