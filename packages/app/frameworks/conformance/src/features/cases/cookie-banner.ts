/**
 * `@molecule/app-cookie-banner-react` cases: the GDPR cookie-consent banner in
 * both modes — the simple Accept/Reject banner and the granular per-category
 * mode behind "Customize" — with the visible/policy-link/class branches and
 * both internal-state transitions (the details toggle and each category's
 * switch).
 *
 * `CookieBanner` is the package's only runtime export (the rest of its public
 * surface is types).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The categories of the granular mode: one required, one off, one on by default. */
const categories = [
  {
    id: 'essential',
    label: 'Essential',
    description: 'Required for the site to work.',
    required: true,
  },
  { id: 'analytics', label: 'Analytics', description: 'Helps us improve.' },
  { id: 'marketing', label: 'Marketing', defaultEnabled: true },
]

/** Node-valued category label and description (a `{ $nodes }` marker inside `categories`). */
const nodeCategories = [
  {
    id: 'essential',
    label: { $nodes: [{ tag: 'strong', attrs: { 'data-label': '' }, children: ['Essential'] }] },
    required: true,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: { $nodes: ['Helps ', { tag: 'em', children: ['us'] }, ' improve.'] },
    defaultEnabled: true,
  },
]

/** The first (required, therefore disabled) category's switch, once the details are open. */
const requiredSwitch = 'div[role="dialog"] > div > div:nth-child(1) button[role="switch"]'
/** The second (analytics) category's switch, once the details are open. */
const analyticsSwitch = 'div[role="dialog"] > div > div:nth-child(2) button[role="switch"]'
/** The third (marketing) category's switch, once the details are open. */
const marketingSwitch = 'div[role="dialog"] > div > div:nth-child(3) button[role="switch"]'
/** The footer's "Customize" / "Hide details" button (the first footer button). */
const detailsButton = 'footer > button:nth-of-type(1)'
/** The footer's "Reject all" button. */
const rejectButton = 'footer > button:nth-of-type(2)'
/** The footer's "Accept all" button. */
const acceptButton = 'footer > button:last-of-type'

/** `@molecule/app-cookie-banner-react`. */
export const cookieBannerFeature: FeatureCases = {
  package: '@molecule/app-cookie-banner-react',
  families: [
    {
      component: 'CookieBanner',
      cases: [
        { name: 'defaults' },
        {
          name: 'custom title and description',
          props: { title: 'Cookies?', description: 'Our own copy' },
        },
        {
          name: 'node title and description',
          slots: {
            title: [{ tag: 'em', children: ['Cookie'] }, ' choices'],
            description: ['We use ', { tag: 'strong', children: ['cookies'] }, ' here.'],
          },
        },
        { name: 'empty title and description', props: { title: '', description: '' } },
        { name: 'policy link', props: { policyHref: '/privacy' } },
        { name: 'empty policy href renders no link', props: { policyHref: '' } },
        {
          name: 'policy link with node title and description',
          props: { policyHref: 'https://example.com/privacy' },
          slots: {
            title: ['Your ', { tag: 'em', children: ['privacy'] }],
            description: ['Read the ', { tag: 'strong', children: ['policy'] }, '.'],
          },
        },
        { name: 'categories, details closed', props: { categories }, callbacks: ['onSave'] },
        {
          name: 'empty categories list',
          props: { categories: [] },
          callbacks: ['onSave'],
        },
        {
          name: 'customize opens the details',
          props: { categories },
          callbacks: ['onSave'],
          interactions: [{ type: 'click', selector: detailsButton }],
        },
        {
          name: 'customize opens then hides the details',
          props: { categories },
          callbacks: ['onSave'],
          interactions: [
            { type: 'click', selector: detailsButton },
            { type: 'click', selector: detailsButton },
          ],
        },
        {
          name: 'toggling a category on',
          props: { categories },
          callbacks: ['onSave'],
          interactions: [
            { type: 'click', selector: detailsButton },
            { type: 'click', selector: analyticsSwitch },
          ],
        },
        {
          name: 'toggling a category on and off',
          props: { categories },
          callbacks: ['onSave'],
          interactions: [
            { type: 'click', selector: detailsButton },
            { type: 'click', selector: analyticsSwitch },
            { type: 'click', selector: analyticsSwitch },
          ],
        },
        {
          name: 'toggling the default-enabled category',
          props: { categories },
          callbacks: ['onSave'],
          interactions: [
            { type: 'click', selector: detailsButton },
            { type: 'click', selector: marketingSwitch },
          ],
        },
        {
          name: 'the required category does not toggle',
          props: { categories },
          callbacks: ['onSave'],
          interactions: [
            { type: 'click', selector: detailsButton },
            { type: 'click', selector: requiredSwitch },
          ],
        },
        {
          name: 'node category label and description',
          props: { categories: nodeCategories },
          callbacks: ['onSave'],
          interactions: [{ type: 'click', selector: detailsButton }],
        },
        {
          name: 'save reports the enabled map',
          props: { categories },
          callbacks: ['onSave', 'onDismiss'],
          interactions: [
            { type: 'click', selector: detailsButton },
            { type: 'click', selector: analyticsSwitch },
            { type: 'click', selector: 'footer > button:nth-of-type(3)' },
          ],
        },
        {
          name: 'save without a toggle reports the initial map',
          props: { categories },
          callbacks: ['onSave', 'onDismiss'],
          interactions: [
            { type: 'click', selector: detailsButton },
            { type: 'click', selector: 'footer > button:nth-of-type(3)' },
          ],
        },
        {
          name: 'save hides without onSave',
          props: { categories },
          callbacks: ['onDismiss'],
          interactions: [{ type: 'click', selector: detailsButton }],
        },
        {
          name: 'accept calls onAcceptAll and onDismiss',
          props: { categories },
          callbacks: ['onAcceptAll', 'onDismiss'],
          interactions: [{ type: 'click', selector: acceptButton }],
        },
        {
          name: 'reject calls onRejectAll and onDismiss',
          props: { categories },
          callbacks: ['onRejectAll', 'onDismiss'],
          interactions: [{ type: 'click', selector: rejectButton }],
        },
        {
          name: 'accept without onAcceptAll still dismisses',
          callbacks: ['onDismiss'],
          interactions: [{ type: 'click', selector: acceptButton }],
        },
        {
          name: 'reject without onRejectAll still dismisses',
          callbacks: ['onDismiss'],
          interactions: [{ type: 'click', selector: rejectButton }],
        },
        { name: 'visible false renders nothing', props: { visible: false } },
        {
          name: 'visible flips off and back on',
          props: { categories },
          callbacks: ['onSave'],
          interactions: [
            { type: 'props', props: { visible: false } },
            { type: 'props', props: { visible: true } },
          ],
        },
        { name: 'className passthrough', props: { className: 'parity-token' } },
        {
          name: 'categories arrive after mount',
          interactions: [
            { type: 'props', props: { categories } },
            { type: 'click', selector: detailsButton },
          ],
        },
        {
          name: 'categories removed while the details are open',
          props: { categories },
          callbacks: ['onSave'],
          interactions: [
            { type: 'click', selector: detailsButton },
            { type: 'props', props: { categories: undefined } },
          ],
        },
        {
          name: 'category state survives a categories change',
          props: { categories },
          callbacks: ['onSave'],
          interactions: [
            { type: 'click', selector: detailsButton },
            { type: 'click', selector: analyticsSwitch },
            {
              type: 'props',
              props: {
                categories: categories.map((c) => ({ ...c })),
              },
            },
          ],
        },
        {
          name: 'title and description change from the parent',
          props: { title: 'Cookies', description: 'First copy' },
          interactions: [
            { type: 'props', props: { title: 'More cookies', description: 'Second copy' } },
          ],
        },
        {
          name: 'policy link added and removed',
          interactions: [
            { type: 'props', props: { policyHref: '/privacy' } },
            { type: 'props', props: { policyHref: undefined } },
          ],
        },
        {
          name: 'escape on the dialog changes nothing',
          props: { categories },
          callbacks: ['onSave'],
          interactions: [{ type: 'keydown', selector: 'div[role="dialog"]', key: 'Escape' }],
        },
      ],
      keyedLists: [
        {
          prop: 'categories',
          selector: 'div[role="dialog"] > div > div',
          caseName: 'customize opens the details',
        },
      ],
    },
  ],
}
