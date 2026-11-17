/**
 * `ContextSessionUsage` cases: the context panel's session-and-allowance
 * breakdown, in every state its three props (`data`, `loading`, `failed`)
 * produce — the empty and loading states, a failed refresh with and without a
 * stale payload, the full breakdown with window and reset time, streaming,
 * the unmetered and unknown-percent branches, the clamped and error-red
 * remaining percent, the non-finite guards, a zero payload, the
 * loading→data→failed lifecycle, and a locale switch.
 *
 * The component is PRESENTATIONAL: the totals arrive whole as props (the
 * hook that loads them is not part of the export), so the states are plain
 * prop shapes and a lifecycle moves through `props` steps.
 *
 * @module
 */

import type { ChatUsageTokens } from '@molecule/app-ide-panel-logic/panels'

import type { FeatureComponentCases } from '../../spec.js'

/** 2026-11-20 02:45 UTC: a fixed allowance reset moment for the formatted line. */
const RESET_AT = Date.UTC(2026, 10, 20, 2, 45)

/** The props every case starts from: nothing loaded, nothing pending. */
const idle = { data: null, loading: false, failed: false } as const

/** The token counts most loaded cases share: 11.0K prompt, 1.2M output. */
const TOKENS: ChatUsageTokens = {
  inputTokens: 4_500,
  outputTokens: 1_200_000,
  cacheReadInputTokens: 6_000,
  cacheCreationInputTokens: 500,
}

/** `ContextSessionUsage`. */
export const contextSessionUsageCases: FeatureComponentCases = {
  component: 'ContextSessionUsage',
  cases: [
    // ── Without a payload ───────────────────────────────────────────────────
    {
      name: 'nothing loaded yet: both totals say Unavailable',
      props: { ...idle },
    },
    {
      name: 'loading replaces both totals with Loading…',
      props: { data: null, loading: true, failed: false },
    },
    {
      name: 'a failed refresh states the error against Unavailable totals',
      props: { data: null, loading: false, failed: true },
    },
    {
      name: 'a failure keeps the error even with a stale payload, and drops its totals',
      props: {
        data: { ...TOKENS, allowancePercent: 40 },
        loading: false,
        failed: true,
      },
    },

    // ── The loaded breakdown ────────────────────────────────────────────────
    {
      name: 'session and allowance totals from a monthly-window payload',
      props: {
        data: {
          ...TOKENS,
          allowancePercent: 40,
          allowanceWindow: 'billing-period',
          allowanceResetAt: RESET_AT,
          model: 'claude-sonnet',
        },
        loading: false,
        failed: false,
      },
    },
    {
      name: 'a streaming session marks the detail line live',
      props: {
        data: { ...TOKENS, allowancePercent: 55, streaming: true },
        loading: false,
        failed: false,
      },
    },
    {
      name: 'a daily window says so, with its reset time',
      props: {
        data: {
          inputTokens: 800,
          outputTokens: 12_000,
          allowancePercent: 0,
          allowanceWindow: 'daily',
          allowanceResetAt: RESET_AT,
        },
        loading: false,
        failed: false,
      },
    },
    {
      name: 'zero usage renders zero totals on both rows',
      props: {
        data: { inputTokens: 0, outputTokens: 0 },
        loading: false,
        failed: false,
      },
    },

    // ── The allowance branch table ──────────────────────────────────────────
    {
      name: 'a percent without a window or reset shows only the remaining line',
      props: {
        data: { ...TOKENS, allowancePercent: 40 },
        loading: false,
        failed: false,
      },
    },
    {
      name: 'an absent percent leaves the allowance unknown while the session still shows',
      props: {
        data: { ...TOKENS },
        loading: false,
        failed: false,
      },
    },
    {
      name: 'a non-finite percent also leaves the allowance unknown',
      props: {
        data: { ...TOKENS, allowancePercent: Number.NaN },
        loading: false,
        failed: false,
      },
    },
    {
      name: 'unmetered reads Unmetered, with the window line but no reset time',
      props: {
        data: {
          ...TOKENS,
          allowancePercent: null,
          allowanceWindow: 'billing-period',
          allowanceResetAt: RESET_AT,
        },
        loading: false,
        failed: false,
      },
    },
    {
      name: 'a non-finite reset time claims no reset',
      props: {
        data: {
          ...TOKENS,
          allowancePercent: 40,
          allowanceWindow: 'daily',
          allowanceResetAt: Number.NaN,
        },
        loading: false,
        failed: false,
      },
    },
    {
      name: 'a reset time that is not a number is ignored too',
      props: {
        data: { ...TOKENS, allowancePercent: 40, allowanceResetAt: 'soon' },
        loading: false,
        failed: false,
      },
    },

    // ── The remaining percent ───────────────────────────────────────────────
    {
      name: 'the remaining percent clamps into 0–100 both ways',
      props: {
        data: { ...TOKENS, allowancePercent: 150 },
        loading: false,
        failed: false,
      },
      interactions: [{ type: 'props', props: { data: { ...TOKENS, allowancePercent: -20 } } }],
    },
    {
      name: 'the remaining figure turns red at ten and not eleven',
      props: {
        data: { ...TOKENS, allowancePercent: 89 },
        loading: false,
        failed: false,
      },
      interactions: [{ type: 'props', props: { data: { ...TOKENS, allowancePercent: 90 } } }],
    },

    // ── The lifecycle ───────────────────────────────────────────────────────
    {
      name: 'usage arriving: loading, then the totals, then a failed refresh',
      props: { ...idle, loading: true },
      interactions: [
        {
          type: 'props',
          props: {
            data: {
              inputTokens: 450,
              outputTokens: 1_600,
              cacheReadInputTokens: 5_000,
              allowancePercent: 40,
            },
            loading: false,
          },
        },
        { type: 'props', props: { failed: true } },
      ],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a switch to French re-renders every label',
      props: {
        data: {
          ...TOKENS,
          allowancePercent: 40,
          allowanceWindow: 'daily',
          allowanceResetAt: RESET_AT,
          streaming: true,
        },
        loading: false,
        failed: false,
      },
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                context: {
                  session: 'Session actuelle',
                  sessionTotal: '{{tokens}} jetons',
                  sessionDetail: '{{input}} entrée (cache inclus) · {{output}} sortie',
                  live: 'En direct',
                  allowance: 'Quota global d’IA',
                  remainingPercent: '~{{percent}}% restant',
                  unmetered: 'Non mesuré',
                  unavailable: 'Indisponible',
                  loading: 'Chargement…',
                  usageError:
                    'L’utilisation n’a pas pu être actualisée. Ouvrez les détails pour réessayer.',
                  ownerAllowance: 'Partagé entre les projets du propriétaire.',
                  monthly: 'Quota mensuel.',
                  daily: 'Quota quotidien.',
                  resets: 'Réinitialisation {{at}}.',
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
