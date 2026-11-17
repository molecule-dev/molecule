/**
 * Cases for the IDE's `HelpCard`, a component `@molecule/app-ide-react` renders but does
 * not export (a part, listed in `ide.ts`). Its port fills them in.
 *
 * The card is PRESENTATIONAL: the guide's prose comes from the shared `HELP_*` content
 * model in `@molecule/app-ide-panel-logic/panels`, the identity arrives as props, and the
 * host supplies the upgrade blurb (the shared IDE owns no pricing copy). The cases hold
 * every prop and branch: both themes, the default and overridden identity (agent name,
 * product name, either alone, both, and an empty one), the upgrade blurb with one line,
 * several lines, an empty list and no list at all, and every action form — a
 * handler-backed button that records its click, an external anchor that opens in a new
 * tab, an internal anchor with no target, an unapproved scheme that must stay inert text,
 * a row of several actions and an empty action list — plus prop changes that add the
 * blurb late, rename the agent and flip the theme, and a locale switch that re-translates
 * the whole card.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The upgrade CTA's selector (button or anchor; an inert span carries it too). */
const ACTION = '[data-mol-id="help-upgrade-action"]'

/** `HelpCard`'s cases. */
export const helpCardCases: FeatureComponentCases = {
  component: 'HelpCard',
  cases: [
    // ── The guide at rest ───────────────────────────────────────────────────
    {
      name: 'the guide in the light theme with the default identity',
      props: { isLight: true },
    },
    {
      name: 'the guide in the dark theme',
      props: { isLight: false },
    },

    // ── The host-supplied identity ──────────────────────────────────────────
    {
      name: 'a custom agent name is interpolated through the guide',
      props: { isLight: true, agentName: 'Fable' },
    },
    {
      name: 'a custom product name is interpolated into the intro',
      props: { isLight: true, productName: 'Acme Studio' },
    },
    {
      name: 'both names are interpolated together',
      props: { isLight: true, agentName: 'Fable', productName: 'Acme Studio' },
    },
    {
      name: 'an empty agent name renders the sentences without it',
      props: { isLight: true, agentName: '' },
    },

    // ── The host-supplied upgrade blurb ─────────────────────────────────────
    {
      name: 'one upgrade line with no action renders the blurb alone',
      props: { isLight: true, upgradeLines: ['You are on the Free plan.'] },
    },
    {
      name: 'two upgrade lines keep their order',
      props: {
        isLight: true,
        upgradeLines: ['You are on the Free plan.', 'Upgrade for more usage and private projects.'],
      },
    },
    {
      name: 'an empty upgrade list renders no upgrade section',
      props: { isLight: true, upgradeLines: [] },
    },
    {
      name: 'an empty action list renders the blurb with no actions',
      props: {
        isLight: true,
        upgradeLines: ['You are on the Free plan.'],
        upgradeAction: [],
      },
    },

    // ── Handler-backed actions ──────────────────────────────────────────────
    {
      name: 'a handler-backed upgrade action is a button that calls onClick',
      props: {
        isLight: true,
        upgradeLines: ['You are on the Free plan.'],
        upgradeAction: { label: 'View plans', onClick: { $callback: 'onUpgrade' } },
      },
      interactions: [
        { type: 'click', selector: ACTION },
        { type: 'click', selector: ACTION },
      ],
    },
    {
      name: 'a dark-theme handler-backed action keeps the same button',
      props: {
        isLight: false,
        upgradeLines: ['Your trial ends in 3 days.'],
        upgradeAction: { label: 'Upgrade', onClick: { $callback: 'onUpgrade' } },
      },
      interactions: [{ type: 'click', selector: ACTION }],
    },

    // ── Link-backed actions ─────────────────────────────────────────────────
    {
      name: 'an external href action is an anchor opening in a new tab',
      props: {
        isLight: true,
        upgradeLines: ['Compare the plans.'],
        upgradeAction: { label: 'See pricing', href: 'https://molecule.dev/pricing' },
      },
    },
    {
      name: 'an internal href action is an anchor without a target',
      props: {
        isLight: true,
        upgradeLines: ['Compare the plans.'],
        upgradeAction: { label: 'See pricing', href: '/pricing' },
      },
    },
    {
      name: 'an unapproved scheme renders inert text instead of an anchor',
      props: {
        isLight: true,
        upgradeLines: ['Compare the plans.'],
        upgradeAction: { label: 'See pricing', href: 'javascript:alert(1)' },
      },
    },

    // ── A row of several actions ────────────────────────────────────────────
    {
      name: 'several mixed upgrade actions render in one row',
      props: {
        isLight: true,
        upgradeLines: ['You are on the Free plan.', 'Upgrade for more usage.'],
        upgradeAction: [
          { label: 'Upgrade', onClick: { $callback: 'onUpgrade' } },
          { label: 'Compare plans', href: 'https://molecule.dev/pricing' },
          { label: 'Help docs', href: '/docs' },
          { label: 'Unsafe', href: 'data:text/html,hi' },
        ],
      },
      interactions: [{ type: 'click', selector: ACTION }],
    },

    // ── Prop changes ────────────────────────────────────────────────────────
    {
      name: 'a late upgrade blurb appears in place',
      props: { isLight: true },
      interactions: [
        {
          type: 'props',
          props: {
            upgradeLines: ['You are on the Free plan.'],
            upgradeAction: { label: 'View plans', onClick: { $callback: 'onUpgrade' } },
          },
        },
        { type: 'click', selector: ACTION },
      ],
    },
    {
      name: 'a new agent name re-renders the sentence',
      props: { isLight: true, agentName: 'Fable' },
      interactions: [{ type: 'props', props: { agentName: 'Synthase' } }],
    },
    {
      name: 'a theme flip recolours the upgrade rule',
      props: {
        isLight: true,
        upgradeLines: ['You are on the Free plan.'],
      },
      interactions: [{ type: 'props', props: { isLight: false } }],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-translates the whole card',
      props: {
        isLight: true,
        agentName: 'Fable',
        productName: 'Acme Studio',
        upgradeLines: ['You are on the Free plan.'],
      },
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                help: {
                  intro: '{{agentName}} est l’agent de codage de {{productName}}.',
                  modeDiscovery: 'Découverte — {{agentName}} pose des questions.',
                  tipSlash: '• Tapez / pour parcourir les commandes.',
                  shortcuts: 'Appuyez sur Cmd+/ pour voir les raccourcis.',
                  card: {
                    heading: 'Aide',
                    modesTitle: 'Modes',
                    tipsTitle: 'Astuces',
                  },
                },
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
