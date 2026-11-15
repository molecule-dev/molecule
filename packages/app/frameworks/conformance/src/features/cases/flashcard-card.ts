/**
 * `@molecule/app-flashcard-card-react` cases: the front face, the reveal
 * button, the back face with the four SM-2 grade buttons, the progress slot,
 * the class passthrough and the grade callback.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A question for the front face. */
const question = ['What is 2+2?']
/** Its answer for the back face. */
const answer = ['4']

/** `@molecule/app-flashcard-card-react`. */
export const flashcardCardFeature: FeatureCases = {
  package: '@molecule/app-flashcard-card-react',
  families: [
    {
      component: 'FlashcardCard',
      cases: [
        {
          name: 'front before the reveal',
          slots: { front: question, back: answer },
          callbacks: ['onGrade'],
        },
        {
          name: 'revealed initially shows the back and the grade buttons',
          props: { defaultRevealed: true },
          slots: { front: question, back: answer },
          callbacks: ['onGrade'],
        },
        {
          name: 'progress above the face',
          slots: {
            front: question,
            back: answer,
            progress: [{ tag: 'span', attrs: { 'data-progress': '' }, children: ['Card 3 of 20'] }],
          },
          callbacks: ['onGrade'],
        },
        {
          name: 'revealed with progress',
          props: { defaultRevealed: true },
          slots: {
            front: question,
            back: answer,
            progress: ['Card 4 of 20'],
          },
          callbacks: ['onGrade'],
        },
        {
          name: 'rich front and back',
          slots: {
            front: [{ tag: 'strong', children: ['Question'] }, ' — 2+2?'],
            back: [{ tag: 'em', children: ['Answer'] }, ': 4'],
          },
          callbacks: ['onGrade'],
        },
        {
          name: 'class on the card',
          props: { className: 'parity-token' },
          slots: { front: question, back: answer },
          callbacks: ['onGrade'],
        },
        {
          name: 'reveal click shows the back and the grade buttons',
          slots: { front: question, back: answer },
          callbacks: ['onGrade'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'reveal click with progress keeps the progress row',
          slots: { front: question, back: answer, progress: ['Card 5 of 20'] },
          callbacks: ['onGrade'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'grade again calls onGrade and hides the back',
          props: { defaultRevealed: true },
          slots: { front: question, back: answer },
          callbacks: ['onGrade'],
          interactions: [{ type: 'click', selector: 'div > button:nth-of-type(1)' }],
        },
        {
          name: 'grade hard calls onGrade and hides the back',
          props: { defaultRevealed: true },
          slots: { front: question, back: answer },
          callbacks: ['onGrade'],
          interactions: [{ type: 'click', selector: 'div > button:nth-of-type(2)' }],
        },
        {
          name: 'grade good calls onGrade and hides the back',
          props: { defaultRevealed: true },
          slots: { front: question, back: answer },
          callbacks: ['onGrade'],
          interactions: [{ type: 'click', selector: 'div > button:nth-of-type(3)' }],
        },
        {
          name: 'grade easy calls onGrade and hides the back',
          props: { defaultRevealed: true },
          slots: { front: question, back: answer },
          callbacks: ['onGrade'],
          interactions: [{ type: 'click', selector: 'div > button:nth-of-type(4)' }],
        },
        {
          name: 'reveal then grade',
          slots: { front: question, back: answer },
          callbacks: ['onGrade'],
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'click', selector: 'div > button:nth-of-type(3)' },
          ],
        },
        {
          name: 'the next card arrives after grading',
          props: { defaultRevealed: true, front: 'What is 2+2?', back: '4' },
          callbacks: ['onGrade'],
          interactions: [
            { type: 'click', selector: 'div > button:nth-of-type(4)' },
            { type: 'props', props: { front: 'What is 7x8?', back: '56' } },
          ],
        },
        {
          name: 'a swapped back shows while revealed',
          props: { defaultRevealed: true, front: 'What is 2+2?', back: '4' },
          callbacks: ['onGrade'],
          interactions: [{ type: 'props', props: { back: '56' } }],
        },
        {
          name: 'a later defaultRevealed change does not reveal',
          props: { defaultRevealed: false },
          slots: { front: question, back: answer },
          callbacks: ['onGrade'],
          interactions: [{ type: 'props', props: { defaultRevealed: true } }],
        },
      ],
    },
  ],
}
