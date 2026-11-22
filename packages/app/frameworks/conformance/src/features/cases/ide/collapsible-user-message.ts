/**
 * `CollapsibleUserMessage` cases: a user message's body, clipped at the shared
 * collapse height behind a gradient and a chevron disclosure strip when the
 * text is taller than the clip.
 *
 * The component measures its own body (`scrollHeight`) after each content
 * change, so a long message is a measured state, not a prop: jsdom lays nothing
 * out (a text-only body reports `scrollHeight` 0), so these cases hold the body
 * the reader always sees — plain, multi-line, empty, light-theme and updated in
 * place — and the strip itself is covered by the ports' own unit tests, which
 * mock `scrollHeight` as a browser would report it.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `CollapsibleUserMessage`. */
export const collapsibleUserMessageCases: FeatureComponentCases = {
  component: 'CollapsibleUserMessage',
  cases: [
    {
      name: 'a short message renders its text and no disclosure strip',
      props: { content: 'Please fix the header.', isLight: false },
    },
    {
      name: 'an empty message renders an empty body',
      props: { content: '', isLight: false },
    },
    {
      name: 'a multi-line message keeps its line breaks',
      props: { content: 'First line.\nSecond line.\nThird line.', isLight: false },
    },
    {
      name: 'a long message renders its whole text',
      props: { content: 'line\n'.repeat(40), isLight: false },
    },
    {
      name: 'the light theme renders the same body',
      props: { content: 'Please fix the header.', isLight: true },
    },
    {
      name: 'a new message replaces the text in place',
      props: { content: 'Please fix the header.', isLight: false },
      interactions: [{ type: 'props', props: { content: 'Now fix the footer too.' } }],
    },
  ],
}
