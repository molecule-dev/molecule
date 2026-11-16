/**
 * `@molecule/app-password-strength-meter-react` cases: the five-segment
 * strength bar, its strength label, the optional rule checklist and the
 * `onScore` callback, plus the in-package scorer exported beside them.
 *
 * Every scoring input below is chosen so the bucket it lands in is stable: the
 * scorer derives its score from length × character-class entropy with a
 * common-password penalty, so a case names both the password and the bucket it
 * is documented to produce.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A password whose score is 1 (weak): 6 lowercase characters, no common substring. */
const WEAK = 'abcdef'
/** Another score-1 password, so a change between the two keeps the bucket. */
const WEAK_TOO = 'ghijkl'
/** A password whose score is 2 (fair): 8 characters over lowercase + digits. */
const FAIR = 'xfqz9wnh'
/** A password whose score is 3 (good): 13 characters over upper + lower + digits. */
const GOOD = 'XfQz9wNhPmR4j'
/** A password whose score is 4 (strong): 14 characters over all four classes. */
const STRONG = 'Tr0ub4dor&3XyZ'
/** A strong password whose common-password check is the one the React unit tests use. */
const STRONG_TESTS = 'xR9!fT2#qM7@vL3$'

/** `@molecule/app-password-strength-meter-react`. */
export const passwordStrengthMeterFeature: FeatureCases = {
  package: '@molecule/app-password-strength-meter-react',
  families: [
    {
      component: 'PasswordStrengthMeter',
      cases: [
        { name: 'empty password', props: { password: '' } },
        { name: 'weak password', props: { password: WEAK } },
        { name: 'fair password', props: { password: FAIR } },
        { name: 'good password', props: { password: GOOD } },
        { name: 'strong password', props: { password: STRONG } },
        {
          name: 'a common password scores zero and still fills the first segment',
          props: { password: 'password' },
        },
        {
          name: 'a short diverse password stays at zero with one filled segment',
          props: { password: 'aB1!' },
        },
        {
          name: 'a whitespace-only password counts as a symbol but stays at zero',
          props: { password: '   ' },
        },
        {
          name: 'a non-ASCII password with digits and symbols',
          props: { password: 'Ünïcödé123!' },
        },
        {
          name: 'a very long single-class password reaches the top bucket',
          props: { password: 'x'.repeat(40) },
        },
        {
          name: 'showChecklist with mixed rule outcomes',
          props: { password: 'abc', showChecklist: true },
        },
        {
          name: 'showChecklist with every rule met',
          props: { password: STRONG_TESTS, showChecklist: true },
        },
        {
          name: 'showChecklist on an empty password',
          props: { password: '', showChecklist: true },
        },
        { name: 'showLabel false', props: { password: FAIR, showLabel: false } },
        {
          name: 'showLabel false with the checklist',
          props: { password: FAIR, showLabel: false, showChecklist: true },
        },
        {
          name: 'className passes through',
          props: { password: FAIR, className: 'parity-token' },
        },
        {
          name: 'every prop',
          props: {
            password: STRONG_TESTS,
            minScore: 3,
            showLabel: true,
            showChecklist: true,
            className: 'all-props-token',
          },
          callbacks: ['onScore'],
        },
        {
          name: 'minScore zero is met by an empty password',
          props: { password: '', minScore: 0 },
        },
        {
          name: 'minScore above the top score is never met',
          props: { password: STRONG, minScore: 4 },
        },
        {
          name: 'minScore below the current score is met',
          props: { password: FAIR, minScore: 1 },
        },
        {
          name: 'default minScore two is met by a fair password',
          props: { password: FAIR },
          interactions: [{ type: 'props', props: { password: STRONG } }],
        },
        {
          name: 'minScore changes after mount',
          props: { password: FAIR, minScore: 3 },
          interactions: [{ type: 'props', props: { minScore: 2 } }],
        },
        {
          name: 'onScore fires on mount',
          props: { password: STRONG_TESTS },
          callbacks: ['onScore'],
        },
        {
          name: 'onScore fires on mount for an empty password',
          props: { password: '' },
          callbacks: ['onScore'],
        },
        {
          name: 'onScore fires again when the score changes',
          props: { password: WEAK },
          callbacks: ['onScore'],
          interactions: [{ type: 'props', props: { password: STRONG } }],
        },
        {
          name: 'onScore stays quiet when the password changes but the score does not',
          props: { password: WEAK },
          callbacks: ['onScore'],
          interactions: [{ type: 'props', props: { password: WEAK_TOO } }],
        },
        {
          name: 'onScore stays quiet across a same-bucket password and a checklist toggle',
          props: { password: WEAK },
          callbacks: ['onScore'],
          interactions: [
            { type: 'props', props: { password: WEAK_TOO } },
            { type: 'props', props: { showChecklist: true } },
          ],
        },
        {
          name: 'password moves through every bucket',
          props: { password: '' },
          callbacks: ['onScore'],
          interactions: [
            { type: 'props', props: { password: WEAK } },
            { type: 'props', props: { password: FAIR } },
            { type: 'props', props: { password: GOOD } },
            { type: 'props', props: { password: STRONG } },
          ],
        },
        {
          name: 'the label colour clears when the password is emptied',
          props: { password: STRONG },
          interactions: [{ type: 'props', props: { password: '' } }],
        },
        {
          name: 'showChecklist turns on after mount',
          props: { password: FAIR },
          interactions: [{ type: 'props', props: { showChecklist: true } }],
        },
        {
          name: 'showChecklist turns off after mount',
          props: { password: FAIR, showChecklist: true },
          interactions: [{ type: 'props', props: { showChecklist: false } }],
        },
        {
          name: 'showLabel turns off after mount',
          props: { password: FAIR },
          interactions: [{ type: 'props', props: { showLabel: false } }],
        },
        {
          name: 'showLabel turns back on after mount',
          props: { password: FAIR, showLabel: false },
          interactions: [{ type: 'props', props: { showLabel: true } }],
        },
        {
          name: 'className changes after mount',
          props: { password: FAIR, className: 'first-token' },
          interactions: [{ type: 'props', props: { className: 'second-token' } }],
        },
        {
          name: 'className is removed after mount',
          props: { password: FAIR, className: 'temporary-token' },
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
        {
          name: 'checklist rows follow a password change',
          props: { password: 'abc', showChecklist: true },
          interactions: [{ type: 'props', props: { password: STRONG_TESTS } }],
        },
        {
          name: 'the bar moves while the checklist stays on',
          props: { password: '', showChecklist: true },
          interactions: [
            { type: 'props', props: { password: GOOD } },
            { type: 'props', props: { password: 'password' } },
          ],
        },
      ],
    },
  ],
  values: [
    { export: 'COMMON_PASSWORDS' },
    {
      export: 'scorePassword',
      calls: [
        [''],
        ['a'],
        ['aB1!'],
        [WEAK],
        [WEAK_TOO],
        ['abcdefg'],
        [FAIR],
        [GOOD],
        [STRONG],
        [STRONG_TESTS],
        ['password'],
        ['Password1!'],
        ['admin!'],
        ['letmein'],
        ['Iloveyou1!'],
        ['passw0rd2024'],
        ['PASSWORD123'],
        ['NebulaQuilt7$Fox'],
        ['mypassword42'],
        ['qwerty12345'],
        ['Tr0ub4dor&3xy!'],
        ['a'.repeat(11)],
        ['a'.repeat(12)],
        ['abc123'],
        ['hello123'],
        ['1q2w3e4r'],
        ['    '],
        ['Ünïcödé123!'],
        ['x'.repeat(40)],
        ['aB1!aB1!'],
        ['abcdefgh'],
        ['abcdefghij'],
        ['aaaaaaaa'],
      ],
    },
  ],
}
