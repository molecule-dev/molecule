/**
 * `@molecule/app-reputation-badge-react` cases: the compact and full
 * `<ReputationBadge>` variants (derived and explicit levels, custom
 * thresholds, the compact-score formatter's every branch, the out-of-contract
 * level fallback) and the `<BadgeShelf>` row (the default and custom limits,
 * the `+N` overflow chip, image and glyph icons, tooltips, the callback and
 * its absence).
 *
 * Levels and labels are translated, so the level chips are also held to the
 * literal i18n keys through a case that supplies its own catalog and switches
 * locale — a port that builds a key at runtime renders the fallback English
 * there instead of the supplied text.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A badge carrying both a name and a description (the combined tooltip). */
const WITH_DESCRIPTION = {
  id: 'b1',
  name: 'First Post',
  description: 'Made your first post',
  icon: '*',
}

/** A badge with a name only (the plain tooltip). */
const NAME_ONLY = { id: 'b2', name: 'Helpful', icon: '+' }

/** A badge whose name is set but which carries no icon (the `*` glyph fallback). */
const NO_ICON = { id: 'b3', name: 'Glyph' }

/** A badge rendered from an image URL instead of a glyph. */
const IMAGE_ICON = {
  id: 'b4',
  name: 'Image Badge',
  iconSrc: 'data:image/png;base64,iVBORw0KGgo=',
}

/** Three badges: below the default limit of five. */
const THREE = [WITH_DESCRIPTION, NAME_ONLY, { id: 'b3', name: 'Veteran', icon: 'V' }]

/** Seven badges: two past the default limit of five. */
const SEVEN = [
  WITH_DESCRIPTION,
  NAME_ONLY,
  { id: 'b3', name: 'Veteran', icon: 'V' },
  { id: 'b4', name: 'Editor', icon: 'E' },
  { id: 'b5', name: 'Marathoner', icon: 'M' },
  { id: 'b6', name: 'Legend', icon: 'L' },
  { id: 'b7', name: 'Champion', icon: 'C' },
]

/** Thresholds that put a score of 12 in the contributor band. */
const CUSTOM_THRESHOLDS = { contributor: 10, trusted: 20, veteran: 30, legend: 40 }

/** `@molecule/app-reputation-badge-react`. */
export const reputationBadgeFeature: FeatureCases = {
  package: '@molecule/app-reputation-badge-react',
  families: [
    {
      component: 'ReputationBadge',
      cases: [
        // The default (`compact`) variant, one case per derived level.
        { name: 'compact, newcomer score', props: { score: 42 } },
        { name: 'compact, contributor score', props: { score: 250 } },
        { name: 'compact, trusted score', props: { score: 1500 } },
        { name: 'compact, veteran score', props: { score: 2500 } },
        { name: 'compact, legend score', props: { score: 50_000 } },
        // The level derived by an explicit level prop / custom thresholds.
        { name: 'explicit level overrides the score', props: { score: 5, level: 'veteran' } },
        { name: 'custom thresholds', props: { score: 12, thresholds: CUSTOM_THRESHOLDS } },
        { name: 'out-of-contract level id', props: { score: 5, level: 'guru' } },
        { name: 'out-of-contract level id with separators', props: { score: 5, level: 'top_fan' } },
        // The compact-score formatter's branches.
        { name: 'plain integer score', props: { score: 42 } },
        { name: 'thousands trimmed of a trailing zero', props: { score: 2000 } },
        { name: 'millions rounded to one decimal', props: { score: 1_250_000 } },
        { name: 'millions trimmed of a trailing zero', props: { score: 2_000_000 } },
        { name: 'negative score', props: { score: -1500 } },
        { name: 'negative million score', props: { score: -1_250_000 } },
        { name: 'non-finite score renders zero', props: { score: Number.NaN } },
        { name: 'infinite score renders zero', props: { score: Number.POSITIVE_INFINITY } },
        { name: 'rounded fractional score', props: { score: 41.6 } },
        // The full variant.
        { name: 'full variant', props: { score: 1500, variant: 'full' } },
        {
          name: 'full variant with an explicit level',
          props: { score: 0, variant: 'full', level: 'legend' },
        },
        {
          name: 'full variant with an out-of-contract level',
          props: { score: 0, variant: 'full', level: 'guru' },
        },
        // className passthrough, on both roots.
        {
          name: 'className on the compact root',
          props: { score: 1500, className: 'parity-token' },
        },
        {
          name: 'className on the full root',
          props: { score: 1500, variant: 'full', className: 'parity-token' },
        },
        // Prop changes: variant swaps React's root element, score/level re-derive.
        {
          name: 'variant changes from compact to full',
          props: { score: 1500 },
          interactions: [{ type: 'props', props: { variant: 'full' } }],
        },
        {
          name: 'variant changes from full to compact',
          props: { score: 1500, variant: 'full' },
          interactions: [{ type: 'props', props: { variant: 'compact' } }],
        },
        {
          name: 'score changes re-derive the level',
          props: { score: 10 },
          interactions: [
            { type: 'props', props: { score: 250 } },
            { type: 'props', props: { score: 50_000 } },
          ],
        },
        {
          name: 'explicit level clears back to the derived one',
          props: { score: 42, level: 'legend' },
          interactions: [{ type: 'props', props: { level: undefined } }],
        },
        {
          name: 'thresholds change re-derives the level',
          props: { score: 12 },
          interactions: [{ type: 'props', props: { thresholds: CUSTOM_THRESHOLDS } }],
        },
        // The level label and aria-label come from the literal i18n keys.
        {
          name: 'labels follow a locale switch',
          props: { score: 1500, variant: 'full' },
          context: {
            translations: {
              fr: {
                reputationBadge: {
                  caption: 'Réputation',
                  aria: '{{score}} points, {{level}}',
                  level: { trusted: 'De confiance' },
                },
              },
            },
          },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
      ],
    },
    {
      component: 'BadgeShelf',
      cases: [
        // No badges: React renders nothing at all.
        { name: 'no badges renders nothing', props: { badges: [] } },
        { name: 'below the default limit', props: { badges: THREE } },
        { name: 'exactly the default limit', props: { badges: SEVEN.slice(0, 5) } },
        { name: 'over the default limit shows the overflow chip', props: { badges: SEVEN } },
        { name: 'custom limit', props: { badges: SEVEN, limit: 2 } },
        {
          name: 'a limit of zero shows only the overflow chip',
          props: { badges: THREE, limit: 0 },
        },
        {
          name: 'a limit above the count hides the overflow chip',
          props: { badges: THREE, limit: 50 },
        },
        // Tooltips.
        { name: 'combined name and description tooltip', props: { badges: [WITH_DESCRIPTION] } },
        { name: 'name-only tooltip', props: { badges: [NAME_ONLY] } },
        {
          name: 'combined tooltip with an empty description',
          props: { badges: [{ id: 'e', name: 'Empty', description: '', icon: 'E' }] },
        },
        // Icons.
        { name: 'image icon', props: { badges: [IMAGE_ICON] } },
        { name: 'glyph fallback without an icon', props: { badges: [NO_ICON] } },
        { name: 'mixed icons', props: { badges: [WITH_DESCRIPTION, IMAGE_ICON, NO_ICON] } },
        // The clickable form and its callback.
        {
          name: 'clickable badges invoke onClick with the badge',
          props: { badges: THREE },
          callbacks: ['onClick'],
          interactions: [
            { type: 'click', selector: '[data-badge-id="b2"] button' },
            { type: 'click', selector: '[data-badge-id="b1"] button' },
          ],
        },
        {
          name: 'the overflow chip invokes onClick with null',
          props: { badges: SEVEN },
          callbacks: ['onClick'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="badge-shelf-overflow-button"]' },
          ],
        },
        {
          name: 'the overflow chip is not clickable without onClick',
          props: { badges: SEVEN },
        },
        {
          name: 'non-interactive badges render no buttons',
          props: { badges: THREE },
        },
        // className passthrough.
        { name: 'className on the shelf row', props: { badges: THREE, className: 'parity-token' } },
        // Prop changes.
        {
          name: 'badges change from empty to filled',
          props: { badges: [] },
          interactions: [{ type: 'props', props: { badges: THREE } }],
        },
        {
          name: 'badges change from filled to empty',
          props: { badges: THREE },
          interactions: [{ type: 'props', props: { badges: [] } }],
        },
        {
          name: 'the limit changes',
          props: { badges: SEVEN, limit: 2 },
          interactions: [
            { type: 'props', props: { limit: 6 } },
            { type: 'props', props: { limit: 1 } },
          ],
        },
        {
          name: 'the badges change while clickable',
          props: { badges: THREE },
          callbacks: ['onClick'],
          interactions: [
            { type: 'props', props: { badges: [NAME_ONLY] } },
            { type: 'click', selector: '[data-badge-id="b2"] button' },
          ],
        },
        // The aria labels come from the literal i18n keys.
        {
          name: 'labels follow a locale switch',
          props: { badges: SEVEN, limit: 2 },
          context: {
            translations: {
              fr: {
                badgeShelf: {
                  aria: '{{count}} badges gagnés',
                  overflow: { aria: 'Afficher {{count}} badges de plus' },
                },
              },
            },
          },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
      ],
    },
  ],
  values: [
    { export: 'DEFAULT_THRESHOLDS' },
    {
      export: 'levelForScore',
      calls: [
        [0],
        [42],
        [99],
        [100],
        [250],
        [499],
        [500],
        [1999],
        [2000],
        [9999],
        [10_000],
        [1_000_000],
        [5, CUSTOM_THRESHOLDS],
        [15, CUSTOM_THRESHOLDS],
        [25, CUSTOM_THRESHOLDS],
        [35, CUSTOM_THRESHOLDS],
        [45, CUSTOM_THRESHOLDS],
      ],
    },
    {
      export: 'colorForLevel',
      calls: [['newcomer'], ['contributor'], ['trusted'], ['veteran'], ['legend'], ['guru']],
    },
  ],
}
