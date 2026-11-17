/**
 * `RelevantSkillSuggestion` cases: the proactive "Relevant skill" affordance the
 * chat composer shows above itself when a relevance pass over the recent
 * messages finds a matching project skill.
 *
 * The piece is PRESENTATIONAL: the skill arrives whole as the `skill` prop, so
 * the states are plain prop sets. Its branches are the optional `onOpen`
 * (a clickable monospace skill name, or plain text), the description falling
 * back to the "open in the editor" hint, the three callbacks, the dismiss
 * mark's hover, and the two styled Tooltips (the skill's own description on the
 * glyph, the keyword-match explanation on the label) — never a native `title`.
 *
 * @module
 */

import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'

import type { FeatureComponentCases } from '../../spec.js'

/** The suggestion's own skill, with a description. */
const SKILL: SkillInfo = {
  path: '.agents/skills/auth/SKILL.md',
  name: 'auth',
  description: 'Authentication, login, OAuth and sessions.',
}

/** A skill that ships no description, so the open hint stands in. */
const UNDESCRIBED_SKILL: SkillInfo = {
  path: '.agents/skills/deploy/SKILL.md',
  name: 'deploy',
  description: '',
}

/** A second skill, for the in-place prop change. */
const OTHER_SKILL: SkillInfo = {
  path: '.agents/skills/tests/SKILL.md',
  name: 'tests',
  description: 'Writing and running the project’s tests.',
}

/** `RelevantSkillSuggestion`. */
export const relevantSkillSuggestionCases: FeatureComponentCases = {
  component: 'RelevantSkillSuggestion',
  cases: [
    // ── The defaults ────────────────────────────────────────────────────────
    {
      name: 'the suggestion with the defaults renders the skill name as plain text',
      props: { skill: SKILL },
      callbacks: ['onLoad', 'onDismiss'],
    },

    // ── The two tooltips ────────────────────────────────────────────────────
    {
      name: 'hovering the glyph reveals the skill description through the styled Tooltip',
      props: { skill: SKILL },
      callbacks: ['onLoad', 'onDismiss'],
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="relevant-skill-icon"]' },
        { type: 'mouseleave', selector: '[data-mol-id="relevant-skill-icon"]' },
      ],
    },
    {
      name: 'hovering the label explains the keyword match',
      props: { skill: SKILL },
      callbacks: ['onLoad', 'onDismiss'],
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="relevant-skill-label"]' },
        { type: 'mouseleave', selector: '[data-mol-id="relevant-skill-label"]' },
      ],
    },
    {
      name: 'a skill without a description falls back to the open hint',
      props: { skill: UNDESCRIBED_SKILL },
      callbacks: ['onLoad', 'onDismiss'],
      interactions: [{ type: 'mouseenter', selector: '[data-mol-id="relevant-skill-icon"]' }],
    },

    // ── The clickable name ──────────────────────────────────────────────────
    {
      name: 'a wired onOpen makes the skill name a button that opens the skill',
      props: { skill: SKILL },
      callbacks: ['onLoad', 'onOpen', 'onDismiss'],
      interactions: [{ type: 'click', selector: '[data-mol-id="relevant-skill-name"]' }],
    },
    {
      name: 'adding onOpen later makes the name clickable in place',
      props: { skill: SKILL },
      callbacks: ['onLoad', 'onDismiss'],
      interactions: [
        { type: 'props', props: { onOpen: { $callback: 'onOpen' } } },
        { type: 'click', selector: '[data-mol-id="relevant-skill-name"]' },
      ],
    },

    // ── Load and dismiss ────────────────────────────────────────────────────
    {
      name: 'Load loads the skill and the dismiss mark dismisses it',
      props: { skill: SKILL },
      callbacks: ['onLoad', 'onOpen', 'onDismiss'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="relevant-skill-load"]' },
        { type: 'click', selector: '[data-mol-id="relevant-skill-dismiss"]' },
      ],
    },
    {
      name: 'hovering the dismiss mark raises it, leaving restores it',
      props: { skill: SKILL },
      callbacks: ['onLoad', 'onDismiss'],
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="relevant-skill-dismiss"]' },
        { type: 'mouseleave', selector: '[data-mol-id="relevant-skill-dismiss"]' },
        { type: 'mouseenter', selector: '[data-mol-id="relevant-skill-dismiss"]' },
      ],
    },

    // ── Prop changes ────────────────────────────────────────────────────────
    {
      name: 'a new skill re-renders the name and the tooltip in place',
      props: { skill: SKILL },
      callbacks: ['onLoad', 'onOpen', 'onDismiss'],
      interactions: [
        { type: 'props', props: { skill: OTHER_SKILL } },
        { type: 'mouseenter', selector: '[data-mol-id="relevant-skill-icon"]' },
      ],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-labels the suggestion, Load, the dismiss mark and both hints',
      props: { skill: SKILL },
      callbacks: ['onLoad', 'onOpen', 'onDismiss'],
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                skills: {
                  load: 'Charger',
                  loadTitle: 'Ouvrir dans l’éditeur',
                  matchHint: 'Suggéré à partir de mots-clés de vos messages récents',
                  relevant: {
                    label: 'Compétence pertinente',
                    dismiss: 'Masquer la suggestion',
                  },
                },
              },
            },
          },
        },
      },
      interactions: [
        { type: 'locale', locale: 'fr' },
        { type: 'mouseenter', selector: '[data-mol-id="relevant-skill-label"]' },
      ],
    },
  ],
}
