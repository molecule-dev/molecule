/**
 * `@molecule/app-page-chrome-react` cases: `<PageHeader>` (breadcrumbs, icon,
 * title/subtitle pair, right-aligned actions, meta row, title emphasis) and
 * `<HeroSection>` (eyebrow, headline, description, action pair, media column,
 * alignment).
 *
 * Every text prop is a node slot, so each case exercises the same nodes
 * through React's element props and through each framework's own node idiom
 * (Vue VNode prop + named slot, Solid JSX value, Svelte snippet, Angular
 * projected content). Cases that hold an optional slot absent, and cases that
 * change a plain prop after mount, pin the branches React takes on truthiness
 * (`{subtitle && …}`, `{media ? 'between' : 'start'}`).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The title of the page header, as a node slot. */
const headerTitle = ['Projects']
/** The subtitle rendered under the header title. */
const subtitle = ['Manage your active projects']
/** A leading icon next to the header title. */
const icon = [{ tag: 'i', attrs: { 'data-icon': '' } }]
/** The breadcrumb trail above the header's title row. */
const breadcrumbs = [{ tag: 'nav', attrs: { 'data-crumbs': '' }, children: ['Home / Projects'] }]
/** The right-aligned header actions. */
const actions = [
  { tag: 'button', attrs: { type: 'button', 'data-actions': '' }, children: ['New project'] },
]
/** The meta row below the header's title row. */
const meta = [{ tag: 'span', attrs: { 'data-meta': '' }, children: ['Updated just now'] }]

/** The hero headline, as a node slot. */
const heroTitle = ['Your workspace']
/** The hero eyebrow line above the headline. */
const eyebrow = ['Welcome back']
/** The hero description under the headline. */
const description = ['Everything you need to ship faster.']
/** The hero's primary call to action. */
const primaryAction = [
  { tag: 'button', attrs: { type: 'button', 'data-primary': '' }, children: ['Get started'] },
]
/** The hero's secondary call to action. */
const secondaryAction = [
  { tag: 'a', attrs: { href: '/docs', 'data-secondary': '' }, children: ['Read the docs'] },
]
/** The hero's media column. */
const media = [{ tag: 'img', attrs: { src: '/hero.png', alt: '', 'data-media': '' } }]

/** `@molecule/app-page-chrome-react`. */
export const pageChromeFeature: FeatureCases = {
  package: '@molecule/app-page-chrome-react',
  families: [
    {
      component: 'HeroSection',
      cases: [
        { name: 'a title alone starts the text column', slots: { title: heroTitle } },
        {
          name: 'an eyebrow above the headline',
          slots: { title: heroTitle, eyebrow },
        },
        {
          name: 'a description under the headline',
          slots: { title: heroTitle, description },
        },
        {
          name: 'a primary action',
          slots: { title: heroTitle, primaryAction },
        },
        {
          name: 'a secondary action without a primary',
          slots: { title: heroTitle, secondaryAction },
        },
        {
          name: 'both actions in slot order',
          slots: { title: heroTitle, primaryAction, secondaryAction },
        },
        {
          name: 'a media column swaps the root justify',
          slots: { title: heroTitle, description, media },
        },
        {
          name: 'media without text beside a single action',
          slots: { title: heroTitle, primaryAction, media },
        },
        {
          name: 'center alignment centers the text column',
          props: { align: 'center' },
          slots: { title: heroTitle, description },
        },
        {
          name: 'start alignment is the default',
          props: { align: 'start' },
          slots: { title: heroTitle },
        },
        {
          name: 'every slot at once',
          slots: {
            title: heroTitle,
            eyebrow,
            description,
            primaryAction,
            secondaryAction,
            media,
          },
        },
        {
          name: 'a rich headline node',
          slots: {
            title: [
              { tag: 'strong', attrs: { 'data-strong': '' }, children: ['Your'] },
              ' workspace',
            ],
          },
        },
        {
          name: 'classes and an id',
          props: { className: 'parity-token', dataMolId: 'hero' },
          slots: { title: heroTitle },
        },
        {
          name: 'alignment changes',
          props: { align: 'start' },
          slots: { title: heroTitle },
          interactions: [{ type: 'props', props: { align: 'center' } }],
        },
        {
          name: 'classes and the id change',
          props: { className: 'from-token', dataMolId: 'hero-before' },
          slots: { title: heroTitle },
          interactions: [
            { type: 'props', props: { className: 'to-token', dataMolId: 'hero-after' } },
          ],
        },
      ],
    },
    {
      component: 'PageHeader',
      cases: [
        { name: 'a title alone is the normal emphasis', slots: { title: headerTitle } },
        {
          name: 'breadcrumbs above the title row',
          slots: { title: headerTitle, breadcrumbs },
        },
        {
          name: 'a subtitle under the title',
          slots: { title: headerTitle, subtitle },
        },
        {
          name: 'a leading icon',
          slots: { title: headerTitle, icon },
        },
        {
          name: 'right-aligned actions',
          slots: { title: headerTitle, actions },
        },
        {
          name: 'a meta row below the title row',
          slots: { title: headerTitle, meta },
        },
        {
          name: 'every slot at once',
          slots: { title: headerTitle, subtitle, icon, breadcrumbs, actions, meta },
        },
        {
          name: 'the extrabold emphasis',
          props: { emphasis: 'extrabold' },
          slots: { title: ['Dashboard'], subtitle },
        },
        {
          name: 'the normal emphasis accepts a subtitle',
          props: { emphasis: 'normal' },
          slots: { title: headerTitle },
        },
        {
          name: 'a rich title node',
          slots: {
            title: [{ tag: 'strong', attrs: { 'data-strong': '' }, children: ['Dash'] }, 'board'],
          },
        },
        {
          name: 'classes and an id',
          props: { className: 'parity-token', dataMolId: 'page-header' },
          slots: { title: headerTitle },
        },
        {
          name: 'emphasis changes',
          props: { emphasis: 'normal' },
          slots: { title: headerTitle },
          interactions: [{ type: 'props', props: { emphasis: 'extrabold' } }],
        },
        {
          name: 'classes and the id change',
          props: { className: 'from-token', dataMolId: 'header-before' },
          slots: { title: headerTitle },
          interactions: [
            { type: 'props', props: { className: 'to-token', dataMolId: 'header-after' } },
          ],
        },
      ],
    },
  ],
}
