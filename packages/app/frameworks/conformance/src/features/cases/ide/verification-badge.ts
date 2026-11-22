/**
 * `VerificationBadge` cases: the inline lint/type verification result a reply's
 * verification block renders — a muted green check when it passed (optionally
 * noting an unavailable render check), or a tinted, expandable error card when
 * it failed.
 *
 * The cases cover the passing badge with and without the render-check note, the
 * error card's default label and each category (`type`, `lint`, `runtime`) with
 * the counts it reads out of the output (type errors, lint errors, warnings),
 * several categories at once, the amber lint-only tint against the red
 * type/runtime tint, expanding the card to read the output and collapsing it
 * again, and a locale switch re-labelling the badge and its counts.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The error card's disclosure header (the only `<button>` it renders). */
const HEADER = 'button'

/** The workspaces the verification ran over. */
const WORKSPACES = ['@molecule/app-api', '@molecule/app-app']

/**
 * TypeScript diagnostics as the type check prints them.
 *
 * @param count - How many errors.
 * @returns The output text.
 */
const typeErrors = (count: number): string =>
  Array.from(
    { length: count },
    (_, i) => `src/file${i}.ts(${i + 1},1): error TS2322: Type 'string' is not assignable.`,
  ).join('\n')

/**
 * Lint output with its `line:col error|warning` lines.
 *
 * @param errors - How many lint errors.
 * @param warnings - How many lint warnings.
 * @returns The output text.
 */
const lintOutput = (errors: number, warnings: number): string =>
  [
    ...Array.from({ length: errors }, (_, i) => `src/a${i}.ts:${i + 1}:1 error no-unused-vars`),
    ...Array.from({ length: warnings }, (_, i) => `src/b${i}.ts:${i + 1}:1 warning semi`),
  ].join('\n')

/** `VerificationBadge`. */
export const verificationBadgeCases: FeatureComponentCases = {
  component: 'VerificationBadge',
  cases: [
    // ── Passing ─────────────────────────────────────────────────────────────
    {
      name: 'a passing check shows the green mark and its label',
      props: { status: 'ok', workspaces: WORKSPACES },
    },
    {
      name: 'a passing check can note that the render check was unavailable',
      props: { status: 'ok', workspaces: WORKSPACES, renderCheckUnavailable: true },
    },

    // ── Failing ─────────────────────────────────────────────────────────────
    {
      name: 'a failure with no categories falls back to the generic label',
      props: { status: 'error', workspaces: WORKSPACES },
      interactions: [{ type: 'click', selector: HEADER }],
    },
    {
      name: 'a single type error uses the singular count',
      props: {
        status: 'error',
        workspaces: WORKSPACES,
        categories: ['type'],
        output: typeErrors(1),
      },
    },
    {
      name: 'several type errors use the plural count',
      props: {
        status: 'error',
        workspaces: WORKSPACES,
        categories: ['type'],
        output: typeErrors(3),
      },
    },
    {
      name: 'lint errors and warnings are both counted, and the card turns amber',
      props: {
        status: 'error',
        workspaces: WORKSPACES,
        categories: ['lint'],
        output: lintOutput(2, 1),
      },
    },
    {
      name: 'a runtime failure names runtime errors',
      props: { status: 'error', workspaces: WORKSPACES, categories: ['runtime'] },
    },
    {
      name: 'several categories join their labels',
      props: {
        status: 'error',
        workspaces: WORKSPACES,
        categories: ['type', 'lint', 'runtime'],
        output: `${typeErrors(2)}\n${lintOutput(1, 0)}`,
      },
    },
    {
      name: 'an error with output expands to show it and collapses again',
      props: {
        status: 'error',
        workspaces: WORKSPACES,
        categories: ['type'],
        output: typeErrors(1),
      },
      interactions: [
        { type: 'click', selector: HEADER },
        { type: 'click', selector: HEADER },
      ],
    },
    {
      name: 'an error with no output expands without a body',
      props: { status: 'error', workspaces: WORKSPACES, categories: ['lint'] },
      interactions: [{ type: 'click', selector: HEADER }],
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-labels the passing badge and its render note',
      props: { status: 'ok', workspaces: WORKSPACES, renderCheckUnavailable: true },
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                verificationPassed: 'Vérifications réussies',
                renderCheckUnavailable: 'Vérification du rendu indisponible',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
    {
      name: 'a locale switch re-labels the counts',
      props: {
        status: 'error',
        workspaces: WORKSPACES,
        categories: ['type', 'lint'],
        output: `${typeErrors(2)}\n${lintOutput(1, 1)}`,
      },
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                typeErrorsCount: '{{count}} erreurs de type',
                lintErrorCount: '{{count}} erreur de lint',
                lintWarningCount: '{{count}} avertissement',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
