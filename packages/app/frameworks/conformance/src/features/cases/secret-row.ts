/**
 * `@molecule/app-secret-row-react` cases: the vault-style secret row — the
 * key + description, the masked value with its Show / Hide and Copy buttons,
 * the version chip, the rotation status (Expired / Rotate in {n}d / Last
 * rotated) and the optional Rotate / Delete buttons.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The plain secret every optional-branch case starts from. */
const base = {
  id: 'sk-1',
  key: 'STRIPE_SECRET_KEY',
  value: 'example_abcdef123456',
}

/** `@molecule/app-secret-row-react`. */
export const secretRowFeature: FeatureCases = {
  package: '@molecule/app-secret-row-react',
  families: [
    {
      component: 'SecretRow',
      cases: [
        { name: 'key, value and the default mask', props: { secret: { ...base } } },
        {
          name: 'description text',
          props: { secret: { ...base, description: 'Stripe API key' } },
        },
        {
          name: 'description as a node',
          props: {
            secret: {
              ...base,
              description: { $nodes: [{ tag: 'em', children: ['Stripe key'] }] },
            },
          },
        },
        {
          name: 'an empty description renders no span',
          props: { secret: { ...base, description: '' } },
        },
        {
          name: 'version number',
          props: { secret: { ...base, version: 3 } },
        },
        {
          name: 'version string',
          props: { secret: { ...base, version: '2' } },
        },
        {
          name: 'version as a node',
          props: {
            secret: {
              ...base,
              version: { $nodes: [{ tag: 'strong', children: ['4'] }] },
            },
          },
        },
        {
          name: 'a zero version renders no chip',
          props: { secret: { ...base, version: 0 } },
        },
        {
          name: 'an empty version renders no chip',
          props: { secret: { ...base, version: '' } },
        },
        {
          name: 'expired badge',
          props: { secret: { ...base, daysUntilRotation: -2 } },
        },
        {
          name: 'expired on the last negative day',
          props: { secret: { ...base, daysUntilRotation: -1 } },
        },
        {
          name: 'rotation countdown',
          props: { secret: { ...base, daysUntilRotation: 14 } },
        },
        {
          name: 'rotation due today',
          props: { secret: { ...base, daysUntilRotation: 0 } },
        },
        {
          name: 'last rotated note',
          props: { secret: { ...base, lastRotatedAt: '2026-01-02' } },
        },
        {
          name: 'last rotated as a node',
          props: {
            secret: {
              ...base,
              lastRotatedAt: {
                $nodes: [
                  { tag: 'time', attrs: { 'data-date': '2026-01-02' }, children: ['Jan 2'] },
                ],
              },
            },
          },
        },
        {
          name: 'a null last rotated renders no note',
          props: { secret: { ...base, lastRotatedAt: null } },
        },
        {
          name: 'an empty value masks eight characters',
          props: { secret: { ...base, value: '' } },
        },
        {
          name: 'a long value caps the mask at 24 characters',
          props: { secret: { ...base, value: 'x'.repeat(30) } },
        },
        {
          name: 'a custom mask character',
          props: { secret: { ...base }, maskChar: '*' },
        },
        {
          name: 'a two-character mask',
          props: { secret: { ...base }, maskChar: 'ab' },
        },
        {
          name: 'an empty mask character renders an empty code',
          props: { secret: { ...base }, maskChar: '' },
        },
        {
          name: 'className passthrough',
          props: { secret: { ...base }, className: 'parity-token' },
        },
        {
          name: 'every optional field at once',
          props: {
            secret: {
              ...base,
              description: 'Stripe API key',
              version: 3,
              daysUntilRotation: 30,
              lastRotatedAt: '2026-01-02',
            },
            className: 'parity-token',
          },
        },
        {
          name: 'show reveals the value and hides it again',
          props: { secret: { ...base } },
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(1)' },
            { type: 'click', selector: 'button:nth-of-type(1)' },
          ],
        },
        {
          name: 'revealed state survives a secret change',
          props: { secret: { ...base } },
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(1)' },
            {
              type: 'props',
              props: { secret: { ...base, value: 'example_rotated' } },
            },
          ],
        },
        {
          name: 'the reveal follows a mask character change',
          props: { secret: { ...base } },
          interactions: [
            { type: 'props', props: { maskChar: '#' } },
            { type: 'click', selector: 'button:nth-of-type(1)' },
          ],
        },
        {
          name: 'the copy click leaves the label unchanged without a clipboard',
          props: { secret: { ...base } },
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(2)' },
            { type: 'click', selector: 'button:nth-of-type(2)' },
          ],
        },
        {
          name: 'rotate and delete buttons render with their handlers',
          props: { secret: { ...base } },
          callbacks: ['onRotate', 'onDelete'],
        },
        {
          name: 'rotate calls onRotate with the secret',
          props: { secret: { ...base } },
          callbacks: ['onRotate', 'onDelete'],
          interactions: [{ type: 'click', selector: 'button:nth-of-type(3)' }],
        },
        {
          name: 'delete calls onDelete with the secret',
          props: { secret: { ...base } },
          callbacks: ['onRotate', 'onDelete'],
          interactions: [{ type: 'click', selector: 'button:nth-of-type(4)' }],
        },
        {
          name: 'rotate only, without delete',
          props: { secret: { ...base } },
          callbacks: ['onRotate'],
        },
        {
          name: 'delete only, without rotate',
          props: { secret: { ...base } },
          callbacks: ['onDelete'],
        },
        {
          name: 'the secret is replaced on a props change',
          props: {
            secret: {
              ...base,
              description: 'Old key',
              version: 1,
              daysUntilRotation: 12,
              lastRotatedAt: '2025-12-01',
            },
          },
          interactions: [
            {
              type: 'props',
              props: {
                secret: {
                  ...base,
                  key: 'GITHUB_TOKEN',
                  value: 'ghp_rotated',
                  description: 'New key',
                  version: 2,
                  daysUntilRotation: -1,
                },
              },
            },
          ],
        },
        {
          name: 'the rotation chips disappear on a props change',
          props: { secret: { ...base, daysUntilRotation: 5, lastRotatedAt: '2026-01-02' } },
          interactions: [
            { type: 'props', props: { secret: { ...base, daysUntilRotation: undefined } } },
            { type: 'props', props: { secret: { ...base, lastRotatedAt: null } } },
          ],
        },
        {
          name: 'className changes',
          props: { secret: { ...base }, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
    },
  ],
}
