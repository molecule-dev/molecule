/**
 * `@molecule/app-password-generator-react` cases: the configurable secure
 * password generator (length slider, six character-class toggles, copy /
 * regenerate / "Use this password" buttons).
 *
 * Every password the component draws comes from `crypto.getRandomValues`,
 * which the kit fills with a deterministic stream in every case and value check
 * (`installRandomSources`): the stream depends only on a value's index inside
 * the array being filled, so a password depends only on its length and charset,
 * and the reference recording and every framework port generate the same one.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Every character class on, both "skip" filters off — the shipped default. */
const defaultCharset = {
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  noSimilar: false,
  noAmbiguous: false,
}

/** Every inclusion toggle off, so the generator falls back to lowercase + digits. */
const noInclusion = {
  uppercase: false,
  lowercase: false,
  digits: false,
  symbols: false,
  noSimilar: false,
  noAmbiguous: false,
}

/** Digits only, with the visually-similar glyphs skipped. */
const digitsOnly = {
  uppercase: false,
  lowercase: false,
  digits: true,
  symbols: false,
  noSimilar: true,
  noAmbiguous: false,
}

/** Symbols only, with the ambiguous specials skipped. */
const symbolsOnly = {
  uppercase: false,
  lowercase: false,
  digits: false,
  symbols: true,
  noSimilar: false,
  noAmbiguous: true,
}

/** The read-only password readout. */
const readout = '[data-mol-id="password-readout"]'
/** The copy button. */
const copyButton = '[data-mol-id="password-copy"]'
/** The regenerate button. */
const regenerateButton = '[data-mol-id="password-regenerate"]'
/** The "Use this password" button (only rendered when `onPick` is supplied). */
const pickButton = '[data-mol-id="password-pick"]'
/** The length slider. */
const lengthSlider = '[data-mol-id="password-length"]'

/**
 * The checkbox of one charset toggle row.
 *
 * @param key - The toggle's charset key.
 * @returns A CSS selector for its checkbox.
 */
const toggle = (key: string): string => `[data-mol-id="password-toggle-${key}"] input`

/** `@molecule/app-password-generator-react`. */
export const passwordGeneratorFeature: FeatureCases = {
  package: '@molecule/app-password-generator-react',
  families: [
    {
      component: 'PasswordGenerator',
      cases: [
        { name: 'defaults' },
        { name: 'defaultLength at the minimum', props: { defaultLength: 8 } },
        { name: 'defaultLength above the minimum', props: { defaultLength: 32 } },
        { name: 'defaultLength at the maximum', props: { defaultLength: 64 } },
        { name: 'defaultLength below the minimum is clamped', props: { defaultLength: 4 } },
        { name: 'defaultLength above the maximum is clamped', props: { defaultLength: 100 } },
        { name: 'fractional defaultLength floors', props: { defaultLength: 20.7 } },
        {
          name: 'defaultCharset drops uppercase',
          props: { defaultCharset: { uppercase: false } },
        },
        {
          name: 'defaultCharset drops symbols and digits',
          props: { defaultCharset: { symbols: false, digits: false } },
        },
        {
          name: 'defaultCharset with every inclusion toggle off falls back to lowercase + digits',
          props: { defaultCharset: noInclusion },
        },
        {
          name: 'defaultCharset skips similar glyphs',
          props: { defaultCharset: { noSimilar: true } },
        },
        {
          name: 'defaultCharset skips ambiguous specials',
          props: { defaultCharset: { noAmbiguous: true } },
        },
        {
          name: 'defaultCharset skips both similar and ambiguous',
          props: { defaultCharset: { noSimilar: true, noAmbiguous: true } },
        },
        {
          name: 'onPick renders the pick button',
          callbacks: ['onPick'],
        },
        { name: 'custom ariaLabel', props: { ariaLabel: 'Your new password' } },
        {
          name: 'dataMolId and className pass through',
          props: { dataMolId: 'signup-pwgen', className: 'parity-token' },
        },
        { name: 'autoCopy on', props: { autoCopy: true } },
        {
          name: 'every prop',
          props: {
            defaultLength: 24,
            defaultCharset: { noSimilar: true },
            autoCopy: true,
            ariaLabel: 'Suggested password',
            dataMolId: 'all-props',
            className: 'all-token',
          },
          callbacks: ['onPick'],
        },
        {
          name: 'regenerate click',
          interactions: [{ type: 'click', selector: regenerateButton }],
        },
        {
          name: 'copy click without a clipboard leaves the label unchanged',
          callbacks: ['onPick'],
          interactions: [{ type: 'click', selector: copyButton }],
        },
        {
          name: 'focusing the readout selects it',
          interactions: [
            { type: 'focus', selector: readout },
            { type: 'blur', selector: readout },
          ],
        },
        {
          name: 'pick click reports the password',
          callbacks: ['onPick'],
          interactions: [{ type: 'click', selector: pickButton }],
        },
        {
          name: 'pick click after a regenerate reports the new password',
          callbacks: ['onPick'],
          interactions: [
            { type: 'click', selector: regenerateButton },
            { type: 'click', selector: pickButton },
          ],
        },
        {
          name: 'length slider moves',
          interactions: [{ type: 'input', selector: lengthSlider, value: '40' }],
        },
        {
          name: 'length slider at the minimum',
          interactions: [{ type: 'input', selector: lengthSlider, value: '8' }],
        },
        {
          name: 'length slider at the maximum',
          interactions: [{ type: 'input', selector: lengthSlider, value: '64' }],
        },
        {
          name: 'length slider below the minimum clamps to eight',
          interactions: [{ type: 'input', selector: lengthSlider, value: '4' }],
        },
        {
          name: 'length slider above the maximum clamps to sixty-four',
          interactions: [{ type: 'input', selector: lengthSlider, value: '100' }],
        },
        {
          name: 'length slider moves twice',
          interactions: [
            { type: 'input', selector: lengthSlider, value: '12' },
            { type: 'input', selector: lengthSlider, value: '48' },
          ],
        },
        {
          name: 'noSimilar toggle on',
          interactions: [{ type: 'check', selector: toggle('noSimilar'), checked: true }],
        },
        {
          name: 'noSimilar toggle on and off',
          interactions: [
            { type: 'check', selector: toggle('noSimilar'), checked: true },
            { type: 'check', selector: toggle('noSimilar'), checked: false },
          ],
        },
        {
          name: 'noAmbiguous toggle on',
          interactions: [{ type: 'check', selector: toggle('noAmbiguous'), checked: true }],
        },
        {
          name: 'uppercase toggle off',
          interactions: [{ type: 'check', selector: toggle('uppercase'), checked: false }],
        },
        {
          name: 'symbols toggle off',
          interactions: [{ type: 'check', selector: toggle('symbols'), checked: false }],
        },
        {
          name: 'only digits left',
          interactions: [
            { type: 'check', selector: toggle('uppercase'), checked: false },
            { type: 'check', selector: toggle('lowercase'), checked: false },
            { type: 'check', selector: toggle('symbols'), checked: false },
          ],
        },
        {
          name: 'a charset toggle and a length change together',
          interactions: [
            { type: 'check', selector: toggle('digits'), checked: false },
            { type: 'input', selector: lengthSlider, value: '32' },
          ],
        },
        {
          name: 'defaultLength change after mount is ignored',
          props: { defaultLength: 20 },
          interactions: [{ type: 'props', props: { defaultLength: 32 } }],
        },
        {
          name: 'defaultCharset change after mount is ignored',
          props: { defaultCharset: { digits: true } },
          interactions: [{ type: 'props', props: { defaultCharset: { digits: false } } }],
        },
        {
          name: 'ariaLabel change after mount',
          props: { ariaLabel: 'First label' },
          interactions: [{ type: 'props', props: { ariaLabel: 'Second label' } }],
        },
        {
          name: 'ariaLabel removed after mount falls back to the translation',
          props: { ariaLabel: 'Temporary label' },
          interactions: [{ type: 'props', props: { ariaLabel: undefined } }],
        },
        {
          name: 'dataMolId and className change after mount',
          props: { dataMolId: 'first', className: 'first-token' },
          interactions: [
            { type: 'props', props: { dataMolId: 'second', className: 'second-token' } },
          ],
        },
        {
          name: 'onPick added after mount shows the pick button',
          interactions: [
            { type: 'props', props: { onPick: { $callback: 'onPick' } } },
            { type: 'click', selector: pickButton },
          ],
        },
        {
          name: 'autoCopy enabled after mount keeps the password',
          props: { autoCopy: false },
          interactions: [{ type: 'props', props: { autoCopy: true } }],
        },
      ],
    },
  ],
  values: [
    { export: 'DEFAULT_CHARSET' },
    { export: 'MIN_LENGTH' },
    { export: 'MAX_LENGTH' },
    {
      export: 'buildCharset',
      calls: [
        [defaultCharset],
        [{ ...defaultCharset, uppercase: false, symbols: false }],
        [noInclusion],
        [{ ...defaultCharset, noSimilar: true }],
        [{ ...defaultCharset, noAmbiguous: true }],
        [{ ...defaultCharset, noSimilar: true, noAmbiguous: true }],
        [digitsOnly],
        [symbolsOnly],
        [{ ...defaultCharset, symbols: false }],
      ],
    },
    {
      export: 'clampLength',
      calls: [
        [0],
        [-9],
        [7],
        [8],
        [20],
        [64],
        [65],
        [1000],
        [20.7],
        [Number.NaN],
        [Number.POSITIVE_INFINITY],
        [Number.NEGATIVE_INFINITY],
      ],
    },
    {
      export: 'generatePassword',
      calls: [
        [20, defaultCharset],
        [0, defaultCharset],
        [1000, defaultCharset],
        [8, defaultCharset],
        [32, digitsOnly],
        [64, noInclusion],
        [48, symbolsOnly],
        [12, { ...defaultCharset, noSimilar: true }],
      ],
    },
  ],
}
