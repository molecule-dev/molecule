/**
 * `@molecule/app-quiz-card-react` cases: the question card's header (progress
 * and timer), the multiple-choice options, selecting, submitting, the
 * correct/incorrect verdict, the explanation, and every prop change in
 * between.
 *
 * `QuizCard` keys each option button by the option's `id`, so the options
 * list is a keyed list: a re-passed or re-ordered array must keep (and move)
 * the rendered buttons per key.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The three answers the first cases render. */
const options = [
  { id: 'a', label: 'Paris' },
  { id: 'b', label: 'London' },
  { id: 'c', label: 'Berlin' },
]

/** The question, as the node-valued `question` slot. */
const question = ['What is the capital of France?']

/** A timer node for the optional header slot. */
const timer = [{ tag: 'span', attrs: { 'data-timer': '' }, children: ['0:30'] }]

/** One answer option, the selector every interaction uses. */
const OPTION = '[data-mol-id="quiz-card-option"]'
/** The submit button — the UI `Button`, the only button without a `data-mol-id`. */
const SUBMIT = 'button:not([data-mol-id])'

/** `@molecule/app-quiz-card-react`. */
export const quizCardFeature: FeatureCases = {
  package: '@molecule/app-quiz-card-react',
  families: [
    {
      component: 'QuizCard',
      keyedLists: [{ prop: 'options', selector: OPTION }],
      cases: [
        {
          name: 'question, options and the empty header',
          props: { options },
          slots: { question },
          callbacks: ['onAnswer'],
        },
        {
          name: 'progress above the question',
          props: { options },
          slots: { question, progress: ['2 / 10'] },
          callbacks: ['onAnswer'],
        },
        {
          name: 'timer alone',
          props: { options },
          slots: { question, timer },
          callbacks: ['onAnswer'],
        },
        {
          name: 'progress and timer',
          props: { options },
          slots: { question, progress: ['3 / 10'], timer },
          callbacks: ['onAnswer'],
        },
        {
          name: 'progress passed as a plain prop',
          props: { options, progress: '4 / 10' },
          slots: { question },
          callbacks: ['onAnswer'],
        },
        {
          name: 'className on the card',
          props: { options, className: 'parity-token' },
          slots: { question },
          callbacks: ['onAnswer'],
        },
        {
          name: 'a correct id is set but nothing is revealed before submit',
          props: { options, correctId: 'a' },
          slots: { question },
          callbacks: ['onAnswer'],
        },
        {
          name: 'the explanation is hidden before submit',
          props: { options },
          slots: { question, explanation: ['Paris has been the capital since 987 AD.'] },
          callbacks: ['onAnswer'],
        },
        {
          name: 'no options',
          props: { options: [] },
          slots: { question },
          callbacks: ['onAnswer'],
        },
        {
          name: 'a single option',
          props: { options: [options[0]!] },
          slots: { question },
          callbacks: ['onAnswer'],
        },
        {
          name: 'rich option labels',
          props: {
            options: [
              { id: 'a', label: { $nodes: [{ tag: 'strong', children: ['Paris'] }] } },
              { id: 'b', label: { $nodes: [{ tag: 'em', children: ['London'] }] } },
            ],
          },
          slots: { question },
          callbacks: ['onAnswer'],
        },
        {
          name: 'a rich question',
          props: { options },
          slots: { question: [{ tag: 'em', children: ['Capital of France?'] }] },
          callbacks: ['onAnswer'],
        },
        {
          name: 'selecting an option marks it pressed and enables submit',
          props: { options },
          slots: { question },
          callbacks: ['onAnswer'],
          interactions: [{ type: 'click', selector: OPTION }],
        },
        {
          name: 'the selection moves to another option',
          props: { options },
          slots: { question },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'click', selector: OPTION },
            { type: 'click', selector: `${OPTION}:nth-of-type(2)` },
          ],
        },
        {
          name: 'submitting without a correct id reports undefined',
          props: { options },
          slots: { question },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'click', selector: `${OPTION}:nth-of-type(2)` },
            { type: 'click', selector: SUBMIT },
          ],
        },
        {
          name: 'marking the correct answer on submit',
          props: { options, correctId: 'a' },
          slots: { question },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'click', selector: OPTION },
            { type: 'click', selector: SUBMIT },
          ],
        },
        {
          name: 'marking a wrong answer next to the correct one',
          props: { options, correctId: 'a' },
          slots: { question },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'click', selector: `${OPTION}:nth-of-type(3)` },
            { type: 'click', selector: SUBMIT },
          ],
        },
        {
          name: 'the explanation replaces the submit button',
          props: { options },
          slots: { question, explanation: ['Paris has been the capital since 987 AD.'] },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'click', selector: OPTION },
            { type: 'click', selector: SUBMIT },
          ],
        },
        {
          name: 'a click after submit keeps the verdict',
          props: { options, correctId: 'a' },
          slots: { question },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'click', selector: `${OPTION}:nth-of-type(3)` },
            { type: 'click', selector: SUBMIT },
            { type: 'click', selector: OPTION },
          ],
        },
        {
          name: 'clicking the disabled submit does nothing',
          props: { options },
          slots: { question },
          callbacks: ['onAnswer'],
          interactions: [{ type: 'click', selector: SUBMIT }],
        },
        {
          name: 'new options keep the selection by id',
          props: { options },
          slots: { question },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'click', selector: OPTION },
            {
              type: 'props',
              props: {
                options: [
                  { id: 'a', label: 'Paris, France' },
                  { id: 'b', label: 'London, UK' },
                  { id: 'c', label: 'Berlin, Germany' },
                ],
              },
            },
          ],
        },
        {
          name: 'options with new ids leave no option pressed but submit enabled',
          props: { options },
          slots: { question },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'click', selector: OPTION },
            { type: 'props', props: { options: [{ id: 'x', label: 'Madrid' }] } },
            { type: 'click', selector: SUBMIT },
          ],
        },
        {
          name: 'the question changes',
          props: { question: 'Capital of France?', options },
          callbacks: ['onAnswer'],
          interactions: [{ type: 'props', props: { question: 'Capital of Italy?' } }],
        },
        {
          name: 'progress appears and the timer is removed',
          props: { question: 'Capital?', options, timer: '0:30' },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'props', props: { progress: '5 / 10' } },
            { type: 'props', props: { timer: undefined } },
          ],
        },
        {
          name: 'className removed',
          props: { question: 'Capital?', options, className: 'parity-token' },
          callbacks: ['onAnswer'],
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
        {
          name: 'an explanation added before submit stays hidden',
          props: { question: 'Capital?', options },
          callbacks: ['onAnswer'],
          interactions: [{ type: 'props', props: { explanation: 'Because it is.' } }],
        },
        {
          name: 'a correct id added after selecting marks the answer',
          props: { question: 'Capital?', options },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'click', selector: OPTION },
            { type: 'props', props: { correctId: 'a' } },
            { type: 'click', selector: SUBMIT },
          ],
        },
        {
          name: 'a submitted card keeps its verdict when the question changes',
          props: { question: 'Capital?', options, correctId: 'a' },
          callbacks: ['onAnswer'],
          interactions: [
            { type: 'click', selector: OPTION },
            { type: 'click', selector: SUBMIT },
            { type: 'props', props: { question: 'Capital of Italy?' } },
          ],
        },
      ],
    },
  ],
}
