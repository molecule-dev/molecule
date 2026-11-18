/**
 * `@molecule/app-auth-shell-react` cases: the centered glass card shell, its
 * composable primitives (container, decoration, card, heading, footer, back
 * link), the two-column split family (split, row, panel, card column), and the
 * `useAuthFormState` hook behind the cross-view email persistence.
 *
 * Every visual component takes node-valued props: `children` is the default
 * slot and `brand` / `decoration` / `footer` are named slots. The back link
 * renders the binding's router `Link` and reads the `auth.backHome` translation
 * (falling back to "Back to home"), so a case's auto-derived locale switch
 * exercises the translation following the provider.
 *
 * `AuthFormStateProvider` and `useAuthFormStateContext` are framework-shaped:
 * they publish and read the shared form state through each framework's own
 * context primitive, with no DOM or plain-value contract to compare. The
 * `useAuthFormState` hook itself is framework-neutral state, so its cases run
 * through the binding adapter.
 *
 * @module
 */

import type { HookCases } from '../../bindings/spec.js'
import type { FeatureCases } from '../spec.js'

/** A simple content node. */
const contentNode = { tag: 'span', attrs: { 'data-child': '' }, children: ['content'] }

/** The `brand` slot's node. */
const brandNode = { tag: 'div', attrs: { 'data-brand': '' }, children: ['Brand'] }

/** The `decoration` slot's node. */
const decorationNode = {
  tag: 'div',
  attrs: { 'data-decoration': '' },
  children: ['Orbs'],
}

/** The `footer` slot's node. */
const footerNode = { tag: 'p', attrs: { 'data-footer': '' }, children: ['No account?'] }

/** `useAuthFormState`: field state, hydration, and the setters. Distinct storage keys per case. */
const useAuthFormStateCases: HookCases = {
  hook: 'useAuthFormState',
  cases: [
    {
      // No options: the default shared in-memory store, empty for this key.
      name: 'starts empty and hydrated',
      args: [],
    },
    {
      name: 'seeds the fields from initialFields',
      args: [{ initialFields: { email: 'seed@example.test' } }],
    },
    {
      name: 'setField writes the field',
      args: [{ storageKey: 'conformance-set-field' }],
      steps: [{ type: 'call', method: 'setField', args: ['email', 'a@b.test'] }],
    },
    {
      name: 'setFields merges a patch onto the existing fields',
      args: [{ storageKey: 'conformance-set-fields' }],
      steps: [
        { type: 'call', method: 'setField', args: ['email', 'multi@example.test'] },
        { type: 'call', method: 'setFields', args: [{ name: 'Ada' }] },
      ],
    },
    {
      name: 'clear empties the fields',
      args: [{ storageKey: 'conformance-clear' }],
      steps: [
        { type: 'call', method: 'setField', args: ['email', 'gone@example.test'] },
        { type: 'call', method: 'clear' },
      ],
    },
  ],
}

/** `@molecule/app-auth-shell-react`. */
export const authShellFeature: FeatureCases = {
  package: '@molecule/app-auth-shell-react',
  families: [
    {
      component: 'AuthShellContainer',
      cases: [
        {
          name: 'centers its children with the default layout',
          children: [contentNode],
        },
        {
          name: 'stacks its children with the column layout',
          props: { layout: 'column' },
          children: [contentNode],
        },
        {
          name: 'forwards className and an inline style',
          props: { className: 'parity-token', style: { background: 'red' } },
          children: [contentNode],
        },
      ],
    },
    {
      component: 'AuthShellDecoration',
      cases: [
        {
          name: 'renders its decoration children',
          children: [{ tag: 'span', attrs: { 'data-orb': '' }, children: ['orb'] }],
        },
      ],
    },
    {
      component: 'AuthShellCard',
      cases: [
        {
          name: 'renders its children in the default glass surface',
          children: [{ tag: 'span', attrs: { 'data-body': '' }, children: ['body'] }],
        },
        {
          name: 'replaces the glass surface with a custom surface',
          props: { surfaceClassName: 'my-surface' },
          children: ['x'],
        },
        {
          name: 'forwards inner and outer classes plus the data-mol-id',
          props: {
            outerClassName: 'outer-x',
            className: 'inner-x',
            dataMolId: 'auth-card',
          },
          children: ['x'],
        },
      ],
    },
    {
      component: 'AuthShellHeading',
      cases: [
        { name: 'renders the heading alone', props: { heading: 'Sign in' } },
        {
          name: 'renders the heading with a subheading',
          props: { heading: 'Sign in', subheading: 'Welcome back.' },
        },
        {
          name: 'renders the heading with an eyebrow',
          props: { heading: 'Sign in', eyebrow: 'ACCOUNT' },
        },
        {
          name: 'renders eyebrow, heading and subheading together',
          props: { heading: 'Sign in', subheading: 'Welcome back.', eyebrow: 'ACCOUNT' },
        },
        {
          name: 'forwards a custom heading class and style',
          props: {
            heading: 'Sign in',
            headingClassName: 'title-x',
            headingStyle: { color: 'red' },
          },
        },
      ],
    },
    {
      component: 'AuthShellFooter',
      cases: [
        {
          name: 'renders its children inside the footer',
          children: [{ tag: 'span', attrs: { 'data-f': '' }, children: ['help'] }],
        },
      ],
    },
    {
      component: 'AuthShellBackLink',
      cases: [
        { name: 'defaults to the home path with the default label' },
        {
          name: 'honours a custom destination and label',
          props: { to: '/welcome', label: 'Go back' },
        },
        {
          // A blank label would leave the link with no accessible name (the glyph is
          // aria-hidden), so it falls back to the default like an absent one.
          name: 'an empty label falls back to the default text',
          props: { label: '' },
        },
      ],
    },
    {
      component: 'AuthShellSplit',
      cases: [
        {
          name: 'renders a row and a footer sibling with a forwarded class and attribute',
          props: { className: 'split-cls', 'data-rest': 'split-rest' },
          children: [
            { tag: 'div', attrs: { 'data-row': '' }, children: ['row'] },
            { tag: 'footer', attrs: { 'data-site-footer': '' }, children: ['© Brand'] },
          ],
        },
      ],
    },
    {
      component: 'AuthShellSplitRow',
      cases: [
        {
          name: 'renders its two columns with a forwarded class and attribute',
          props: { className: 'row-cls', 'data-rest': 'row-rest' },
          children: [
            { tag: 'div', attrs: { 'data-panel': '' }, children: ['panel'] },
            { tag: 'div', attrs: { 'data-col': '' }, children: ['col'] },
          ],
        },
      ],
    },
    {
      component: 'AuthShellPanel',
      cases: [
        {
          name: 'renders its children in the collapsing panel with a forwarded class and attribute',
          props: { className: 'panel-cls', 'data-rest': 'panel-rest' },
          children: [{ tag: 'div', attrs: { 'data-brand': '' }, children: ['Brand'] }],
        },
      ],
    },
    {
      component: 'AuthShellCardColumn',
      cases: [
        {
          name: 'renders a centered section by default',
          props: { className: 'col-cls' },
          children: [{ tag: 'div', attrs: { 'data-card': '' }, children: ['card'] }],
        },
        {
          name: 'renders a main element when as is main',
          props: { as: 'main' },
          children: ['x'],
        },
      ],
    },
    {
      component: 'AuthShell',
      cases: [
        {
          name: 'renders the heading, children and the back link by default',
          props: { heading: 'Welcome', subheading: 'sign in to continue' },
          children: [{ tag: 'form', attrs: { 'data-form': '' }, children: ['form'] }],
        },
        {
          name: 'renders the brand, decoration and footer slots',
          props: { heading: 'H', subheading: 'S' },
          slots: {
            brand: [brandNode],
            decoration: [decorationNode],
            footer: [footerNode],
          },
          children: ['x'],
        },
        {
          name: 'hides the back link when showBackLink is false',
          props: { heading: 'H', subheading: 'S', showBackLink: false },
          children: ['x'],
        },
        {
          name: 'renders an empty subheading paragraph for an empty string',
          props: { heading: 'H', subheading: '' },
          children: ['x'],
        },
        {
          name: 'honours a custom backTo destination',
          props: { heading: 'H', subheading: 'S', backTo: '/welcome' },
          children: ['x'],
        },
        {
          name: 're-renders when the heading prop changes',
          props: { heading: 'Welcome', subheading: 'S' },
          children: ['x'],
          interactions: [{ type: 'props', props: { heading: 'Signed up' } }],
        },
      ],
    },
  ],
  values: [{ export: 'DEFAULT_AUTH_FORM_STATE_KEY' }],
  frameworkShaped: {
    AuthFormStateProvider:
      'a framework context provider: it publishes the shared auth form state through this framework’s own context mechanism and renders its children with no DOM of its own (Vue provide, Solid context, Svelte setContext, Angular DOM context), so it has no comparable value',
    useAuthFormStateContext:
      'reads the framework’s own auth-shell context: each framework exposes the shared state through its native context primitive (Vue inject, Solid useContext, Svelte getContext, Angular DOM context), so its value is framework-specific',
  },
  hooks: [useAuthFormStateCases],
}
