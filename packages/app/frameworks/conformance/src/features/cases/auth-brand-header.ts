/**
 * `@molecule/app-auth-brand-header-react` cases: the preset header (chip +
 * wordmark + tagline), the composed header, and each sub-component on its own.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const brandTranslations = {
  en: {
    authBrandHeader: {
      appName: 'Welcome to {{appName}}',
      tagline: '{{tagline}}!',
    },
  },
  fr: {
    authBrandHeader: {
      appName: 'Bienvenue chez {{appName}}',
      tagline: '{{tagline}} !',
    },
  },
}

/** `@molecule/app-auth-brand-header-react`. */
export const authBrandHeaderFeature: FeatureCases = {
  package: '@molecule/app-auth-brand-header-react',
  families: [
    {
      component: 'AuthBrandHeader',
      cases: [
        {
          name: 'preset appName and tagline',
          props: { appName: 'Acme', tagline: 'Ship faster' },
        },
        {
          name: 'preset with an icon chip',
          props: { appName: 'Acme', tagline: 'Ship faster', icon: 'rocket_launch' },
        },
        {
          name: 'preset with a gradient chip and a colored wordmark',
          props: {
            appName: 'Acme',
            tagline: 'Ship faster',
            icon: 'gavel',
            chipGradient: 'linear-gradient(135deg, #e05a2b, #f06a3b)',
            wordmarkColor: '#e05a2b',
          },
        },
        {
          name: 'preset with a square chip',
          props: {
            appName: 'Acme',
            tagline: 'Ship faster',
            icon: 'star',
            chipGradient: 'linear-gradient(red, blue)',
            chipShape: 'square',
          },
        },
        { name: 'preset with every preset prop absent', props: {} },
        {
          name: 'preset with a className',
          props: { appName: 'Acme', tagline: 'Ship faster', className: 'parity-token' },
        },
        {
          name: 'composed children ignore the preset props',
          props: { appName: 'IgnoredName', tagline: 'IgnoredTagline', icon: 'star' },
          children: [
            {
              tag: 'div',
              attrs: { 'data-custom': '' },
              children: [
                { tag: 'h1', children: ['Bespoke'] },
                { tag: 'p', children: ['Composed tagline'] },
              ],
            },
          ],
        },
        {
          name: 'translated appName and tagline',
          props: { appName: 'Acme', tagline: 'Ship faster' },
          context: { translations: brandTranslations },
        },
        {
          name: 'text follows a locale switch',
          props: { appName: 'Acme', tagline: 'Ship faster' },
          context: { translations: brandTranslations },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
        {
          name: 'preset props change',
          props: { appName: 'Acme', tagline: 'Ship faster' },
          interactions: [
            {
              type: 'props',
              props: {
                appName: 'Acme Cloud',
                tagline: 'Ship much faster',
                icon: 'rocket_launch',
                wordmarkColor: '#ff0000',
              },
            },
            { type: 'props', props: { icon: undefined, wordmarkColor: undefined } },
          ],
        },
      ],
    },
    {
      component: 'AuthBrandHeaderChip',
      cases: [
        { name: 'icon only falls back to the primary background', props: { icon: 'description' } },
        {
          name: 'round chip with a gradient',
          props: { icon: 'star', chipGradient: 'linear-gradient(red, blue)' },
        },
        { name: 'square chip without a gradient', props: { icon: 'star', chipShape: 'square' } },
        {
          name: 'square chip with a gradient',
          props: {
            icon: 'star',
            chipGradient: 'linear-gradient(red, blue)',
            chipShape: 'square',
          },
        },
        { name: 'empty icon', props: { icon: '' } },
        {
          name: 'chip shape and gradient change',
          props: { icon: 'star' },
          interactions: [
            {
              type: 'props',
              props: { chipShape: 'square', chipGradient: 'linear-gradient(red, blue)' },
            },
          ],
        },
      ],
    },
    {
      component: 'AuthBrandHeaderWordmark',
      cases: [
        { name: 'text children', children: ['Refract'] },
        { name: 'node children', children: [{ tag: 'strong', children: ['Refract'] }] },
        {
          name: 'color and extra classes',
          props: { color: '#7c3aed', className: 'custom-wordmark' },
          children: ['Reverb'],
        },
        { name: 'default treatment', children: ['Plain'] },
        {
          name: 'color and className change',
          children: ['Refract'],
          interactions: [
            { type: 'props', props: { color: '#7c3aed', className: 'custom-wordmark' } },
          ],
        },
      ],
    },
    {
      component: 'AuthBrandHeaderTagline',
      cases: [
        { name: 'text children', children: ['Ship faster'] },
        { name: 'node children', children: [{ tag: 'em', children: ['Ship faster'] }] },
        { name: 'extra classes', props: { className: 'font-mono' }, children: ['Ship faster'] },
        { name: 'default treatment', children: ['Ship faster'] },
        {
          name: 'className change',
          children: ['Ship faster'],
          interactions: [{ type: 'props', props: { className: 'font-mono' } }],
        },
      ],
    },
  ],
}
